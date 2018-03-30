'use strict';

let mongoose = require('mongoose');
let LogDB = require('../model/helper/mongodb_connect_logs');
let ItemLogModel = LogDB.model('ItemLog');
let ItemModel = mongoose.model('Item');
let UserModel = mongoose.model('User');
let moment = require('moment');
let async = require('async');
let Big = require('big.js');
let ITEM_TYPE_MAP = {};
let ITEM_PRICE_MAP = {};
let countryMap = require('./country_code_map.json');
const TYPE = {
    1: 'Icon',
    2: 'Subscription',
    3: 'Credit',
    5: 'Premium',
    6: 'Semi premium',
    99: 'Other'
};

let prices = {
    //product_id: price
};

const PLATFORM_TO_MARKET = {
    iOS: ['apple_store', 'App Store'],
    Android: ['googleplay', 'Google Play', 'google play'],
    Windows: ['windowsstore']
};

/**FUNCTIONS**/

function findProductAmountByDate(startTime, endTime, callback) {
    let query = {purchased_date: {$gte: startTime._d, $lt: endTime._d}};
    let group = {_id: '$product', amount: {$sum: 1}};

    ItemLogModel.aggregate({$match: query}, {$group: group}, callback);
}

function findProductAmountByProductIdAndDate(productId, startTime, endTime, callback) {
    let query = {
        product: productId,
        purchased_date: {
            $gte: startTime,
            $lt: endTime
        }
    };
    
    ItemLogModel.count(query, callback);
}

function parseItemType(productId, callback) {
    if (ITEM_TYPE_MAP[productId]) return callback(null, ITEM_TYPE_MAP[productId]);

    ItemModel.findByProductId(productId, (err, product) => {
        if (err) return callback(err);

        if (!product) {
            ITEM_TYPE_MAP[productId] = TYPE[1];
            ITEM_PRICE_MAP[productId] = 0.99;
            return callback(null, TYPE[1]);
        }

        ITEM_TYPE_MAP[productId] = TYPE[product.type];
        ITEM_PRICE_MAP[productId] = product.price_gl || 0.99;
        callback(null, TYPE[product.type]);
    });
}

function parseItemPrice(productId, callback) {
    if (ITEM_PRICE_MAP[productId]) return callback(null, ITEM_PRICE_MAP[productId]);

    ItemModel.findByProductId(productId, (err, product) => {
        if (err) return callback(err);

        if (!product) {
            ITEM_TYPE_MAP[productId] = TYPE[1];
            ITEM_PRICE_MAP[productId] = 0.99;
            return callback(null, 0.99);
        }

        ITEM_TYPE_MAP[productId] = TYPE[product.type];
        ITEM_PRICE_MAP[productId] = product.price_gl || 0.99;
        callback(null, product.price_gl || 0.99);
    });
}

function getLogAndGroupByUser(startDate, endDate, callback) {
    let query = {
        purchased_date: {
            $gte: startDate._d,
            $lt: endDate._d
        }
    };

    ItemLogModel.aggregate({
        $match: query
    }, {
        $group: {
            _id: '$user',
            products: {
                $push: '$product'
            }
        }
    }, callback);
}

function convertRecordToMoneyAndCountry(record, callback) {
    UserModel.findById(record._id, (err, user) => {
        if (err) return callback(err);

        let country = null;

        if (!user || !user.tags || user.tags.length === 0) {
            country = 'Other';
        } else {
            user.tags.forEach(tag => {
                if (tag.indexOf('country:') !== -1) {
                    return country = tag.split(':')[1].toUpperCase();
                }
            });

            if (!country) country = 'Other';
        }

        if (!record.products || record.products.length === 0) {
            return callback(null, {country: country, amount: 0});
        }

        let amount = new Big(0);

        async.eachSeries(record.products, (product, done) => {
            ItemModel.findByProductId(product, (err, productInfo) => {
                if (err) return done(err);
                if (!productInfo.price_gl) return done();

                amount = amount.plus(productInfo.price_gl);
                done();
            });
        }, err => {
            callback(err, {country: country, amount: amount.toFixed(2)});
        });
    });
}

/**MAIN**/

/**
 *
 * @param {moment} date Date as moment format
 * @param {function} callback Callback err and result number
 */
let getTurnoverByDate = function(date, callback) {
    let startTime = moment(date).startOf('day');
    let endTime = moment(date).add(1, 'days').startOf('day');

    findProductAmountByDate(startTime, endTime, (err, result) => {
        if (err) return callback(err);
        if (!result || result.length == 0) return callback(null, 0);

        let total = Big(0);

        async.eachSeries(result, (productAmountInfo, done) => {
            if (!productAmountInfo.amount) return done();

            parseItemPrice(productAmountInfo._id, (err, price) => {
                if (err) return done(err);

                total = total.plus(Big(productAmountInfo.amount).times(price));
                done();
            });
        }, err => {
            if (err) return callback(err);
            callback(null, total.toFixed(2));
        });
    });
};

let getTurnoverByDateRange = function(start, end, callback) {
    let startTime = moment(start).startOf('day');
    let endTime = moment(end).add(1, 'days').startOf('day');

    findProductAmountByDate(startTime, endTime, (err, result) => {
        if (err) return callback(err);
        if (!result || result.length == 0) return callback(null, 0);

        let total = Big(0);

        async.eachSeries(result, (productAmountInfo, done) => {
            if (!productAmountInfo.amount) return done();

            parseItemPrice(productAmountInfo._id, (err, price) => {
                if (err) return done(err);

                total = total.plus(Big(productAmountInfo.amount).times(price));
                done();
            });
        }, err => {
            if (err) return callback(err);
            callback(null, total.toFixed(2));
        });
    });
};

/**
 *
 * @param {string} productId Product Id/Alias
 * @param {date} date Date as moment format
 * @param {function} callback Callback returns err and result number
 */
let getTurnoverByProductIdAndDate = function(productId, date, callback) {
    let startTime = moment(date).startOf('day');
    let endTime = moment(date).add(1, 'days').startOf('day');

    findProductAmountByProductIdAndDate(productId, startTime, endTime, (err, amount) => {
        if (err) return callback(err);
        if (!amount) return callback(null, 0);

        parseItemPrice(productId, (err, price) => {
            if (err) return callback(err);

            let total = Big(amount).plus(price);
            return callback(null, total.toFixed(2));
        });
    });
};

let getTurnoverByProductIdAndDateRange = function(productId, start, end, callback) {
    let startTime = moment(start).startOf('day');
    let endTime = moment(end).add(1, 'days').startOf('day');

    findProductAmountByProductIdAndDate(productId, startTime, endTime, (err, amount) => {
        if (err) return callback(err);
        if (!amount) return callback(null, 0);

        parseItemPrice(productId, (err, price) => {
            if (err) return callback(err);

            let total = Big(amount).plus(price);
            return callback(null, total.toFixed(2));
        });
    });
};

/**
 *
 * @param {moment} startDate
 * @param {moment} endDate
 * @param {function} callback
 */
let getAmountGroupByProductId = function(startDate, endDate, callback) {
    findProductAmountByDate(startDate, endDate, (err, result) => {
        if (err) return callback(err);
        if (!result || result.length === 0) return callback(null, []);

        let out = [];

        async.eachSeries(result, (record, done) => {
            parseItemPrice(record._id, (err, price) => {
                if (err) return done(err);

                out.push({_id: record._id, amount: Big(record.amount).times(price).toFixed(2)});
                done();
            });
        }, err => {
            callback(err, out);
        });
    });
};

let getTurnoverGroupByProductType = function(startDate, endDate, callback) {
    let startTime = moment(startDate).startOf('day');
    let endTime = moment(endDate).startOf('day').add(1, 'days');

    let total = {
        Icon: 0,
        Subscription: 0,
        Credit: 0,
        Premium: 0,
        Other: 0
    };

    getAmountGroupByProductId(startTime, endTime, (err, result) => {
        if (err) return callback(err);

        async.eachSeries(result, (record, done) => {
            async.setImmediate(() => {
                parseItemType(record._id, (err, type) => {
                    if (err) return done(err);
                    
                    total[type] = Big(total[type]).plus(record.amount);
                    done();
                });
            });
        }, err => {
            let keys = Object.keys(total);
            keys.forEach(key => {
                total[key] = total[key].toFixed(2);
            });
            callback(err, total);
        });
    });
};

let getTurnoverByMarketAndDateRange = function(market, start, end, callback) {
    let startTime = moment(start).startOf('day');
    let endTime = moment(end).add(1, 'days').startOf('day');
    let query = {
        source: market,
        purchased_date: {
            $gte: startTime,
            $lt: endTime
        }
    };

    let total = new Big(0);

    ItemLogModel.find(query, (err, result) => {
        if (err) return callback(err);
        if (!result || result.length === 0) return callback(null, 0);

        async.eachSeries(result, (record, done) => {
            parseItemPrice(record.product, (err, price) => {
                if (err) return done(err);

                total = total.plus(price);
                done();
            });
        }, err => {
            callback(err, total.toFixed(2));
        });
    });
};

let getIosTurnoverByDateRange = function(start, end, callback) {
    let output = new Big(0);

    async.eachSeries(PLATFORM_TO_MARKET.iOS, (market, done) => {
        getTurnoverByMarketAndDateRange(market, start, end, (err, result) => {
            if (err) return done(err);

            output = output.plus(result);
            done();
        });
    }, err => {
        callback(err, output.toFixed(2));
    });
};

let getAndroidTurnoverByDateRange = function(start, end, callback) {
    let output = new Big(0);

    async.eachSeries(PLATFORM_TO_MARKET.Android, (market, done) => {
        getTurnoverByMarketAndDateRange(market, start, end, (err, result) => {
            if (err) return done(err);

            output = output.plus(result);
            done();
        });
    }, err => {
        callback(err, output.toFixed(2));
    });
};

let getWindowsTurnoverByDateRange = function(start, end, callback) {
    let output = new Big(0);

    async.eachSeries(PLATFORM_TO_MARKET.Windows, (market, done) => {
        getTurnoverByMarketAndDateRange(market, start, end, (err, result) => {
            if (err) return done(err);

            output = output.plus(result);
            done();
        });
    }, err => {
        callback(err, output.toFixed(2));
    });
};

let getTurnoverByCountry = function(startTime, endTime, callback) {
    getLogAndGroupByUser(startTime, endTime, (err, records) => {
        if (err) callback(err);

        let output = {};

        if (!records || records.length === 0) return callback(null, output);

        async.eachSeries(records, (record, cb) => {
            convertRecordToMoneyAndCountry(record, (err, result) => {
                if (err) return cb(err);

                if (!output[result.country]) output[result.country] = 0;
                output[result.country] = Big(output[result.country]).plus(result.amount).toFixed(2);
                cb();
            });
        }, err => {
            callback(err, output);
        });
    });
};

/**EXPORTS**/

exports.getTurnoverByDate = getTurnoverByDate;
exports.getTurnoverByDateRange = getTurnoverByDateRange;
exports.getTurnoverByProductIdAndDate = getTurnoverByProductIdAndDate;
exports.getTurnoverByProductIdAndDateRange = getTurnoverByProductIdAndDateRange;
exports.getAmountGroupByProductId = getAmountGroupByProductId;
exports.getTurnoverGroupByProductType = getTurnoverGroupByProductType;
exports.getTurnoverByMarketAndDateRange = getTurnoverByMarketAndDateRange;
exports.getIosTurnoverByDateRange = getIosTurnoverByDateRange;
exports.getAndroidTurnoverByDateRange = getAndroidTurnoverByDateRange;
exports.getWindowsTurnoverByDateRange = getWindowsTurnoverByDateRange;
exports.getTurnoverByCountry = getTurnoverByCountry;
