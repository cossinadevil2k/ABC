'use strict';

let mongoose = require('mongoose');
let ReceiptModel = mongoose.model('Receipt');
let PushController = require('../../model/sync/push_controller');
// let WalletModel = mongoose.model('Account');
let UseCreditModel = mongoose.model('UseCredit');
let TransactionModel = mongoose.model('Transaction');
let CategoryModel = mongoose.model('Category');
let WalletModel = mongoose.model('Account');
let UserModel = mongoose.model('User');
let AdminModel = mongoose.model('Administrator');

const async = require('async');
const moment = require('moment');
const NOTICATION_SYNC_FLAGS = require('../../config/sync_codes');
const utils = require('../../helper/utils');

const USE_TURN_TYPE = 'receipt';

const RECEIPT_REJECT_REASON = {
    1: {
        key: "RECEIPT_IMAGE_CONTENT_BAD",
        penalty: true
    },
    2: {
        key: "RECEIPT_IMAGE_QUALITY_BAD"
    },
    3: {
        key: "RECEIPT_IMAGE_CONTENT_DUPLICATE"
    }
};

function notificationDoneComplete(user_id, transaction_id) {
    PushController.pushReceiptResult(user_id, transaction_id, true, null);
}

function notificationDoneNotComplete(user_id, data) {
    PushController.pushReceiptResult(user_id, null, false, data);
}

function notificationReject(user_id, image_id, error, message) {
    PushController.pushReceiptReject(user_id, image_id, error, message);
}

function postCompleteReceipt(receipt_info) {
    if (!receipt_info.wallet || !receipt_info.category) {
        receipt_info.data.images = [receipt_info.image_id];

        if (receipt_info.wallet) {
            receipt_info.data.account = receipt_info.wallet._id || receipt_info.wallet;
        }

        return notificationDoneNotComplete(receipt_info.user._id || receipt_info.user, receipt_info.data);
    }

    makeTransactionFromReceipt(receipt_info, (err, transaction_id) => {
        if (!err) {
            notificationDoneComplete(receipt_info.user._id || receipt_info.user, transaction_id);
        } else {
            // console.log(err);
        }
    });
}

function makeTransactionFromReceipt(receipt, callback) {
    let transactionInfo = {
        _id: utils.generateUUID(),
        account: receipt.wallet._id || receipt.wallet,
        category: receipt.category._id || receipt.category,
        amount: receipt.data.amount,
        tokenDevice: 'moneylover',
        displayDate: moment(receipt.data.displayDate, 'YYYY-MM-DD'),
        lastEditBy: receipt.user._id || receipt.user,
        images: [receipt.image_id]
    };

    if (receipt.data.note) {
        transactionInfo.note = receipt.data.note;
    }

    if (receipt.data.address) {
        transactionInfo.address = receipt.data.address;
    }

    if (receipt.data.latitude) {
        transactionInfo.latitude = receipt.data.latitude;
    }

    if (receipt.data.longtitude) {
        transactionInfo.longtitude = receipt.data.longtitude;
    }

    let item = new TransactionModel(transactionInfo);

    item.save((err) => {
        callback(err, transactionInfo._id);

        if (!err) {
            let syncNotificationInfo = {
                user_id: receipt.user._id || receipt.user,
                flag: NOTICATION_SYNC_FLAGS.TRANSACTION,
                wallet_id: receipt.wallet._id || receipt.wallet
            };

            PushController.pushSyncNotification(syncNotificationInfo);
        }
    });
}

let appFindOne = function (req, res) {
    let id = req.body.id;

    if (!id) {
        return res.json({ s: false });
    }

    ReceiptModel.findByReceiptId(id, (err, data) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: data });
    });
};

let appFindAll = function (req, res) {
    let get_from_admin = req.body.admin;
    let skip = req.body.skip || 0;
    let limit = req.body.limit;
    let admin = req.session.adminId;
    let sort = req.body.sort;

    if (!limit) {
        return res.json({ s: false });
    }

    let options = {
        sort: sort
    };

    if (get_from_admin) {
        ReceiptModel.findByAdmin(admin, skip, limit, callbackFunction, options);
    } else {
        ReceiptModel.findAll(skip, limit, callbackFunction, options);
    }

    function callbackFunction(err, data) {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: data });
    }
};

let appFindByStatus = function (req, res) {
    let get_from_admin = req.body.admin;
    let skip = req.body.skip || 0;
    let limit = req.body.limit;
    let status = req.body.status;
    let admin = req.session.adminId;
    let sort = req.body.sort;

    if (!limit) {
        return res.json({ s: false });
    }

    let options = {
        sort: sort
    };

    if (get_from_admin) {
        ReceiptModel.findByAdminAndStatus(admin, status, skip, limit, callbackFunction, options);
    } else {
        ReceiptModel.findByStatus(status, skip, limit, callbackFunction, options);
    }

    function callbackFunction(err, data) {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: data });
    }
};

let appFindByUser = function (req, res) {
    let user_id = req.body.user;
    let status = req.body.status;
    let skip = req.body.skip || 0;
    let limit = req.body.limit;

    if (!user_id || !limit) {
        return res.json({ s: false });
    }

    if (status) {
        ReceiptModel.findByUserAndStatus(user_id, status, skip, limit, callbackFunction);
    } else {
        ReceiptModel.findByUser(user_id, skip, limit, callbackFunction);
    }

    function callbackFunction(err, data) {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: data });
    }
};

let appDelete = function (req, res) {
    let id = req.body.id;

    if (!id) {
        return res.json({ s: false });
    }

    ReceiptModel.findByIdAndRemove(id, (err) => {
        res.json({ s: !err });
    });
};

let appDraft = function (req, res) {
    let receipt_info = req.body.receipt;
    let admin = req.session.adminId;
    let status = 'draft';

    if (!receipt_info) {
        return res.json({ s: false });
    }

    let update = {
        admin: admin,
        data: receipt_info.data,
        status: status,
        updated_at: Date.now()
    };

    ReceiptModel.findByIdAndUpdate(receipt_info._id, { $set: update }, (err) => {
        res.json({ s: !err });
    });

};

let appReject = function (req, res) {
    let receipt_info = req.body.receipt;
    let reason = req.body.reason;
    let admin = req.session.adminId;
    let status = 'rejected';

    if (!receipt_info || !reason) {
        return res.json({ s: false });
    }

    reason = parseInt(reason);

    let update = {
        status: status,
        admin: admin,
        updated_at: Date.now(),
        metadata: {
            reject_reason: {
                code: reason,
                message: RECEIPT_REJECT_REASON[reason].key
            }
        }
    };

    ReceiptModel.findByIdAndUpdate(receipt_info._id, { $set: update }, (err) => {
        res.json({ s: !err });

        if (!err) {
            if (!RECEIPT_REJECT_REASON[reason].penalty) {
                //refund use credit
                UseCreditModel.increaseUseCredit(receipt_info.user._id, USE_TURN_TYPE, 1, () => {

                });
            }

            notificationReject(receipt_info.user._id, receipt_info.image_id, reason, RECEIPT_REJECT_REASON[reason].key);
        }
    });
};

let appDone = function (req, res) {
    let receipt_info = req.body.receipt;
    let admin = req.session.adminId;
    let status = 'done';

    let update = {
        admin: admin,
        data: receipt_info.data,
        status: status,
        updated_at: Date.now()
    };

    if (receipt_info.category) {
        update.category = receipt_info.category._id;
    }

    ReceiptModel.findByIdAndUpdate(receipt_info._id, { $set: update }, (err) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true });
        postCompleteReceipt(receipt_info);
    });
};

let appSelfAssign = function (req, res) {
    let id = req.body.id;
    let admin = req.session.adminId;

    if (!id) {
        return res.json({ s: false });
    }

    ReceiptModel.findByIdAndUpdate(id, { $set: { admin: admin } }, (err) => {
        if (err) {
            return res.json({ s: false });
        }

        AdminModel.findById(admin, 'username', (err, adminInfo) => {
            if (err) {
                return res.json({ s: false });
            }

            res.json({ s: !err, d: adminInfo });
        });
    });
};

let appUnassign = function (req, res) {
    let id = req.body.id;

    if (!id) {
        return res.json({ s: false });
    }

    ReceiptModel.findByIdAndUpdate(id, { $unset: { admin: 1 } }, (err, data) => {
        res.json({ s: !err });
    });
};

let appRejectReason = function (req, res) {
    let result = [];

    let reason_codes = Object.keys(RECEIPT_REJECT_REASON);

    reason_codes.forEach(function (code) {
        result.push({
            code: code,
            message: RECEIPT_REJECT_REASON[code]
        });
    });

    res.json({ s: true, d: result });
};

let appGetWallet = function (req, res) {
    let user_id = req.body.user_id;

    if (!user_id) {
        return res.json({ s: false });
    }

    WalletModel.find({ isDelete: false, listUser: user_id })
        .select('name currency_id icon account_type archived')
        .exec((err, wallets) => {
            if (err) {
                console.log(err);
                return res.json({ s: false });
            }

            if (wallets.length === 0) {
                return res.json({ s: true, d: wallets });
            }

            let output = [];

            wallets.forEach(function (wallet) {
                if (!wallet.account_type && !wallet.archived) {
                    output.push(wallet);
                }
            });

            res.json({ s: true, d: output });
        });
};

let appGetCategory = function (req, res) {
    let wallet_id = req.body.wallet;

    CategoryModel.find({ account: wallet_id, isDelete: false })
        .select('name account type metadata')
        .populate('account', 'name currency_id')
        .exec((err, categories) => {
            if (err) {
                return res.json({ s: false });
            }

            res.json({ s: true, d: categories });
        });
};

let appCount = function (req, res) {
    async.parallel({
        openReceipts: function (cb) {
            ReceiptModel.count({ status: 'open' }, cb);
        }
    }, (err, results) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: results });
    });
};

let appFindByEmail = function (req, res) {
    let email = req.body.email;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 50;

    UserModel.findByEmail(email, (err, user) => {
        if (err) {
            return res.json({ s: false });
        }

        if (!user) {
            return res.json({ s: true, d: [] });
        }

        ReceiptModel.findByUser(user._id, skip, limit, (err, data) => {
            if (err) {
                return res.json({ s: false });
            }

            res.json({ s: true, d: data });
        });
    });
};

let appGetNextOpen = function (req, res) {
    let opened = req.body.opened;
    let query = { _id: { $nin: opened }, status: 'open', admin: { $exists: false } };

    ReceiptModel.findOne(query, (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ s: !err });
        }

        if (!result) {
            return res.json({ s: true });
        }

        res.json({ s: true, d: result._id });
    });
};

let appRanking = function (req, res) {
    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    let start_time;
    let end_time;

    if (startDate) {
        start_time = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
    } else {
        start_time = moment().startOf('month').toDate();
    }

    if (endDate) {
        end_time = moment(endDate, 'YYYY-MM-DD').startOf('day').toDate();
    } else {
        end_time = moment().endOf('month').toDate();
    }

    async.parallel({
        total_done: function (cb) {
            totalByStatus('done', cb);
        },
        total_rejected: function (cb) {
            totalByStatus('rejected', cb);
        },
        done: function (cb) {
            countByStatus('done', cb);
        },
        rejected: function (cb) {
            countByStatus('rejected', cb);
        }
    }, function (err, results) {
        res.json({ s: !err, d: results });
    });

    function countByStatus(status, callback) {
        ReceiptModel.aggregate(
            {
                $match: {
                    status: status,
                    updated_at: { $gte: start_time, $lte: end_time }
                }
            },
            {
                $group: {
                    _id: '$admin',
                    total: {
                        $sum: 1
                    }
                }
            },
            callback
        );
    }

    function totalByStatus(status, callback) {
        let query = {
            status: status,
            updated_at: { $gte: start_time, $lte: end_time }
        };

        ReceiptModel.count(query, callback);
    }

};

let appFindSolvedByAdmin = function (req, res) {
    let admin_id = req.body.admin_id;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;
    let startDate = req.body.startDate;
    let endDate = req.body.endDate;
    let start_time;
    let end_time;
    let status = req.body.status;

    if (!admin_id) {
        return res.json({ s: false });
    }

    if (startDate) {
        start_time = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
    } else {
        start_time = moment().startOf('month').toDate();
    }

    if (endDate) {
        end_time = moment(endDate, 'YYYY-MM-DD').startOf('day').toDate();
    } else {
        end_time = moment().endOf('month').toDate();
    }

    let query = {
        admin: admin_id,
        status: status,
        updated_at: {
            $gte: start_time,
            $lte: end_time
        }
    };

    ReceiptModel.find(query)
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'email')
        .lean()
        .exec((err, data) => {
            if (err) {
                return res.json({ s: false });
            }

            res.json({ s: true, d: data });
        });
};

let appRestoreDefault = function (req, res) {
    let user = req.body.user;

    if (!user) {
        return res.json({
            status: false
        })
    }

    UseCreditModel.restoreDefaultCredit(user, function (error, result) {
        if (error) {
            res.json({
                status: false
            });
        } else {
            res.json({
                status: true,
                data: result
            });
        }
    });

}

module.exports = function (app, config) {
    app.get('/receipt', staticsMain);
    app.get('/receipt/details', staticsMain);
    app.get('/receipt/details/*', staticsMain);

    app.post('/receipt/count', appCount);
    app.post('/receipt/find-one', appFindOne);
    app.post('/receipt/find-all', appFindAll);
    app.post('/receipt/find-by-status', appFindByStatus);
    app.post('/receipt/find-by-user', appFindByUser);
    app.post('/receipt/delete', appDelete);
    app.post('/receipt/save/draft', appDraft);
    app.post('/receipt/save/reject', appReject);
    app.post('/receipt/save/done', appDone);
    app.post('/receipt/save/self-assign', appSelfAssign);
    app.post('/receipt/save/unassign', appUnassign);
    app.post('/receipt/save/get-reject-reason', appRejectReason);
    app.post('/receipt/get-wallet', appGetWallet);
    app.post('/receipt/get-category', appGetCategory);
    app.post('/receipt/find-by-email', appFindByEmail);
    app.post('/receipt/get-next-open', appGetNextOpen);
    app.post('/receipt/find-solved-by-admin', appFindSolvedByAdmin);

    app.get('/receipt/ranking', staticsMain);
    app.post('/receipt/ranking', appRanking);

    app.post('/receipt/restore-default', appRestoreDefault);
};
