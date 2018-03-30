
const Rabbit = require('../lib/rabbit');
const async = require('async');
const env = process.env.NODE_ENV || 'local';
const path = require('path');
const mongoose = require('mongoose');
const config = require('../../config/config')[env];
const CronJob = require('cron').CronJob;
const rabbitConfig = require('../config')[env];
// const Postgres = require(path.join(__dirname, '../lib/postgres.js'));
const debug = require('debug')('processor:debug');
/* INSERT TASK */
const WORKER_RECEIVE_RAW_INSERT_NAME = rabbitConfig.EVENT_WORKER.WORKER_RECEIVE_RAW_INSERT_NAME;
const WORKER_INSERT_GENERATED_DATA = rabbitConfig.EVENT_WORKER.WORKER_INSERT_GENERATED_DATA;
const EVENT_RECEIVE_RAW_INSERT_MESSAGE = rabbitConfig.EVENT_WORKER.EVENT_RECEIVE_RAW_INSERT_MESSAGE;
const EVENT_PUBLISH_FOR_INSERT = rabbitConfig.EVENT_WORKER.EVENT_PUBLISH_FOR_INSERT;

/* UPDATE TASK */
const WORKER_RECEIVE_RAW_UPDATE_NAME = rabbitConfig.EVENT_WORKER.WORKER_RECEIVE_RAW_UPDATE_NAME;
const EVENT_RECEIVE_RAW_UPDATE_NAME = rabbitConfig.EVENT_WORKER.EVENT_RECEIVE_RAW_UPDATE_NAME;
const WORKER_UPDATE_EXCUTED_DATA = rabbitConfig.EVENT_WORKER.WORKER_UPDATE_EXCUTED_DATA;
const EVENT_PUBLISH_FOR_UPDATE = rabbitConfig.EVENT_WORKER.EVENT_PUBLISH_FOR_UPDATE;

/* SALE LOG TASK */
const EVENT_SALE_INSERT = rabbitConfig.EVENT_WORKER.EVENT_SALE_INSERT;
const WORKER_SALE_LOG_INSERT = rabbitConfig.EVENT_WORKER.WORKER_SALE_LOG_INSERT;
const EVENT_RECEIVE_RAW_SALE_INSERT = rabbitConfig.EVENT_WORKER.EVENT_RECEIVE_RAW_SALE_INSERT;
const WORKER_RECEIVE_RAW_SALE_INSERT = rabbitConfig.EVENT_WORKER.WORKER_RECEIVE_RAW_SALE_INSERT;


/* DISCOUNT TRACKING TASK */
const EVENT_DISCOUNT_TRACKING = rabbitConfig.EVENT_WORKER.EVENT_DISCOUNT_TRACKING;
const WORKER_DISCOUNT_LOG_INSERT = rabbitConfig.EVENT_WORKER.WORKER_DISCOUNT_LOG_INSERT;
const EVENT_RECEIVE_RAW_DISCOUNT_INSERT = rabbitConfig.EVENT_WORKER.EVENT_RECEIVE_RAW_DISCOUNT_INSERT;
const WORKER_RECEIVE_RAW_DISCOUNT_INSERT = rabbitConfig.EVENT_WORKER.WORKER_RECEIVE_RAW_DISCOUNT_INSERT;

const RawDataProcessWorker = new Rabbit.default({
    tag: 'white-house-worker',
    exchanges: [Rabbit.JOB_EXCHANGE],
    queues: [{
        name: WORKER_RECEIVE_RAW_INSERT_NAME,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_INSERT_GENERATED_DATA,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_RECEIVE_RAW_UPDATE_NAME,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_UPDATE_EXCUTED_DATA,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_SALE_LOG_INSERT,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_RECEIVE_RAW_SALE_INSERT,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_DISCOUNT_LOG_INSERT,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_RECEIVE_RAW_DISCOUNT_INSERT,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }]
});


const connectOptions = {
    server: {
        auto_reconnect: true
    }
};

require(path.join(__dirname, '../../model/user'));
require(path.join(__dirname, '../../model/device'));
require(path.join(__dirname, '../../model/account'));
require(path.join(__dirname, '../../model/item'));
require(path.join(__dirname, '../../model/item_log'));

// Connect to MongoDB
mongoose.Promise = global.Promise;
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
const LogDB = require("../../model/helper/mongodb_connect_logs");

const User = mongoose.model('User');
const Device = mongoose.model('Device');
const Wallet = mongoose.model('Account');
const Product = mongoose.model('Item');
const ItemLog = LogDB.model('ItemLog');

const TABLE_NAME = "users";
const TABLE_SALE = 'purchase_report';

const SUBCRIPTION = {
    'PREMIUM': 21,
    'LINKED_WALLET': 22
};

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
    DEVICE_KEY: 'device',
    UTM_SOURCE: 'utm_source',
    UTM_MEDIUM: 'utm_medium',
    UTM_CAMPAIGN: 'utm_campaign',
    UTM_CONTENT: 'utm_content',
    UTM_TERM: 'utm_term'
};

let count = 0;

/* Listen Insert Raw Message */

RawDataProcessWorker.listen(EVENT_RECEIVE_RAW_INSERT_MESSAGE, WORKER_RECEIVE_RAW_INSERT_NAME, function (rawData, next) {
    if (rawData) {
        generateData(rawData)
            .then(function (userGenerated) {
                // console.log('insert user ', count++);
                RawDataProcessWorker.publish(EVENT_PUBLISH_FOR_INSERT, userGenerated, Rabbit.PRIORITY.normal);
                next();
            })
            .catch(function (error) {
                // console.log(error);
                // next();
            })
    } else {
        next();
    }
});

/* Listen Update Raw Message */
let index = 0;

RawDataProcessWorker.listen(EVENT_RECEIVE_RAW_UPDATE_NAME, WORKER_RECEIVE_RAW_UPDATE_NAME, function (rawData, next) {
    // console.log('update user ', index++);
    publishForUpdate(rawData, next);
});

let c = 0;

RawDataProcessWorker.listen(EVENT_SALE_INSERT, WORKER_SALE_LOG_INSERT, function (rawData, next) {
    // console.log('sale log ', c++);
    publishForSaleInsert(rawData, next);
});

let publishForSaleInsert = function (record, callback) {
    generateDataSale(record)
        .then(function (data) {
            RawDataProcessWorker.publish(EVENT_RECEIVE_RAW_SALE_INSERT, data, Rabbit.PRIORITY.normal);
            callback();
        })
        .catch(function (error) {
            // callback();
        })
};

let discount = 0;
RawDataProcessWorker.listen(EVENT_DISCOUNT_TRACKING, WORKER_DISCOUNT_LOG_INSERT, function (rawData, next) {
    // console.log('discount log ', discount++);
    publishForDiscountTrackingInsert(rawData, next);
});

let publishForDiscountTrackingInsert = function (record, callback) {
    generateDataDiscountRecord(record)
        .then(function (data) {
            RawDataProcessWorker.publish(EVENT_RECEIVE_RAW_DISCOUNT_INSERT, data, Rabbit.PRIORITY.normal);
            callback();
        })
        .catch(function (error) {
            // callback();
        })
}

let generateDataDiscountRecord = function (discountRecord) {
    return new Promise((resovle, reject) => {
        let item = {
            user_id: discountRecord.user,
            discount_type: discountRecord.discount_type,
            campaign: discountRecord.campaign,
            product_id: discountRecord.product,
            tracking_at: discountRecord.createdAt
        }

        resovle(item);
    });
}

const TYPE = {
    '1': 'icon',
    '2': 'subscription',
    '3': 'user_credit',
    '5': 'premium',
    '6': 'semi_premium',
    '21': 'subsciption_premium',
    '22': 'subscription_linked_wallet',
    '99': 'other',
    '0': 'unknow'
};

let generateDataSale = function (saleLogRecord) {
    return new Promise(function (resovle, reject) {
        let item = {
            user_id: saleLogRecord.user,
            product_id: saleLogRecord.product_id,
            type: 0,// integer
            type_name: null,
            price: 0.0, //double
            created_at: saleLogRecord.sale_date,
            last_update: new Date(),
            // source: saleLogRecord.source
            source: "other",
            rwExpire: null,
            expire_unit: null,
            expire_value: null
        }

        if (saleLogRecord.type) {
            item.type = saleLogRecord.type;
        }

        if (!item.product_id) {
            item.product_id = 'unknow';
            item.type = 0;
        }

        async.series({
            findProduct: function (callback) {
                Product.findOne({
                    product_id: item.product_id
                }, function (error, result) {
                    if (error) {
                        callback(error, null);
                    } else {
                        if (result) {
                            item.price = result.price_vn || 0.0;
                            item.expire_unit = result.expire_unit;
                            item.expire_value = result.expire_value;
                            if (result.type) {
                                if (result.type == 2 && result.metadata) {
                                    if (result.metadata.type == 'premium') {
                                        item.type = SUBCRIPTION.PREMIUM;
                                    } else {
                                        //lw
                                        item.type = SUBCRIPTION.LINKED_WALLET;
                                    }
                                    item.type_name = TYPE[item.type.toString()];
                                } else {
                                    item.type = result.type;
                                    item.type_name = TYPE[item.type.toString()];
                                }
                            } else {
                                item.type = 0;
                                item.type_name = TYPE[item.type.toString()];
                            }
                        }
                        callback(null, item);
                    }
                });
            },
            findSourceProduct: function (callback) {
                ItemLog.find({
                    user: saleLogRecord.user,
                    product: saleLogRecord.product_id
                }, function (error, result) {
                    if (error) {
                        callback(error, null);
                    } else {
                        if (result.length > 0) {
                            result.forEach((itemLog) => {
                                item.source = itemLog.source;
                            });
                        }

                        callback(null, item);
                    }
                });
            },
            findRwExpire: function (callback) {
                User.findOne({
                    _id: saleLogRecord.user
                }, function (error, userObject) {
                    if (error) {
                        callback(error, null);
                    } else {
                        if (!userObject) {
                            return callback(null, null);
                        } else {
                            item.rwExpire = userObject.rwExpire;

                            return callback(null, null);
                        }
                    }
                });
            }
        }, function (err) {
            if (err) {
                return reject(err);
            }
            debug(item);
            resovle(item);
        })
    });
}

let publishForUpdate = function (user, callback) {
    generateData(user)
        .then(function (userGeneratedFromDevice) {
            // compare and update
            let userId = userGeneratedFromDevice.id;

            let objectSend = {
                userId: userId,
                updateData: userGeneratedFromDevice
            }

            RawDataProcessWorker.publish(EVENT_PUBLISH_FOR_UPDATE, objectSend, Rabbit.PRIORITY.normal);
            callback();
        }).catch(function (error) {
            // callback();
        });
};

function generateData(item) {
    // console.log(item);
    return new Promise(function (resovle, reject) {
        let _userGenerated = {
            id: item._id,
            register_date: item.createdDate,
            country: null,
            last_sync: item.lastSync || null,
            android: false,
            ios: false,
            web: false,
            winphone: false,
            windows: false,
            premium_status: item.purchased || false,
            premium_date: item.premium_at || null,
            num_wallet: 0,
            deactive_status: item.isDeactivated || false,
            last_update: new Date(),
            utm_source: "",
            utm_medium: "",
            utm_term: "",
            utm_content: "",
            utm_campaign: "",
            rwExpire: item.rwExpire || null,
            tags: item.tags || []
        };

        // resovle(_userGenerated);

        async.parallel({
            getFlatform: function (cb) {
                if (item.tags) {
                    async.each(item.tags, function (tag, next) {
                        let str = tag.split(":");
                        let key = str[0];

                        if (key === TAGS.DEVICE_KEY) {
                            let tagValue = str[1];
                            switch (tagValue) {
                                case TAGS.DEVICE.ANDROID: {
                                    _userGenerated.android = tagValue === TAGS.DEVICE.ANDROID;
                                    break;
                                }
                                case TAGS.DEVICE.IOS: {
                                    _userGenerated.ios = tagValue === TAGS.DEVICE.IOS;
                                    break;
                                }
                                case TAGS.DEVICE.WP: {
                                    _userGenerated.winphone = tagValue === TAGS.DEVICE.WP;
                                    break;
                                }
                                case TAGS.DEVICE.WP: {
                                    _userGenerated.winphone = tagValue === TAGS.DEVICE.WP;
                                    break;
                                }
                                case TAGS.DEVICE.WEB: {
                                    _userGenerated.web = tagValue === TAGS.DEVICE.WEB;
                                    break;
                                }
                                case TAGS.DEVICE.WINDOWS: {
                                    _userGenerated.windows = tagValue === TAGS.DEVICE.WINDOWS;
                                    break;
                                }
                                default:
                                    break;
                            }
                        }

                        if (key === TAGS.COUNTRY_KEY) {
                            let countryValue = str[1];
                            _userGenerated.country = countryValue;
                        }

                        if (key === TAGS.UTM_SOURCE) {
                            let utm_value = str[1];
                            _userGenerated.utm_source = utm_value;
                        }

                        if (key === TAGS.UTM_CAMPAIGN) {
                            let utm_value = str[1];
                            _userGenerated.utm_campaign = utm_value;
                        }

                        if (key === TAGS.UTM_CONTENT) {
                            let utm_value = str[1];
                            _userGenerated.utm_content = utm_value;
                        }

                        if (key === TAGS.UTM_MEDIUM) {
                            let utm_value = str[1];
                            _userGenerated.utm_medium = utm_value;
                        }

                        if (key === TAGS.UTM_TERM) {
                            let utm_value = str[1];
                            _userGenerated.utm_term = utm_value;
                        }
                        next();
                    }, function (error) {
                        cb(null, null);
                    });
                } else {
                    cb(null, null);
                }
            },
            getNumberWallet: function (cb) {
                getWallet(_userGenerated.id, function (error, numberWallet) {
                    if (error) {
                        cb(error, null);
                    } else {
                        _userGenerated.num_wallet = numberWallet;
                        cb(null, null);
                    }
                });
            }
        }, function (error, result) {
            if (error) {
                reject(error);
            } else {
                resovle(_userGenerated);
            }
        });
    });
}


function getWallet(userId, callback) {
    Wallet
        .count({
            "owner": userId
        })
        .lean(true)
        .exec(callback);
}
