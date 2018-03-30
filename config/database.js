/*
	Database init
*/

'use strict';

let env		= process.env.NODE_ENV;
let config	= require('./config')[env];
let redis	= require('redis');
let redisClient = redis.createClient(config.redis.port, config.redis.host);

redisClient.select(config.redis.db, function() {
	console.log('['+ env +'] ' + config.app.name + ' redis host: ' + config.redis.host);
	console.log('['+ env +'] ' + config.app.name + ' redis select DB: ' + config.redis.db);
});

redisClient.on("error", function(err) {
	console.log("Error " + err);
});

exports.redisClient = redisClient;