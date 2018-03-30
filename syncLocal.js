"use strict";

var env = 'local';
process.env.NODE_ENV = env;

var restify = require('restify');
var restifyOAuth2 = require('./helper/restify-oauth2');
var mongoose = require('mongoose');


var moneyOauth = require('./helper/money-oauth');


var Slackbot = require('slackbot');
var slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');

var config = require('./config/config')[env];

//var models_path	= config.root + '/model';
var config_path = config.root + '/config';
var routes_path = config.root + '/route';
var myRedisHash = env + '-server-setting';
var redisClient = require(config_path + '/database').redisClient;
var interval = 30; //seconds

var connectOptions = {
	server: {
		auto_reconnect: true
	}
};

/*****CATCH EXCEPTIONS*****/
process.on('uncaughtException', function (err) {
	console.log('Caught exception:: ' + err.stack);
});

process.on('exit', function (code) {
	console.log('About to exit with code: ' + code);
});

/*****IMPORT DB SCHEMAS*****/
require('./model/finsify_category_edited_log');
require('./model/admin');
require('./model/activity');
require('./model/backend_notification');
require('./model/authkey');
require('./model/clientkey');
require('./model/errorLog');
require('./model/device');
require('./model/user');
require('./model/account');
require('./model/account_share');
require('./model/category');
require('./model/budget');
require('./model/campaign');
require('./model/transaction');
require('./model/transaction_share');
require('./model/balance_stats');
require('./model/active');
require('./model/event');
require('./model/invited');
require('./model/redeem');
require('./model/purchasedstat');
require('./model/bankmsg');
require('./model/sponsor');
require('./model/sponsored_subscribe');
require('./model/premiumlog');
require('./model/openedLog');
require('./model/helpdesk_issue_stat');
require('./model/helpdesk_performance');
require('./model/helpdesk_issue');
require('./model/helpdesk_faq');
require('./model/helpdesk_faq_section');
require('./model/helpdesk_message');
require('./model/failed_sync_item');
require('./model/lucky');
require('./model/subscription_log');
require('./model/subscription_code');
require('./model/extend_remote_wallet');
require('./model/device_notification');
require('./model/provider');
require('./model/partner');
require('./model/refresh_token');
require('./model/transaction_report');
require('./model/item');
require('./model/phone_validation_code');
require('./model/use_credit');
require('./model/sale_log');
require('./model/finsify_fetch_log');

/*****REDIS*****/
var getServerSetting = function () {
	redisClient.HGETALL(myRedisHash, function (e, r) {
		global.isServerMaintain = (r.isServerMaintain === 'true');
		if (r.endMaintainTime) global.endMaintainTime = r.endMaintainTime;
	});
};

//check Setting on Redis
redisClient.HKEYS(myRedisHash, function (err, result) {
	if (!err) {
		if (result.length === 0 || !result) {
			config.serverDefaultSetting.forEach(function (setting) {
				redisClient.HSET(myRedisHash, setting.key, setting.value);
			});
		} else {
			//load setting
			getServerSetting();
		}
	}
});
//redisClient.HDEL(myRedisHash, 'isServerMaintain');

setInterval(function () {
	getServerSetting();
}, interval * 1000);


/*****MONGODB CONNECT*****/
mongoose.connect(config.db_url, connectOptions);
var db = mongoose.connection;

//db.on('error', console.error.bind(console, 'connection error:'));
db.on('error', function (err) {
	console.log('connection error: ' + err);
	if (env == 'production') {
		var slackMsg = "@cuong: Server Sync can't connect to mongodb!";
		slackbot.send('#server-status', slackMsg, function (error, response, body) {

		});
	}
});
db.on('open', function () {
	console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});
db.on('reconnected', function () {
	console.log('[' + env + '] ' + config.app.name + ' Sync Database connection reconnected.')
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

/*****RUN APP*****/
var server = restify.createServer({
	name: config.app.name,
	version: config.version,
	formatters: {
		'application/hal+json': function (req, res, body, cb) {
			if (Buffer.isBuffer(body)) {
				return cb(null, body.toString('base64'));
			}

			return cb(null, JSON.stringify(body));
		}
	}
});

/*****MIDDLEWARE*****/
var hooks = require('./config/hook');

server.use(function (req, res, next) {
	if (req.headers.apiversion == 4) {
		console.log(req.headers);
	}

	if (global.isServerMaintain) {
		var rs = {};
		if (req.user_id) {
			rs = {s: false, e: 404};
			if (global.endMaintainTime) rs.t = global.endMaintainTime;
		} else {
			rs = {status: false, message: 404};
			if (global.endMaintainTime) rs.time = global.endMaintainTime;
		}
		res.send(rs);
	} else {
		next();
	}
});

server.use(restify.authorizationParser());
server.use(restify.queryParser());
server.use(restify.bodyParser({
	mapParams: false,
	maxBodySize: 2097152
}));


server.use(restify.jsonp());
server.use(restify.gzipResponse());


// Valid auth
server.use(function (req, res, next) {
	if (req.headers['apiversion'] == 4) {
		moneyOauth({
			clientName: 'client',
			authorization: 'Bearer',
			secret: '76e21440-aa7f-47e3-9250-6b1ca0bb8e0d'
		})(req, res, next);
	} else {
		next();
	}
});

server.use(hooks.validatePostData);

restifyOAuth2.ropc(server, {
	tokenEndpoint: '/token',
	hooks: hooks
});

server.on("uncaughtException", function (req, res, route, error) {
	console.log('Caught exception: ' + error.stack);
});

server.listen(config.port, function () {
	console.log('[' + env + '] ' + config.app.name + ' Sync run on: ' + config.port);
});

/*****IMPORT ROUTER*****/
require(routes_path + '/route')(server, config);