'use strict';

let env = process.env.NODE_ENV;
let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let http = require('https');
let AccountModel = mongoose.model('Account');
let TransactionModel = mongoose.model('Transaction');
let CategoryModel = mongoose.model('Category');

const LogDb = require('../../model/helper/mongodb_connect_logs');
const LogTable = LogDb.model('FinsifyFetchLog');
const LogFinsifyHookModel = LogDb.model('FinsifyHookLog');

let categoryMap = require('../lib/category_map').CATEGORY_MAP;
let Error = require('../../config/error');
let NotificationActions = require('../../config/notification_action_code').NOTIFICATION_ACTION;
let pushController = require('../../model/sync/push_controller');
let async = require('async');
let _ = require('underscore');
let moment = require('moment');
let Slackbot = require('slackbot');

let slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');
let tokenDevice = 'moneylover';

let AMOUNT_CATEGORY_NOT_MATCH_COUNT = 0;
let WARNING;
let WRONG_ACCOUNTS = [];
const COUNT_LIMIT = 100;

let FINSIFY_PROFILE = {
    production: {
        host: 'zero.finsify.com',
        public_key: 'Tu5dvG07KVpx6b',
        secret_key: '75167f66-22dc-415d-b799-c0dd73b951ca'
    },
    dev: {
        host: 'yeti.finsify.com',
        public_key: 'Tu5dvG07KVpx6b',
        secret_key: '75167f66-22dc-415d-b799-c0dd73b951ca'
    }
};

let SYNC_CODE = require('../../config/sync_codes');

let finsifyOptions = FINSIFY_PROFILE[env];

Array.prototype.pushToSetUnique = function (element) {
    if (this.indexOf(element) === -1) {
        this.push(element);
    }
};

function pushToSlack(login_id, error, callback) {
    let channelFail = '#lw-notify-fail';
    let channelNormal = '#lw-notify';

    let message1;
    let message2;

    if (error) {
        if (error instanceof Object) {
            error = JSON.stringify(error);
        }

        if (!login_id) {
            message2 = `*Warning*: ${error}`;
        } else {
            message2 = `LoginId: \`${login_id}\`, Error: \`${error}\``;
        }

        slackbot.send(channelFail, message2, function (err, response, body) {
            callback(err);
        });
    } else {
        message1 = `LoginId: \`${login_id}\`, Status: \`${!error}\``;

        slackbot.send(channelNormal, message1, function (err, response, body) {
            if (!error) {
                return callback(err);
            }
        });
    }
}

function findFinsifyWalletByLoginId(loginId, callback) {
    AccountModel.findByRemoteWalletLoginId(loginId, callback);
}

function parseFinsifyToMoneyLoverTransaction(data, walletInfo, callback) {
    //_id là 4 character cuối của walletId + OriginalID của finsify transaction
    let result = {
        _id: walletInfo._id + data.originalID,
        account: walletInfo._id,
        displayDate: data.made_on,
        amount: Math.abs(data.amount),
        note: data.description,
        tokenDevice: tokenDevice,
        lastEditBy: walletInfo.owner._id
    };

    if (data.currency_code) result.original_currency = data.currency_code;
    if (data.address) result.address = data.address;
    if (data.longtitude) result.longtitude = data.longtitude;
    if (data.latitude) result.latitude = data.latitude;
    if (data.updatedAt) result.updateAt = data.updatedAt;

    findMoneyLoverCategoryId(data.category, data.amount, walletInfo._id, function (err, categoryId, warning) {
        if (err) {
            callback(err);
        } else {
            result.category = categoryId;
            callback(null, result);
        }

        if (warning) {
            //push to slack
            warning += `, Note: \`${data.description}\``;
            warning += `, OriginalID: \`${data.originalID}\``;
            warning += `, LoginId: \`${walletInfo.rwInfo.login_id}\``;
            warning += `, Original_wallet_id: \`${walletInfo.rwInfo.acc_id}\``;
            warning += `, Made on: \`${data.made_on}\``;
            let classifyURL = `https://classify.finsify.com/messageClassify/?f=json&bank=${walletInfo.rwInfo.p_code}&message=${data.description}&amount=${data.amount}
`;
            classifyURL = encodeURI(classifyURL);
            warning += `, Classify: ${classifyURL}`;
            warning += `, and ${COUNT_LIMIT} warning more`;
            WARNING = warning;
        }

        WRONG_ACCOUNTS.pushToSetUnique(walletInfo.rwInfo.acc_id);

        if (AMOUNT_CATEGORY_NOT_MATCH_COUNT >= COUNT_LIMIT) {
            AMOUNT_CATEGORY_NOT_MATCH_COUNT = 0;
            pushToSlack(null, WARNING, function (err) {
                WARNING = null;
            });

            LogTable.recordWrongCategoryAccount(WRONG_ACCOUNTS, (err) => {
                if (err) {
                    console.log(err);
                }

                WRONG_ACCOUNTS = [];
            });
        }
    }, data.updatedAt);
}

function checkCategoryAndAmount(category, amount, updatedAt) {
    let TYPE_INCOME = 1;
    let TYPE_EXPENSE = 2;

    let check_point = moment('01/06/2016', 'DD/MM/YYYY');
    let ud = moment(updatedAt);

    let result;

    if (category.type === TYPE_INCOME) {
        result = amount >= 0;

        if (result) {
            return result;
        }

        return (check_point.isAfter(ud));
    } else {
        //TYPE_EXPENSE
        result = amount <= 0;

        if (result) {
            return result;
        }

        return (check_point.isAfter(ud));
    }
}

function findMoneyLoverCategoryId(categoryFinsify, amount, walletId, callback, updatedAt) {
    let metadata = categoryMap[categoryFinsify];

    if (!metadata) {
        metadata = categoryMap['uncategorized'];
    }

    if (_.isArray(metadata)) {
        if (amount > 0) {
            metadata = metadata[1];
        } else {
            metadata = metadata[0];
        }
    }

    CategoryModel.findOne({ account: walletId, metadata: metadata }, (err, cate) => {
        let warning;

        if (err) {
            return callback(err);
        }

        if (cate) {
            if (checkCategoryAndAmount(cate, amount, updatedAt)) {
                return callback(null, cate._id);
            }

            //make warning
            if (!WARNING) {
                warning = `Amount and Category are not match. ` +
                    `Wallet: \`${walletId}\`, ` +
                    `Amount: \`${amount}\`, ` +
                    `Finsify category: \`${categoryFinsify}\``;
            } else {
                AMOUNT_CATEGORY_NOT_MATCH_COUNT++;
            }
        }

        let othermetadata = categoryMap['uncategorized'];

        if (_.isArray(othermetadata)) {
            if (amount > 0) {
                othermetadata = othermetadata[1];
            } else {
                othermetadata = othermetadata[0];
            }
        }

        CategoryModel.findOne({ account: walletId, metadata: othermetadata }, (err2, otherCate) => {
            if (err2) {
                return callback(err2);
            }

            if (otherCate) {
                return callback(null, otherCate._id, warning);
            }

            callback({ err: 'category_not_found', walletId: walletId, metadata: metadata, original_category: categoryFinsify });
        });
    });
}

function checkRemoteWalletInfo(walletInfo) {
    if (!walletInfo) return false;

    if (!walletInfo.rwInfo) return false;

    if (!walletInfo.rwInfo.acc_id) return false;

    if (!walletInfo.rwInfo.secret) return false;

    if (!walletInfo.rwInfo.p_code) return false;

    return true;
}

function getTransactionFromFinsify(loginInfo, callback) {
    //get transaction list
    let requestOptions = {
        host: finsifyOptions.host,
        port: 443,
        path: '/api/transactions?account_id=' + loginInfo.acc_id + '&timestamp=' + loginInfo.timestamp,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Client-id': finsifyOptions.public_key,
            'Service-secret': finsifyOptions.secret_key,
            'Login-secret': loginInfo.secret
        }
    };

    let request = http.request(requestOptions, function (response) {
        response.setEncoding('utf8');
        let data = "";
        response.on('data', function (chunk) {
            data += chunk.toString();
        });
        response.on('end', function () {
            try {
                let parsedData = JSON.parse(data);
                callback(null, parsedData);
            } catch (e) {
                callback({ error: 'ErrorFromFinsify', statusCode: response.statusCode });
            }
        });
    });

    request.end();
}

function writeTransactionListIntoDb(transactionList, walletInfo, callback) {
    async.eachSeries(transactionList, function (transaction, cb) {
        parseFinsifyToMoneyLoverTransaction(transaction, walletInfo, function (err, mlTrans) {
            if (err) {
                return cb(err);
            }

            updateSingleTransaction(mlTrans, walletInfo, function (updateErr) {
                cb(updateErr);
            });
        });
    }, function (error) {
        if (error) {
            return callback(error);
        }

        updateWalletBalance(walletInfo, callback);
    });
}

function mustUpdateTransaction(oldTransaction, newTransaction) {
    if (newTransaction.amount != oldTransaction.amount) return true;
    if (newTransaction.original_currency != oldTransaction.original_currency) return true;

    return false;
}

function updateSingleTransaction(transaction, walletInfo, callback) {
    let checkCategory = function (cb) {
        //cb(err, isValidCategory)
        CategoryModel.findOne({ isDelete: false, _id: transaction.category }, function (err, category) {
            if (err) cb(err);
            else if (!category) cb(null, false);
            else cb(null, true);
        });
    };

    let checkTransaction = function (isValidCategory, cb) {
        //cb(err, mustUpdate, isExists, item)

        if (!isValidCategory) {
            return cb(null, false, null, null, null);
        }

        TransactionModel.findById(transaction._id, function (err, result) {
            if (err) {
                cb(err);
            } else if (!result) {
                cb(null, true, true, false, transaction);
            } else {
                cb(null, true, mustUpdateTransaction(result, transaction), true, result);
            }
        });
    };

    let saveTransactionToMoneylover = function (isValidCategory, mustUpdate, isExists, item, cb) {
        if (!isValidCategory) return cb();
        if (!mustUpdate) return cb();

        if (isExists) {
            editTransaction(item, transaction, cb);
        } else {
            createTransaction(item, walletInfo, cb);
        }
    };

    async.waterfall([
        checkCategory,
        checkTransaction,
        saveTransactionToMoneylover
    ], callback);
}

function editTransaction(oldTransactionInfo, update, callback) {
    oldTransactionInfo.note = update.note;
    oldTransactionInfo.amount = update.amount;
    oldTransactionInfo.lastEditBy = update.lastEditBy;
    oldTransactionInfo.displayDate = update.displayDate;

    if (update.original_currency) oldTransactionInfo.original_currency = update.original_currency;
    if (update.address) oldTransactionInfo.address = update.address;
    if (update.longtitude) oldTransactionInfo.longtitude = update.longtitude;
    if (update.latitude) oldTransactionInfo.latitude = update.latitude;
    if (update.tokenDevice) oldTransactionInfo.tokenDevice = update.tokenDevice;
    if (update.updateAt) oldTransactionInfo.updateAt = update.updateAt;

    oldTransactionInfo.save(callback);
}

function createTransaction(transactionInfo, walletInfo, callback) {
    let data = new TransactionModel({
        _id: transactionInfo._id,
        account: transactionInfo.account,
        displayDate: transactionInfo.displayDate,
        amount: transactionInfo.amount,
        note: transactionInfo.note,
        category: transactionInfo.category,
        lastEditBy: walletInfo.owner._id
    });

    if (transactionInfo.original_currency) data.original_currency = transactionInfo.original_currency;
    if (transactionInfo.address) data.address = transactionInfo.address;
    if (transactionInfo.longtitude) data.longtitude = transactionInfo.longtitude;
    if (transactionInfo.latitude) data.latitude = transactionInfo.latitude;
    if (transactionInfo.tokenDevice) data.tokenDevice = transactionInfo.tokenDevice;
    if (transactionInfo.createdAt) data.createdAt = transactionInfo.createdAt;
    if (transactionInfo.updateAt) data.updateAt = transactionInfo.updateAt;
    data.save(callback);
}

function pushSyncNotificationToUser(userId, walletId) {
    let infoWl = {
        user_id: userId,
        wallet_id: walletId,
        flag: SYNC_CODE.WALLET
    };

    let infoTr = {
        user_id: userId,
        wallet_id: walletId,
        flag: SYNC_CODE.TRANSACTION
    };

    pushController.pushSyncNotification(infoTr)
        .then(function () {
            pushController.pushSyncNotification(infoWl);
        }).then(function () {

        }).catch(function (error) {

        });
}

function updateTransaction(loginId, timestamp, callback) {
    findFinsifyWalletByLoginId(loginId, function (err, listWallet) {
        if (err) {
            return callback(err);
        }

        if (listWallet.length === 0) {
            return callback();
        }

        async.eachSeries(listWallet, function (wallet, cb) {
            updateForEachWallet(wallet, timestamp, cb);
        }, callback);
    });
}

function updateForEachWallet(wallet, timestamp, callback) {
    let checkWalletInfo = function (cb) {
        if (checkRemoteWalletInfo(wallet)) {
            cb(null, wallet);
        } else {
            cb('MoneyLoverRemoteWalletNotFound');
        }
    };

    let getTransaction = function (wallet, cb) {
        let info = {
            login_id: wallet.rwInfo.login_id,
            acc_id: wallet.rwInfo.acc_id,
            timestamp: timestamp,
            secret: wallet.rwInfo.secret
            //from_date: moment(wallet.lastSync).format('YYYY-DD-MM'),
            //from_date: '1970-01-01',
            //to_date: moment().format('YYYY-MM-DD')
        };

        getTransactionFromFinsify(info, function (err, transactionList) {
            cb(err, transactionList, wallet);
        });
    };

    let saveTransaction = function (getTransactionResult, walletInfo, cb) {
        //write to mongo
        if (!_.isArray(getTransactionResult)) {
            return cb(getTransactionResult);
        }

        writeTransactionListIntoDb(getTransactionResult, walletInfo, function (err, balanceChanged) {
            cb(err, { userId: walletInfo.owner._id.toString(), walletId: walletInfo._id, balanceChanged: balanceChanged });
        });
    };

    async.waterfall([
        checkWalletInfo,
        getTransaction,
        saveTransaction
    ], function (error, result) {
        //push sync notification
        callback(error);

        if (result) {
            pushSyncNotificationToUser(result.userId, result.walletId);
        }
    });
}

function updateBalance(mlWalletInfo, fsWalletInfo, callback) {
    try {
        let md = JSON.parse(mlWalletInfo.metadata);
        md.balance = fsWalletInfo.balance;
        mlWalletInfo.metadata = JSON.stringify(md);

        mlWalletInfo.rwInfo.balance = fsWalletInfo.balance;
        mlWalletInfo.balance = fsWalletInfo.balance;
        mlWalletInfo.tokenDevice = tokenDevice;
        mlWalletInfo.save(function (err, data) {
            callback(err, data);
        });
    } catch (e) {
        callback(e);
    }
}

function updateWalletBalance(walletInfo, callback) {
    getFinsifyAccountInfo(walletInfo.rwInfo.secret, function (err, listAccounts) {
        if (err) {
            return callback(err);
        }

        if (!_.isArray(listAccounts)) {
            return callback(listAccounts)
        }

        if (listAccounts.length === 0) {
            return callback('get_finsify_account_failed');
        }

        let fsWalletInfo = null;

        listAccounts.forEach(function (element) {
            if (element.login_id && element.login_id == walletInfo.rwInfo.login_id && element.id == walletInfo.rwInfo.acc_id) {
                fsWalletInfo = element;
            }
        });

        if (!fsWalletInfo) {
            callback('finsify_wallet_not_found');
        } else {
            updateBalance(walletInfo, fsWalletInfo, callback);
        }
    });
}

function getFinsifyAccountInfo(secret, callback) {
    let requestOptions = {
        host: finsifyOptions.host,
        port: 443,
        path: '/api/accounts',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Client-id': finsifyOptions.public_key,
            'Service-secret': finsifyOptions.secret_key,
            'Login-secret': secret
        }
    };

    let request = http.request(requestOptions, function (response) {
        response.setEncoding('utf8');
        let data = "";
        response.on('data', function (chunk) {
            data += chunk.toString();
        });
        response.on('end', function () {
            try {
                let parsedData = JSON.parse(data);
                callback(null, parsedData);
            } catch (e) {
                callback({ error: 'ErrorFromFinsify', statusCode: response.statusCode });
            }
        });
    });

    request.end();
}

/*********EXPORTS************/

// let finsifyDataChanged = function (req, res) {
//     let login_id = req.body.login_id;
//     let timestamp = req.body.timestamp || 0;

//     if (!login_id) {
//         return res.status(404).json({ s: false, e: 'ParamInvalid' });
//     }
//     // console.log('notify', req.body);
//     updateTransaction(login_id, timestamp, function (error) {
//         pushToSlack(login_id, error, function (err) { });

//         if (!error) {
//             return res.json({ s: true });
//         }

//         let responseBody = { s: false };
//         let statusCode = 404;

//         if (_.isString(error)) {
//             responseBody.e = error;
//         } else if (error.error) {
//             responseBody.e = error.error;

//             if (error.statusCode) {
//                 statusCode = error.statusCode;
//             }
//         } else {
//             responseBody.e = 'UnknownError';
//             responseBody.m = error;
//         }

//         res.status(statusCode).json(responseBody);
//     });
// };

let loginIdFail = function (req, res) {
    let login_id = req.body.login_id;
    let referenceId = req.body.referenceId;
    let messageError = req.body;

    if (!login_id) {
        return res.json({ s: false, e: 'ParamInvalid' });
    }

    let type = 0;
    let error = '';
    let message;
    let status;
    if (messageError.status) {
        status = messageError.status;
        type = 1;

        if (status === 'login_wrong_credentials') {
            error = Error.FINSIFY_WRONG_CREDENTIALS;
            message = 'login_wrong_credentials';
        } else if (status === 'login_password_expired') {
            error = Error.FINSIFY_PASSWORD_EXPIRED;
            message = 'login_password_expired';
        } else if (status === 'login_account_locked') {
            error = Error.FINSIFY_ACCOUNT_LOCKED;
            message = 'login_account_locked';
        }
        // message = error;
    }

    AccountModel.findByRemoteWalletLoginId(login_id, function (err, wallets) {
        if (err) {
            return res.json({ s: false, e: 'UserFindingError' });
        }

        if (!wallets || wallets.length === 0) {
            return res.json({ s: false, e: 'UserNotFound' });
        }

        if (type == 0) {
            pushController.pushFinsifyFailNotification(wallets[0].owner._id, login_id);
        } else {
            // inactive user's rw and push noti
            async.parallel({
                inactive: function (cb) {
                    AccountModel.deactiveLinkedWallet(wallets[0]._id, error, message, cb);
                },
                push: function (cb) {
                    pushController.pushFinsifyErrorNotificationExtension(wallets[0].owner._id, login_id, error, wallets[0], null, null);
                    cb();
                },
                log: function (cb) {
                    let medatadataLog = {
                        metadata: {
                            login_id: login_id,
                            referenceId: referenceId,
                            status: status
                        }
                    };

                    LogFinsifyHookModel.addNew(medatadataLog, cb);
                }
            }, function () { })
        }

        if (error) {
            return res.json({
                s: false,
                c: error,
                m: status
            });
        }

        res.json({ s: true });
    });
};

module.exports = function (app) {
    require('./log')(app);
    require('./indexv2')(app);

    // app.post('/finsify/notify', finsifyDataChanged);
    app.post('/finsify/fail', loginIdFail);
};
