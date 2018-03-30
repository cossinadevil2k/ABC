'use strict';

const LogDb = require('../../model/helper/mongodb_connect_logs');
const mongoose = require('mongoose');
const SyncErrorLog = LogDb.model('SyncErrorLog');
const UserModel = mongoose.model('User');
const validators = require('../../helper/validators');

const asyncLib = require('async');

const appList = function (req, res) {
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;

    SyncErrorLog.find()
        .sort({ errorDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec((err, data) => {
            if (err) {
                return res.json({ status: false });
            }

            if (data.length === 0) {
                return res.json({ status: !err, data: data });
            }

            let result = [];

            asyncLib.eachSeries(data, (log, done) => {
                asyncLib.setImmediate(() => {
                    UserModel.findById(log.userId, (err, user) => {
                        if (err) return done(err);

                        log.user = user;
                        result.push(log);

                        done();
                    });
                });
            }, err => {
                res.json({ status: !err, data: result });
            });
        });
};

let appSearchException = function (req, res) {
    let email = req.body.email;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;

    if (!email || !validators.isEmail(email)) {
        return res.json({
            status: false,
            message: 'param is empty or invaild '
        });
    }

    UserModel.findOne({
        email: email
    }, function (err, result) {
        if (err) {
            return res.json({
                status: false,
                message: 'error server'
            });
        } else {
            if (result) {
                let userId = result._id;
                let user = result;

                SyncErrorLog.find({
                    userId: userId
                })
                    .skip(skip)
                    .limit(limit)
                    .sort({ errorDate: -1 })
                    .lean(true)
                    .exec(function (error, data) {
                        if (error) {
                            return res.json({ status: false });
                        }

                        if (data.length === 0) {
                            return res.json({ status: !error, data: data });
                        }

                        let newResultGenerated = [];
                        asyncLib.each(data, function (item, cb) {
                            asyncLib.setImmediate(() => {
                                let generateData = item;
                                generateData.user = user;
                                newResultGenerated.push(generateData);

                                cb();
                            });
                        }, function (error) {
                            if (!error) {
                                res.json({
                                    status: true,
                                    data: newResultGenerated
                                });
                            } else {
                                return res.json({
                                    status: false,
                                    message: 'no result'
                                });
                            }
                        });

                    });
            } else {
                return res.json({
                    status: false,
                    message: 'no result'
                });
            }
        }
    });
};

let appFillterException = function (req, res) {
    let platform = req.body.platform;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;

    if (!platform || typeof platform != 'number') {
        return res.json({
            status: false,
            message: 'param is empty or invaild '
        });
    }

    SyncErrorLog.find({
        platform: platform
    })
        .skip(skip)
        .limit(limit)
        .sort({ errorDate: -1 })
        .lean(true)
        .exec(function (err, data) {
            if (err) {
                return res.json({ status: false });
            }

            if (data.length === 0) {
                return res.json({ status: !err, data: data });
            }

            let result = [];

            asyncLib.eachSeries(data, (log, done) => {
                asyncLib.setImmediate(() => {
                    UserModel.findById(log.userId, (err, user) => {
                        if (err) return done(err);

                        log.user = user;
                        result.push(log);

                        done();
                    });
                });
            }, err => {
                res.json({ status: !err, data: result });
            });
        });
};

module.exports = function (app, config) {
    app.get('/exception', staticsMain);
    app.post('/exception/list', appList);
    app.post('/api/exception/search', appSearchException);
    app.post('/api/exception/filter', appFillterException);
};
