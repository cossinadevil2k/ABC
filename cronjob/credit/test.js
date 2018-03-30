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

// const Rabbit = require('../../helper/rabbitmq/lib/rabbit');

// const RawDataPublisher = new Rabbit.default({
//     tag: 'white-house-worker-credit',
//     exchanges: [Rabbit.JOB_EXCHANGE]
// });

// const EVENT_UPDATE_CREDIT = 'hook.ready.rawcredit';

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

function updateCredit() {
    findUserCredit(function (err, result) {
        console.log(err);
    })
}


function findUserCredit(callback) {
    UserCreditModel.find()
        .lean()
        .exec(function (err, result) {
            if (err) {
                callback(err, null);
            } else {
                result.forEach(function (item) {
                    console.log(item);
                    console.log(typeof item);
                    // item.markModified('turns');

                    if (item.turns['receipt'] > 3) {
                        // item.turns['receipt'] = 3;
                        UserCreditModel.update({ _id: item._id }, { $set: { "turns.receipt": 3 } }, callback);

                    }else{
                        callback();
                    }

                })
            }
        });
}

updateCredit();