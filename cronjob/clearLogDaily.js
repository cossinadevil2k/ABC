/* 
    Cronjob delete sync exception log,
    automation log
*/

'use strict';

let env = process.env.NODE_ENV;

const mongoose = require('mongoose');
const config = require('../config/config')[env];
const CronJob = require('cron').CronJob;
const moment = require('moment');
const async = require('async');
const Slackbot = require('slackbot');
const slackbot = new Slackbot('moneylover', '50cXqEaCuKrX0LiyfaISgtFf');

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});


require('../model/automation_log');
require('../model/sync_error_log');

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};


//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});
const LogDb = require("../model/helper/mongodb_connect_logs");

const SyncErrorLog = LogDb.model('SyncErrorLog');
const AutomationLog = mongoose.model('Automation_Log');

let Daily = '0 59 22 * * *';

function pushToSlack(channel, content) {
    slackbot.send(channel, JSON.stringify(content), function (err, response, body) {
    });
}

let clearRecordDaily = function (callback) {
    let startDay = moment().startOf('days').subtract(7, 'days').toDate();
    let endDay = moment().endOf('days').subtract(7, 'days').toDate();
    let currentDate = moment().toDate();

    let condition = {
        automation: {
            createdAt: {
                $gte: startDay,
                $lt: endDay
            }
        },
        syncLog: {
            errorDate: {
                $gte: startDay,
                $lt: endDay
            }
        }
    }

    async.parallel({
        resovled: function (callback) {
            SyncErrorLog.remove(condition.syncLog)
                .lean(true)
                .exec(callback);
        },
        totalIssueOfToday: function (callback) {
            AutomationLog.remove(condition.automation)
                .lean(true)
                .exec(callback);
        }
    }, function (error, results) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, { currentDate: currentDate });
        }
    });

};


function clearLogDaily() {
    async.series({
        connectDB: function (cb) {
            // Connect to MongoDB
            mongoose.Promise = require('bluebird');
            mongoose.connect(config.db_url, connectOptions);
            let db = mongoose.connection;

            db.on('error', console.error.bind(console, ' Sync Database connection error:'));
            db.once('open', function callback() {
                console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
            });
            db.on('reconnected', function () {
                console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.')
            });
            db.on('disconnected', function () {
                console.log('Money DB DISCONNECTED');
            });

            cb();
        },
        clearLogDaily: function (cb) {
            clearRecordDaily(function (error, results) {
                if (error) {
                    pushToSlack("@loint", error);
                } else {
                    pushToSlack("@loint", 'clear log daily ' + results);
                }
            });
        }
    }, function () {
        mongoose.connection.close();
    })
};

let statDaily = new CronJob({
    cronTime: Daily,
    onTick: clearLogDaily,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

statDaily.start();