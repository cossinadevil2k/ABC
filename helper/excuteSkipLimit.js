
'use strict';

// /* import lib redis */
const redisClient = require('../config/database.js').redisClient;
const redisUtils = require('../config/utils.js');
const async = require('async');


const SKIP = 0;
const LIMIT = 10000;

function init(redisKey, callback) {
    let redisValue = {
        skip: SKIP,
        limit: LIMIT
    }

    getSkipLimit(redisClient, redisKey, function (err, result) {
        if (err) {
            return callback(err, null);
        } else {
            if (result && result.init) {
                return callback(null, null);
            }

            redisUtils.cacheResult(redisClient, redisKey, JSON.stringify(redisValue), callback);
        }
    });
}

function getSkipLimit(redisClient, redisKey, callback) {
    let skipLimit = {};
    redisUtils.getCache(redisClient, redisKey, function (err, result) {
        if (err) {
            return callback(err, null);
        } else {
            if (result && result.length > 0) {
                result = JSON.parse(result[0]);
                // console.log('rrr 0', result);
                skipLimit.limit = result.limit;
                skipLimit.skip = result.skip;
                skipLimit.init = false;
            } else {
                skipLimit.limit = SKIP;
                skipLimit.skip = LIMIT;
                skipLimit.init = true;
            }
            // console.log('skipLimit ', skipLimit);
            return callback(null, skipLimit);

        }
    });
}

function excuteSkipLimit(redisKey, callback) {

    let redisValue = {};

    getSkipLimit(redisClient, redisKey, function (err, result) {
        if (err) {
            return callback(err, null);
        } else {
            if (result.init) {
                return callback('logic-error', null);
            } else {
                redisValue.skip = result.skip + LIMIT;
                redisValue.limit = LIMIT;
                redisUtils.cacheResult(redisClient, redisKey, JSON.stringify(redisValue), function () { });
                return callback(null, redisValue);
            }
        }
    });
}

function mainFunc(redisKey, cb) {
    let __skip;
    let __limit;
    async.series({
        initKey: function (callback) {
            init(redisKey, callback);
        },
        getSkipLimitFunc: function (callback) {
            getSkipLimit(redisClient, redisKey, callback);
        },
        excuteSkipLimitFunc: function (callback) {
            excuteSkipLimit(redisKey, callback);
        }
    }, function (err, result) {
        if (!err) {
            __skip = result.excuteSkipLimitFunc.skip;
            __limit = result.excuteSkipLimitFunc.limit;

            cb(null, __skip, __limit);
        } else {
            cb(null, null, null);
        }
    });
}

module.exports.excuteSkipLimit = mainFunc;