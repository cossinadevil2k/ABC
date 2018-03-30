/**
 * Module dependencies.
 */
'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let async = require('async');
let Permission = require('./permission');
let utils = require('./helper/utils');
let _ = require('underscore');
const Error = require('../config/error');
const debug = require('debug')('account:model');
let ObjectId = mongoose.Types.ObjectId;


let propertiesSelect = 'name isDelete currency_id icon exclude_total account_type metadata archived transaction_notification listUser updateAt';

let AccountSchema = new Schema({
    _id: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    currency_id: { type: Number, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isDelete: { type: Boolean, default: false, index: true },
    lastEditBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updateAt: { type: Date, default: Date.now, index: true },
    tokenDevice: { type: String, required: false },
    createdAt: { type: Date, default: Date.now, index: true },
    //listUser: [{ type: Schema.Types.ObjectId, ref: 'User', index: true}],
    listUser: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], index: true },
    icon: { type: String, trim: true, default: 'icon', required: true },
    exclude_total: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    account_type: { type: Number, default: 0, index: true },
    metadata: { type: Schema.Types.Mixed },
    permission: { type: Schema.Types.Mixed },
    archived: { type: Boolean, default: false },
    transaction_notification: { type: Boolean, default: false },
    rwInfo: {
        acc_id: { type: String },
        login_id: { type: String, index: true },
        p_code: { type: String, index: true },
        secret: { type: String },
        balance: { type: Number },
        last_refresh: { type: Date },
        service_id: { type: Number, index: true },
        active: {
            status: { type: Boolean, default: true, index: true },
            error: { type: String, enum: [Error.FINSIFY_ACCOUNT_LOCKED, Error.FINSIFY_WRONG_CREDENTIALS, Error.FINSIFY_PASSWORD_EXPIRED, Error.SUBSCRIPTION_CODE_EXPIRE, Error.SUBSCRIPTION_CANCEL, null], index: true },
            message: { type: String }
        }
    },
    balance: { type: Number },
    sortIndex: { type: Number }
});

AccountSchema.index({ isDelete: 1, listUser: 1, owner: 1 });
AccountSchema.index({ tokenDevice: 1, listUser: 1, updateAt: 1 });
AccountSchema.index({ isDelete: 1, "rwInfo.login_id": 1 });

AccountSchema.pre('save', function (next) {
    if (!this.icon) this.icon = 'icon';
    this.updateAt = new Date();
    next();
});

/**
 * FUNCTIONS
 */
let deactiveLinkedWallet = function (walletId, error, message, callback) {
    this.findById(walletId, function (err, wallet) {
        debug(wallet);
        if (err) return callback(err);
        if (!wallet) return callback();

        if (typeof wallet != 'object') {
            wallet = JSON.parse(wallet);
        }
        if (!wallet.rwInfo) {
            wallet.rwInfo = {};
        };
        if (typeof error === 'number') {
            error = error.toString();
        }
        wallet.markModified('rwInfo');
        wallet.rwInfo.active.status = false;
        wallet.rwInfo.active.error = error;
        wallet.rwInfo.active.message = message;
        wallet.save(callback);
    });
}

let activeLinkedWallet = function (walletId, callback) {
    this.findById(walletId, function (err, wallet) {
        if (err) return callback(err);
        if (!wallet) return callback();

        if (typeof wallet != 'object') {
            wallet = JSON.parse(wallet);
        }
        if (!wallet.rwInfo) {
            wallet.rwInfo = {};
        };
        wallet.markModified('rwInfo');
        wallet.rwInfo.active.status = true;
        wallet.rwInfo.active.error = null;
        wallet.rwInfo.active.message = null;
        wallet.save(callback);
    });
}

let findLinkWalletActive = function (walletId, callback) {
    if (!walletId) {
        return callback('walletId is null');
    }

    this.find({ "_id": walletId, "rwInfo.active.status": true })
        .populate('owner')
        .exec(callback);
};

let updateRemoteWalletBalance = function (id, balanceChanged, callback) {
    this.findById(id, function (err, wallet) {
        if (err) return callback(err);
        if (!wallet.metadata) return callback();

        try {
            let parsedMetadata = JSON.parse(wallet.metadata);
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

let createAccount = function (data, user_id, callback) {
    if (!user_id) {
        return callback(false);
    }

    let account = new this(data);
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

let checkAccountExists = function (user_id, account_name, callback) {
    if (!user_id || !account_name) return callback(false);
    else {
        this.findOne({ name: account_name, owner: user_id, isDelete: false }, function (err, account) {
            if (account) return callback(false);
            else callback(true);
        });
    }
};

let getAccountListByUserId = function (user_id, callback) {
    if (!user_id) return callback([]);

    let condition = [{ 'isDelete': false }, { 'listUser': user_id }];

    this.find({ $and: condition }).select(propertiesSelect).sort({ 'name': 1 }).exec(function (err, data) {
        if (err || !data) callback([]);
        else callback(data);
    });
};

let getLinkedWalletListByUserId = function (user_id, callback) {
    if (!user_id) return callback([]);

    user_id = ObjectId(user_id);

    let condition = [{ 'owner': user_id }, { account_type: 2 }, { 'isDelete': false }];
    this.find({ $and: condition }).select('_id name rwInfo').sort({ 'name': 1 }).exec(function (err, data) {
        if (err || !data) callback([]);
        else callback(data);
    });
}


let deleteAccount = function (user_id, account_id, callback) {
    if (!account_id) return callback(false);
    let that = this;
    let TransactionSchema = mongoose.model('Transaction');
    let BudgetSchema = mongoose.model('Budget');
    let CategorySchema = mongoose.model('Category');
    let CampaignSchema = mongoose.model('Campaign');

    that.findByIdAndUpdate(account_id, { $set: { isDelete: true, lastEditBy: user_id } }, function (err, account) {
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

let addUserToAccount = function (user_id, account_id, callback) {
    this.findOne({ _id: account_id, listUser: { $nin: [user_id] } }, function (err, account) {
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

let removeUserToAccount = function (user_id, account_id, callback) {
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

let findUser = function (walletId, callback) {
    this.findOne({ _id: walletId }, 'listUser', function (err, account) {
        if (err || !account) callback(false);
        else callback(account.listUser);
    });
};

let updatePermission = function (walletId, userId, mode, key, callback) {
    //callback(Boolean)
    let self = this;
    this.findById(walletId, function (err, wallet) {
        if (err || !wallet) callback(false);
        else {
            let pms;
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
                    let index = pms[key].indexOf(userId.toString());
                    if (index !== -1) pms[key].splice(index, 1);
                }
            }

            pms[key] = _.uniq(pms[key]);

            self.findByIdAndUpdate(walletId, { permission: pms }, function (err, result) {
                if (err || !result) callback(false);
                else callback(true);
            });
        }
    });
};

let findRemoteWallet = function (skip, limit, callback) {
    let query = {
        isDelete: false,
        account_type: {
            //$exists: true,
            $gt: 0
        }
    };

    let that = this;

    this.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('owner')
        .lean(true)
        .exec(function (err, list) {
            if (skip === 0) {
                that.count(query, function (e, total) {
                    callback(err, list, total);
                });
            } else callback(err, list);
        });
};

let findByRemoteWalletLoginId = function (loginId, callback) {
    if (!loginId) {
        return callback('LoginId is null');
    }

    this.find({ "rwInfo.login_id": loginId, isDelete: false })
        .populate('owner')
        .exec(callback);
};

let countLinkedWalletByProvider = function (provider, callback) {
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

let findByRemoteWalletLoginIdUniqueAccountId = function (loginId, accountId, callback) {

    if (!loginId || !accountId) {

        return callback('Param is missing');

    }

    this.findOne({ "rwInfo.login_id": loginId, "rwInfo.acc_id": accountId, isDelete: false })
        .populate('owner')
        .exec(callback);
}

/**
 * EXPORTS
 */

AccountSchema.statics.updateRemoteWalletBalance = updateRemoteWalletBalance;
AccountSchema.statics.createAccount = createAccount;
AccountSchema.statics.checkAccountExists = checkAccountExists;
AccountSchema.statics.getAccountListByUserId = getAccountListByUserId;
AccountSchema.statics.getLinkedWalletListByUserId = getLinkedWalletListByUserId;
AccountSchema.statics.deleteAccount = deleteAccount;
AccountSchema.statics.addUserToAccount = addUserToAccount;
AccountSchema.statics.removeUserToAccount = removeUserToAccount;
AccountSchema.statics.findUser = findUser;
AccountSchema.statics.updatePermission = updatePermission;
AccountSchema.statics.findRemoteWallet = findRemoteWallet;
AccountSchema.statics.findByRemoteWalletLoginId = findByRemoteWalletLoginId;
AccountSchema.statics.countLinkedWalletByProvider = countLinkedWalletByProvider;
AccountSchema.statics.deactiveLinkedWallet = deactiveLinkedWallet;
AccountSchema.statics.findLinkWalletActive = findLinkWalletActive;
AccountSchema.statics.activeLinkedWallet = activeLinkedWallet;
AccountSchema.statics.findByRemoteWalletLoginIdUniqueAccountId = findByRemoteWalletLoginIdUniqueAccountId;

mongoose.model('Account', AccountSchema);
