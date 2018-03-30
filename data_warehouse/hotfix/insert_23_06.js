const env = process.env.NODE_ENV || 'local';
const path = require('path');
const mongoose = require('mongoose');
const config = require('../../config/config')[env];
const CronJob = require('cron').CronJob;
const Rabbit = require('../lib/rabbit');
const moment = require('moment');
const async = require('async');
const LogDb = require('../../model/helper/mongodb_connect_logs');
const rabbitConfig = require('../config')[env];

let SCHEDULE_BUS = {
    'test': "00 * * * * *",
    'insert_product': '00 30 2 * * *',
    /* insert_product
     * Runs every day 
     * at 2:30:00 AM.
     */
    'update_product': '00 30 4 * * *',
    /* update_product
     *  Runs every day at 4h30 AM
     * */
    'sale': '00 00 21 * * *'
};

const RawDataPublisher = new Rabbit.default({
    tag: 'white-house-worker',
    exchanges: [Rabbit.JOB_EXCHANGE]
});

const EVENT_INSERT_NAME = rabbitConfig.EVENT_WORKER.EVENT_INSERT_NAME;
const EVENT_UPDATE_NAME = rabbitConfig.EVENT_WORKER.EVENT_UPDATE_NAME;
const EVENT_SALE_INSERT = rabbitConfig.EVENT_WORKER.EVENT_SALE_INSERT;

const connectOptions = {
    server: {
        auto_reconnect: true
    }
};

require(path.join(__dirname, '../../model/user'));
require(path.join(__dirname, '../../model/device'));
require(path.join(__dirname, '../../model/account'));
require(path.join(__dirname, '../../model/sale_log'));
require(path.join(__dirname, '../../model/item_log'));
// Connect to MongoDB
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

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    db.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

const User = mongoose.model('User');
const Device = mongoose.model('Device');
const Wallet = mongoose.model('Account');
const SaleLog = LogDb.model('SaleLog');
const ItemLogModel = LogDb.model('ItemLog');

const SELECT_USER_COLLECTION = '_id createdDate lastSync tags purchased premium_at isDeactivated';
const SELECT_DEVICE_COLLECTION = '_id owner';


const TABLE_NAME = "users";

const TAGS = {
    DEVICE: {
        IOS: 'ios',
        ANDROID: 'android',
        WP: 'wp',
        WINDOWS: 'windows',
        WEB: 'web',
        MAC: 'mac'
    },
    COUNTRY_KEY: 'country',
    DEVICE_KEY: 'device'
};

let getListUser = function (callback) {
    let startDay = moment().startOf('day').subtract(1, 'days').toDate();
    let endDay = moment().toDate();

    // startDay = "2017-01-01T17:00:00.000Z";
    // endDay = "2017-02-05T17:52:43.914Z";

    let condition = {
        createdDate: {
            $gte: startDay,
            $lt: endDay
        }
    };

    User.find(condition)
        .select(SELECT_USER_COLLECTION)
        .lean(true)
        .exec(callback);
};

let findUserByLastSync = function (callback) {
    let startDay = moment().startOf('day').subtract(1, 'days').toDate();
    let endDay = moment().toDate();


    let condition = {
        lastSync: {
            $gte: startDay,
            $lt: endDay
        }
    };

    User.find(condition)
        .select(SELECT_USER_COLLECTION)
        .lean(true)
        .exec(callback);

};

let putIntoQueue = function (users, callback) {

    userPut(users)
        .then(function (data) {
            callback();
        }).catch(function (err) {
            callback(err);
        })

}

function userPut(users) {
    let count = 0;
    return new Promise(function (resolve, reject) {
        users.forEach(function (user, index, collection) {
            setTimeout(function () {
                // console.time('excuteTime');

                RawDataPublisher.publish(EVENT_UPDATE_NAME, user, Rabbit.PRIORITY.normal);

                // console.timeEnd('excuteTime');

            }, index * 150);
        });
        resolve();
    });
}

function insertMain() {
    getListUser(function (error, users) {
        if (error) {
            return;
        }
        let count = 0;

        users.forEach(function (user, index, collection) {
            setTimeout(function () {
                console.time('excuteTime');

                // console.log('===============================================================>');
                // console.log('insert user ', count++);
                RawDataPublisher.publish(EVENT_INSERT_NAME, user, Rabbit.PRIORITY.normal)
                // console.log('<===============================================================')
                // console.timeEnd('excuteTime');

            }, index * 150);
        });

    });
}

function updateMain() {

    async.waterfall([
        findUserByLastSync,
        putIntoQueue
    ], function (error) {
        if (error) {
            console.log(error);
        }
    });
}

function purchaseRepotMain() {
    async.waterfall([
        getOld
    ], function (error) {
        if (error) {
            console.log(error);
        }
    });
};

let offset = 0;
let limit = 100000;
let c = 0;

function pushToSlack(user, content) {
    slackbot.send(user, JSON.stringify(content), function (err, response, body) {
    });
}

function getOld(callback) {

    async.waterfall([
        function (callback) {
            getSaleLogRecord(callback);
        },
        function (saleLogRecord, callback) {
            if (saleLogRecord.lenght <= 0) {
                callback();
            } else {
                putSaleRecordIntoQueue(saleLogRecord)
                    .then(function (data) {
                        callback(null, saleLogRecord);
                    })
                    .catch(function (error) {
                        callback(error, null);
                    })
            }
        }
    ], function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    });
};

function getSaleLogRecord(callback) {
    let startDay = moment().startOf('day').subtract(1, 'days').toDate();
    let endDay = moment().toDate();

    // startDay = "2017-01-01T17:00:00.000Z";
    // endDay = "2017-02-05T17:52:43.914Z";

    let condition = {
        purchased_date: {
            $gte: startDay,
            $lt: endDay
        }
    };

    ItemLogModel.find()
        .lean(true)
        .exec(callback);

}

function putSaleRecordIntoQueue(saleLogRecord) {
    return new Promise(function (resolve, reject) {
        saleLogRecord.forEach(function (item, index, collection) {
            setTimeout(function () {
                // console.time('excuteTime');

                RawDataPublisher.publish(EVENT_SALE_INSERT, item, Rabbit.PRIORITY.normal);
                // console.log('index ', index);
                // console.timeEnd('excuteTime');

            }, index * 150);
        });
        resolve();
    });
}


let insertTask = new CronJob({
    cronTime: SCHEDULE_BUS['insert_product'],
    onTick: insertMain,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

let updateTask = new CronJob({
    cronTime: SCHEDULE_BUS['update_product'],
    onTick: updateMain,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

let saleTask = new CronJob({
    cronTime: SCHEDULE_BUS['sale'],
    onTick: purchaseRepotMain,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

insertMain();

// insertTask.start();
// updateTask.start();
// saleTask.start();
// updateMain();
// purchaseRepotMain();