/**
 * Module dependencies.
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//var ObjectId	= Schema.ObjectId;
var async = require('async');
var Permission = require('./permission');
var utils = require('../helper/utils');
var _ = require('underscore');

var propertiesSelect = 'name isDelete currency_id icon exclude_total account_type metadata archived transaction_notification listUser';

var AccountSchema = new Schema({
	_id: {type: String, index: true},
	name: {type: String, required: true, trim: true},
	currency_id: {type: Number, required: true},
	owner: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
	isDelete: {type: Boolean, default: false, index: true},
	lastEditBy: {type: Schema.Types.ObjectId, ref: 'User'},
	updateAt: {type: Date, default: Date.now, index: true},
	tokenDevice: {type: String, required: false},
	createdAt: {type: Date, default: Date.now, index: true},
	//listUser: [{ type: Schema.Types.ObjectId, ref: 'User', index: true}],
	listUser: {type: [{type: Schema.Types.ObjectId, ref: 'User'}], index: true},
	icon: {type: String, trim: true, default: 'icon', required: true},
	exclude_total: {type: Boolean, default: false},
	isPublic: {type: Boolean, default: false},
	account_type: {type: Number, default: 0, index: true},
	metadata: {type: Schema.Types.Mixed},
	permission: {type: Schema.Types.Mixed},
	archived: {type: Boolean, default: false},
	transaction_notification: {type: Boolean, default: false},
	rwInfo: {
		acc_id: {type: String},
		login_id: {type: String, index: true},
		p_code: {type: String, index: true},
		secret: {type: String},
		balance: {type: Number}
	},
	balance: {type: Number}
});

AccountSchema.index({isDelete: 1, listUser: 1});
AccountSchema.index({tokenDevice: 1, listUser: 1, updateAt: 1});
AccountSchema.index({isDelete: 1, "rwInfo.login_id": 1});

AccountSchema.pre('save', function (next) {
	if (!this.icon) this.icon = 'icon';
	this.updateAt = new Date();
	next();
});

/**
 * FUNCTIONS
 */

var updateRemoteWalletBalance = function (id, balanceChanged, callback) {
	this.findById(id, function (err, wallet) {
		if (err) return callback(err);
		if (!wallet.metadata) return callback();

		try {
			var parsedMetadata = JSON.parse(wallet.metadata);
			if (parsedMetadata.balance) {
				parsedMetadata.balance += balanceChanged;
				wallet.rwInfo.balance = parsedMetadata.balance;
				wallet.metadata = JSON.stringify(parsedMetadata);
				wallet.save(callback);
			} else {
				callback();
			}
		} catch (e) {
			callback(e);
		}
	});
};

var createAccount = function (data, user_id, callback) {
	if (!user_id) {
		return callback(false);
	}

	var account = new this(data);
	account.lastEditBy = user_id;
	account.owner = user_id;

	if (!account._id) {
		account._id = utils.generateUUID();
	}

	account.save(function (err, data) {
		if (err) {
			callback(false);
		} else {
			callback(data);
		}
	});
};

var checkAccountExists = function (user_id, account_name, callback) {
	if (!user_id || !account_name) return callback(false);
	else {
		this.findOne({name: account_name, owner: user_id, isDelete: false}, function (err, account) {
			if (account) return callback(false);
			else callback(true);
		});
	}
};

var getAccountListByUserId = function (user_id, callback) {
	if (!user_id) return callback([]);

	var condition = [{'isDelete': false}, {'listUser': user_id}];

	this.find({$and: condition}).select(propertiesSelect).sort({'name': 1}).exec(function (err, data) {
		if (err || !data) callback([]);
		else callback(data);
	});
};

var deleteAccount = function (user_id, account_id, callback) {
	if (!account_id) return callback(false);
	var that = this;
	var TransactionSchema = mongoose.model('Transaction');
	var BudgetSchema = mongoose.model('Budget');
	var CategorySchema = mongoose.model('Category');
	var CampaignSchema = mongoose.model('Campaign');

	that.findByIdAndUpdate(account_id, {$set: {isDelete: true, lastEditBy: user_id}}, function (err, account) {
		if (err || !account) return callback(false);
		async.parallel({
			transaction: function (cb) {
				TransactionSchema.deleteByAccountId(user_id, account_id, function (status) {
					cb(null, status);
				});
			},

			category: function (cb) {
				CategorySchema.deleteByAccountId(user_id, account_id, function (status) {
					cb(null, status);
				});
			},

			budget: function (cb) {
				BudgetSchema.deleteByAccountId(user_id, account_id, function (status) {
					cb(null, status);
				});
			},

			campaign: function (cb) {
				CampaignSchema.deleteByAccountId(user_id, account_id, function (status) {
					cb(null, status);
				});
			},

			deleteKeyRedis: function (cb) {
				Permission.deleteKeyByAccountId(account_id, function (status) {
					cb(null, status);
				});
			}
		});
	}, function (err, results) {
		callback(!err);
	});
};

var addUserToAccount = function (user_id, account_id, callback) {
	this.findOne({_id: account_id, listUser: {$nin: [user_id]}}, function (err, account) {
		if (err) {
			return callback(err);
		}

		if (!account) {
			return callback('WalletNotFound');
		}

		account.listUser.push(user_id);

		account.save(callback);
	});
};

var removeUserToAccount = function (user_id, account_id, callback) {
	this.findById(account_id, function (err, account) {
		if (err) {
			return callback(err);
		}

		if (!account) {
			return callback('WalletNotFound');
		}

		let index = account.listUser.indexOf(user_id.toString());

		account.listUser.splice(index, 1);

		account.save(callback);
	});
};

var findUser = function (walletId, callback) {
	this.findOne({_id: walletId}, 'listUser', function (err, account) {
		if (err || !account) callback(false);
		else callback(account.listUser);
	});
};

var updatePermission = function (walletId, userId, mode, key, callback) {
	//callback(Boolean)
	var self = this;
	this.findById(walletId, function (err, wallet) {
		if (err || !wallet) callback(false);
		else {
			var pms;
			if (wallet.permission) {
				if (wallet.permission.length === 0) {
					pms = {};
				}
				else pms = wallet.permission;
			} else {
				pms = {};
			}
			if (mode == 'add') {
				if (!pms[key]) {
					pms[key] = [];
					pms[key].push(userId.toString());
				}
				else {
					pms[key].push(userId.toString());
					//pms[key] = _.uniq(pms[key]);
				}
			} else {
				//remove
				if (pms[key]) {
					var index = pms[key].indexOf(userId.toString());
					if (index !== -1) pms[key].splice(index, 1);
				}
			}

			pms[key] = _.uniq(pms[key]);

			self.findByIdAndUpdate(walletId, {permission: pms}, function (err, result) {
				if (err || !result) callback(false);
				else callback(true);
			});
		}
	});
};

var findRemoteWallet = function (skip, limit, callback) {
	var query = {
		isDelete: false,
		account_type: {
			//$exists: true,
			$gt: 0
		}
	};

	var that = this;

	this.find(query)
		.sort('-createdAt')
		.skip(skip)
		.limit(limit)
		.populate('owner')
		.exec(function (err, list) {
			if (skip === 0) {
				that.count(query, function (e, total) {
					callback(err, list, total);
				});
			} else callback(err, list);
		});
};

var findByRemoteWalletLoginId = function (loginId, callback) {
	this.find({"rwInfo.login_id": loginId, isDelete: false})
		.populate('owner', '_id email lastSync')
		.exec(callback);
};

var countLinkedWalletByProvider = function (provider, callback) {
	let query = {
		"isDelete": false,
		"account_type": {
			//$exists: true,
			"$gt": 0
		},
		"rwInfo.p_code": provider
	};

	this.count(query, callback);
};

/**
 * EXPORTS
 */

AccountSchema.statics.updateRemoteWalletBalance = updateRemoteWalletBalance;
AccountSchema.statics.createAccount = createAccount;
AccountSchema.statics.checkAccountExists = checkAccountExists;
AccountSchema.statics.getAccountListByUserId = getAccountListByUserId;
AccountSchema.statics.deleteAccount = deleteAccount;
AccountSchema.statics.addUserToAccount = addUserToAccount;
AccountSchema.statics.removeUserToAccount = removeUserToAccount;
AccountSchema.statics.findUser = findUser;
AccountSchema.statics.updatePermission = updatePermission;
AccountSchema.statics.findRemoteWallet = findRemoteWallet;
AccountSchema.statics.findByRemoteWalletLoginId = findByRemoteWalletLoginId;
AccountSchema.statics.countLinkedWalletByProvider = countLinkedWalletByProvider;

mongoose.model('Account', AccountSchema);
