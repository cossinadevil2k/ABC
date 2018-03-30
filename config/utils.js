/*
 Redis function worker
 */

'use strict';

let env = process.env.NODE_ENV;
let config = require('./config')[env];

/* SET */
module.exports.cacheResult = function (redisClient, key, value, callback) {
    redisClient.SADD(key, value, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
};

module.exports.removeMember = function (redisClient, key, value, callback) {
    redisClient.SREM(key, value, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
};

module.exports.checkExits = function (redisClient, key, value, callback) {
    redisClient.SISMEMBER(key, value, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply); // 1 : exits , 0 : not exits
        }
    });
};

module.exports.getCache = function (redisClient, key, callback) {
    redisClient.SMEMBERS(key, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
};

module.exports.popMember = function (redisClient, key, len, callback) {
    redisClient.SPOP(key, len, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
};

/* STRING */

module.exports.SetResultTypeString = function (redisClient, key, value, callback) {
    redisClient.SET(key, value, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
};


module.exports.GetResultTypeString = function (redisClient, key, callback) {
    redisClient.GET(key, function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
};


module.exports.CachingWithTTL = function (redisClient, key, value, callback) {
    redisClient.SETEX(key, 120, JSON.stringify(value), function (error, reply) {
        if (error) {
            if (typeof callback === 'function') return callback(JSON.stringify(error), null);
        } else {
            if (typeof callback === 'function') return callback(null, reply);
        }
    });
}
