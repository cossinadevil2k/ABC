'use strict';

let env = process.env.NODE_ENV;

const mongoose = require('mongoose');
const config = require('../config/config')[env];
let CronJob = require('cron').CronJob;
let moment = require('moment');
let async = require('async');
let kue = require('kue');
let utils = require('../helper/utils');

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});


require('../model/helpDeskDailyResolve');
require('../model/user');
require('../model/helpdesk_performance');
require('../model/helpdesk_issue_stat');
require('../model/device');
require('../model/backend_notification');
require('../model/helpdesk_issue');
require('../model/helpdesk_daily_static');

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

let HelpDeskDailyResolve = mongoose.model('HelpDeskDailyResolve');
let User = mongoose.model('User');
let IssueModel = mongoose.model('HelpDeskIssue');
let HelpDeskDailyStatic = mongoose.model('HelpDeskDailyStatic');

let Daily = '0 59 22 * * *';

/* Connect DB */

function connectDB(callback) {
    // Connect to MongoDB
    mongoose.Promise = require('bluebird');
    mongoose.connect(config.db_url, connectOptions);
    let db = mongoose.connection;

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

    callback();
}

function closeDB(callback) {
    mongoose.connection.close();
    callback();
}

let getRecordDaily = function (callback) {
    let startDay = moment().startOf('days').toDate();
    let endDay = moment().endOf('days').toDate();
    let currentDate = moment().toDate();

    let conditionResovled = {
        created_at: {
            $gte: startDay,
            $lt: endDay
        }
    }

    let conditionTotalIssue = {
        report_date: {
            $gte: startDay,
            $lt: endDay
        }
    }

    async.parallel({
        resovled: function (callback) {
            HelpDeskDailyResolve.find(conditionResovled)
                .lean(true)
                .exec(callback);
        },
        totalIssueOfToday: function (callback) {
            IssueModel.find(conditionTotalIssue)
                .lean(true)
                .exec(callback);
        }
    }, function (error, results) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, {
                totalIssueOfToday: results.totalIssueOfToday.length,
                resovled: results.resovled.length,
                currentDate: currentDate
            });
        }
    });

};

let logToStatic = function (records, callback) {
    if (!records) {
        return callback(null, null);
    }

    let data = {
        issue: records.totalIssueOfToday,
        resolve: records.resovled,
        byDate: records.currentDate
    };

    let that = new HelpDeskDailyStatic(data);
    that.save(function (error, result) {
        if (error) {
            return callback(error, null);
        }
        // console.log(result);
        return callback(null, result);
    })
};

function statDailyHelpdesk() {
    async.waterfall([
        connectDB,
        getRecordDaily,
        logToStatic,
        closeDB
    ], function (err, result) {
        if (err) {
            console.log(err);
        }
    });
};

// statDailyHelpdesk();

let statDaily = new CronJob({
    cronTime: Daily,
    onTick: statDailyHelpdesk,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

statDaily.start();