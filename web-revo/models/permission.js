'use strict';

var redisClient = require('../config/database').redisClient;
var Utils = require('../helper/utils');
var mongoose = require('mongoose');
var async = require('async');

function savePermissionIntoRedis(key, user) {
	redisClient.SADD(key, user);
}

function checkWalletPermission(key, user_id, array, callback) {
	if (array[key]) {
		var index = array[key].indexOf(user_id);
		if (index !== -1) callback(true);
		else callback(false);
	} else callback(false);
}

function checkPermissionFromMongo(walletId, userId, key, callback) {
	var Account = mongoose.model('Account');
	Account.findById(walletId, 'permission', function (err, wallet) {
		if (err || !wallet) return callback(false);

		if (wallet.permission) {
			checkWalletPermission(key, userId, wallet.permission, function (result) {
				if (result) {
					savePermissionIntoRedis(key, userId);
					callback(true);
				} else callback(false);
			});
		} else callback(false);
	});
}

var checkReadPermission = function (user_id, account_id, callback) {
	var key = genPermissionKey(account_id, 'r');
	redisClient.SISMEMBER(key, user_id, function (err, reply) {
		// callback(reply);
		if (!reply) {
			checkPermissionFromMongo(account_id, user_id, key, function (result) {
				callback(result);
			});
		} else callback(reply);
	});
};

var checkWritePermission = function (user_id, account_id, callback) {
	var key = genPermissionKey(account_id, 'w');
	redisClient.SISMEMBER(key, user_id, function (err, reply) {
		// callback(reply);
		if (!reply) {
			checkPermissionFromMongo(account_id, user_id, key, function (result) {
				callback(result);
			});
		} else callback(reply);
	});
};

var setAccountPermission = function (user_id, account_id, canRead, canWrite, callback) {
	let Account = mongoose.model('Account');

	if (!user_id || !account_id) {
		return callback(false);
	}

	let readKey = genPermissionKey(account_id, 'r');
	let writeKey = genPermissionKey(account_id, 'w');

	async.series([
		function (cb) {
			if (canRead) {
				redisClient.SADD(readKey, user_id);

				Account.updatePermission(account_id, user_id, 'add', readKey, function (status) {
					if (status) cb();
					else cb("Can't save read permission to mongo");
				});
			}
			else {
				redisClient.SREM(readKey, user_id);

				Account.updatePermission(account_id, user_id, 'remove', readKey, function (status) {
					if (status) cb();
					else cb("Can't save permission to mongo");
				});
			}
		}, function (cb) {
			if (canWrite) {
				redisClient.SADD(writeKey, user_id);

				Account.updatePermission(account_id, user_id, 'add', writeKey, function (status) {
					if (status) cb();
					else cb("Can't save write permission to mongo");
				});
			} else {
				redisClient.SREM(writeKey, user_id);

				Account.updatePermission(account_id, user_id, 'remove', writeKey, function (status) {
					if (status) cb();
					else cb("Can't save read permission to mongo");
				});
			}
		}
	], function (error) {
		let callbackFunction = function (err, result) {
			callback(!err, result);
		};

		if (!error) {
			if (canRead && canWrite) {
				Account.addUserToAccount(user_id, account_id, callbackFunction);
			} else if (!canRead && !canWrite) {
				Account.removeUserToAccount(user_id, account_id, callbackFunction);
			} else callback(true);
		} else {
			callback(false);
		}
	});
};

var genPermissionKey = function (account_id, permission) {
	return 'a:' + account_id + ':' + permission;
};

var generateShareToken = function (user_id, account_id, canRead, canWrite, callback) {
	if (!user_id || !account_id) return callback(false);
	var token = Utils.uid(32);
	var key = 'sa:' + token;
	var value = JSON.stringify({u: user_id, a: account_id, r: canRead, w: canWrite});
	var oneMonth = 2592000;

	redisClient.SETEX(key, oneMonth, value, function (err, reply) {
		callback(!err && reply, token);
	});
};

var checkShareToken = function (token, callback) {
	if (!token) return callback(false);

	var key = 'sa:' + token;
	var handler = function (err, reply) {
		if (err || !reply) return callback(false);

		var data = JSON.parse(reply);
		setAccountPermission(data.u, data.a, data.r, data.w, function (status) {
			if (status) callback(true, data.u, data.a);
			else callback(false);
		});
		redisClient.DEL(key);
	};

	redisClient.GET(key, handler);
};

var deleteKeyByAccountId = function (account_id, callback) {
	redisClient.DEL(genPermissionKey(account_id, 'r'));
	redisClient.DEL(genPermissionKey(account_id, 'w'));

	callback(true);
};

var defaultPermission = function (wallet_id, callback) {
	let AccountModel = mongoose.model('Account');

	AccountModel.findById(wallet_id, 'owner listUser', function (err, wallet) {
		if (err) {
			return callback(err);
		}

		if (!wallet || !wallet.owner || !wallet.listUser) {
			return callback('WalletError');
		}

		async.eachSeries(wallet.listUser, function (sharedUser, cb) {
			if (sharedUser.toString() == wallet.owner.toString()) {
				return cb();
			}

			setAccountPermission(sharedUser, wallet_id, false, false, function (status) {
				cb(!status);
			});
		}, callback);
	});
};

exports.checkWritePermission = checkWritePermission;
exports.checkReadPermission = checkReadPermission;
exports.setAccountPermission = setAccountPermission;
exports.generateShareToken = generateShareToken;
exports.checkShareToken = checkShareToken;
exports.deleteKeyByAccountId = deleteKeyByAccountId;
exports.defaultPermission = defaultPermission;
