/* 
    user credit mutilple 1000
*/

'use strict';

let env = process.env.NODE_ENV;

const mongoose = require('mongoose');
const config = require('../../config/config')[env];
const CronJob = require('cron').CronJob;
const moment = require('moment');
const async = require('async');
const utils = require('../../helper/utils');
const path = require('path');
const Slackbot = require('slackbot');
const slackbot = new Slackbot('moneylover', '50cXqEaCuKrX0LiyfaISgtFf');
const Request = require('request');

// const REDIS_KEY = 'credit_change_skip_limit_test_5';
const TYPE_CREDIT = {
    receipt: 'receipt'
}

const Rabbit = require('../../helper/rabbitmq/lib/rabbit');

const RawDataPublisher = new Rabbit.default({
    tag: 'white-house-worker-credit',
    exchanges: [Rabbit.JOB_EXCHANGE]
});

const EVENT_UPDATE_CREDIT = 'hook.ready.rawcredit';

const numberIncrease = 1000;

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});

require('../../model/user');
require('../../model/use_credit');


let connectOptions = {
    server: {
        auto_reconnect: true
    }
};
// Connect to MongoDB
mongoose.connect(config.db_url, connectOptions);
const db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback() {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});
db.on('reconnected', function () {
    console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
});
db.on('disconnected', function () {
    console.log('Money DB DISCONNECTED');
});

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    db.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

const UserModel = mongoose.model('User');
let UserCreditModel = mongoose.model('UseCredit');
// const hook = require('../backend/routes/hook');

const SCHEDULE_BUS = {
    'test': '00 */5 * * * *',
    'production': '0 */5 * * * *'
};

function pushToSlack(user, content) {
    slackbot.send(user, JSON.stringify(content), function (err, response, body) {
    });
}

function findUser(skip, limit, callback) {
    UserModel.find()
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
}

function findUserCredit(skip, limit, callback) {
    UserCreditModel.find({
        turns: {
            receipt: { $lt: 1000 }
        }
    }).skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
}

let limit = 10000;
let skip = 0;
let total = 0;

function mainFunc() {

    let listUserUpdate = [];
    async.series({
        getUser: function (callback) {
            findUser(skip, limit, function (err, result) {
                if (err) {
                    callback(err, null);
                } else {
                    if (result.length > 0) {
                        async.eachSeries(result, function (user, cb) {
                            let userId = user._id;

                            UserCreditModel.getUseCreditByItem(userId, TYPE_CREDIT.receipt, function (err, user_credit) {
                                if (err) {
                                    cb();
                                } else {
                                    if (user_credit && parseInt(user_credit) <= 1000) {
                                        listUserUpdate.push(userId);
                                    }
                                    cb();
                                }
                            });
                        }, function (err) {
                            callback();
                        });
                    } else {
                        // creditSchedule.stop();
                        pushToSlack('@loint', 'Credit User Update Stop');
                        callback(null, null);
                    }
                }
            });

            // findUserCredit(skip,limit, function (err, result) {
            //     if (err) {
            //         callback(err, null);
            //     } else {
            //         if (result.length > 0) {
            //             async.eachSeries(result, function (user, cb) {
            //                 let userId = user.user;
            //                 listUserUpdate.push(userId);
            //                 cb();
            //             }, function (err) {
            //                 callback(null, null);
            //             });
            //         } else {
            //             callback(null, null);
            //         }
            //     }
            // });
        },
        updateCreditUser: function (callback) {
            total += parseInt(listUserUpdate.length);
            async.eachSeries(listUserUpdate, function (userId, cb) {
                RawDataPublisher.publish(EVENT_UPDATE_CREDIT, userId, Rabbit.PRIORITY.high);
                cb();
            }, function (err) {
                callback();
            });
        }
        ,
        increaseLimitSkip: function (callback) {
            skip = skip + limit;
            callback();
        }
    }, function (err) {
        if (err) {
            pushToSlack("@loint", err);
        }

        pushToSlack("@loint ", "[" + env + "] " + ' User updated = ' + total + ' Skip = ' + skip);
    })
}

let cronTime = (env === 'production') ? SCHEDULE_BUS['production'] : SCHEDULE_BUS['test'];

let creditSchedule = new CronJob({
    cronTime: cronTime,
    onTick: mainFunc,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

creditSchedule.start();

