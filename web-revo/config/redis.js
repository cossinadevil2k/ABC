/**
 * Redis config
 */

var config = require('./index');
var redis = require('redis'),
    redisClient;

if (config.redis.socket) {
    redisClient = redis.createClient(config.socket);
} else {
    redisClient = redis.createClient(config.redis.port, config.redis.host);
}

redisClient.select(config.redis.db, function () {
    console.log('Redis select: %d.', config.redis.db);
});

redisClient.on('error', function (err) {
    console.log('Redis Error: %s', err);
});

exports.redisClient = redisClient;
