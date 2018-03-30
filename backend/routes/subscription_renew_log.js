'use strict';

const mongoose = require('mongoose');
const env = process.env.NODE_ENV;
const config = require('../../config/config')[env];
const fs = require('fs');
const async = require('async');
const utils = require('../../helper/utils');
const LogDb = require('../../model/helper/mongodb_connect_logs');
const RenewSubscriptionLogModel = LogDb.model('SubscriptionRenewLog');


let appSubscriptionRenewLogBrowse = function (req, res) {
    let limit = req.body.limit;
    let skip = req.body.skip;
    if (!limit || !skip) {
        return res.json({
            status: false,
            message: "param's empty"
        });
    }

    RenewSubscriptionLogModel.getLog(skip, limit, function (error, result) {
        if (error) {
            return res.json({
                status: false,
                message: "Unknow error"
            });
        }
        res.json({
            status: true,
            data: result
        })
    });
};

let searchByBill = function (req, res) {
    let permissionAccess = utils.checkPermissisonAccessPage(req.session.permission);

    if (!permissionAccess) {
        return res.json({
            error: true,
            message: 'Permission denied'
        })
    }

    let key = req.body.searchKey;
    key = key.toString();

    if (!key) {
        return res.json({
            error: true,
            message: 'Inavild params or not found'
        });
    }

    searchByBillFromModel(key, function (error, result) {
        if (error) {
            return res.json({
                status: false,
                message: error
            })
        }

        return res.json({
            status: true,
            data: result
        })
    })
}

function searchByBillFromModel(key, callback) {
    let condition = {
        $or: [
            { 'bill_id': key },
            { 'user': key },
            { 'product_id': key }
        ]
    };
    RenewSubscriptionLogModel.find(condition)
        .exec(callback);
};

module.exports = function (app, config) {
    app.get('/subscription_renew_log', staticsMain);
    app.post('/subscription_renew_log/*', staticsMain);

    app.post('/subscription-renew-log/browse', appSubscriptionRenewLogBrowse);
    app.post('/subscription-renew-log/searchByBill', searchByBill);
};
