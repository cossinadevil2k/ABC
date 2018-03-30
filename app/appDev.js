'use strict';

var env = 'dev';
process.env.NODE_ENV = env;

var express			= require('express');
var	mongoose		= require('mongoose');
var	app				= express();
var	https			= require('https');
var	http			= require('http');
var	config			= require('../config/config')[env];
var compression 	= require('compression');
var methodOverride 	= require('method-override');
var bodyParser 		= require('body-parser');
var logger 			= require('morgan');
var cookieParser 	= require('cookie-parser');
var session 		= require('express-session');
//var csrf 			= require('csurf');
var helmet			= require('helmet');
var RedisStore		= require('connect-redis')(session);
var	projectFolder 	= 'app';

var Slackbot = require('slackbot');
var slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');

process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err.stack);
});

process.on('exit', function(code){
	console.log('About to exit with code: ' + code);
});
require(config.root + '/model/sale_log');
require(config.root + '/model/activity');
require(config.root + '/model/user');
require(config.root + '/model/authkey');
require(config.root + '/model/clientkey');
require(config.root + '/model/errorLog');
require(config.root + '/model/account');
require(config.root + '/model/account_share');
require(config.root + '/model/category');
require(config.root + '/model/budget');
require(config.root + '/model/campaign');
require(config.root + '/model/transaction');
require(config.root + '/model/transaction_share');
require(config.root + '/model/balance_stats');
require(config.root + '/model/event');
require(config.root + '/model/active');
require(config.root + '/model/device');
require(config.root + '/model/invited');
require(config.root + '/model/failed_sync_item');

var hooks		= require(config.root + '/config/hook');
var utils		= require(config.root + '/helper/utils');
//var models_path	= config.root + '/model';
var config_path	= config.root + '/config';
var routes_path	= config.root + '/' + projectFolder + '/routes';
var myRedisHash = env + '-server-setting';
var redisClient = require(config_path + '/database').redisClient;

var interval = 30; //seconds

var getServerSetting = function(){
	redisClient.HGETALL(myRedisHash, function(e, r){
		global.isServerMaintain = (r.isServerMaintain === 'true');
	});
};

setInterval(function(){
	getServerSetting();
}, interval * 1000);

var connectOptions = {
	server: {
		auto_reconnect: true
	}
};
// Connect to MongoDB
mongoose.connect(config.db_url, connectOptions);
var db = mongoose.connection;

//db.on('error', console.error.bind(console, 'connection error:'));
db.on('error', function(err){
	console.log('connection error: ' + err);
	if(env == 'production'){
		var slackMsg = "@cuong: Old-app can't connect to mongodb!";
		slackbot.send('#server-status', slackMsg, function(error, response, body){

		});
	}

});
db.once('open', function callback () {
	console.log('[' + env + '] ' + config.app.name + ' Old-App Database connection opened.');
});
db.on('reconnected', function(){
	console.log('[' + env + '] ' + config.app.name + ' Old-App Database connection reconnected.')
});
db.on('disconnected', function(){
	console.log('Money DB DISCONNECTED');
});

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function(){
	db.close(function(){
		console.log('Mongoose default connection disconnected through app termination');
		process.exit(0);
	});
});

app.set('views', config.root + '/'+ projectFolder +'/views');
app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.locals = config.site;
app.use(logger(env));
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride());
app.use(cookieParser(config.secret));
app.use(session({
	key: '_id',
	name: 'sessionId',
	store: new RedisStore({host: config.redis.host, port: config.redis.port}),
	secret: config.secret,
	resave: false,
	saveUninitialized: false
}));
//app.use(express.csrf());
app.use(hooks.validatePostData);
//app.use(hooks.validateCSRF);
app.use(hooks.loginChecker);
app.use(hooks.cleanError);
require(routes_path)(app, config);
app.use(express.static(config.root + '/' + projectFolder + '/public'));

app.use(function(req, res, next){
	if (global.isServerMaintain) {
		res.send("Server is under maintain");
	} else {
		next();
	}
});

http.createServer(app).listen(config.portApp, function(){
	console.log('['+ env +'] ' + config.app.name + ' App run on: ' + config.portApp);
	console.log('db_url: ' + config.db_url);
});