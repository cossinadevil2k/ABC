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
const EVENT_DISCOUNT_TRACKING = rabbitConfig.EVENT_WORKER.EVENT_DISCOUNT_TRACKING;

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
require(path.join(__dirname, '../../model/discount_tracking'));
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
const DiscountTrackingModel = mongoose.model('DiscountTracking');

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

function purchaseRepotMain() {
    async.waterfall([
        getOld
    ], function (error) {
        if (error) {
            console.log(error);
        }
    });
};

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

function getSaleLogRecord(callback) {
    let startDay = moment().startOf('day').subtract(1, 'days').toDate();
    let endDay = moment().startOf('day').toDate();

    // startDay = "2017-01-01T17:00:00.000Z";
    // endDay = "2017-02-05T17:52:43.914Z";

    let condition = {
        sale_date: {
            // $gte: startDay,
            $lt: endDay
        }
    };

    SaleLog.find(condition)
        .lean(true)
        .exec(callback);

}

purchaseRepotMain();
// discountTrackingMain();