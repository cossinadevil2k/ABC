'use strict';

let env = 'local';
process.env.NODE_ENV = env;

/*****IMPORT DB SCHEMAS*****/
require('../model/sale_log');
require('../model/finsify_category_edited_log');
require('../model/activity');
require('../model/backend_notification');
require('../model/admin');
require('../model/device');
require('../model/user');
require('../model/authkey');
require('../model/clientkey');
require('../model/account');
require('../model/account_share');
require('../model/category');
require('../model/budget');
require('../model/campaign');
require('../model/transaction');
require('../model/balance_stats');
require('../model/event');
require('../model/active');
require('../model/adminLog');
require('../model/messages');
require('../model/invited');
require('../model/maildata');
require('../model/statsDaily');
require('../model/purchasedstat');
require('../model/redeem');
require('../model/bankmsg');
require('../model/errorLog');
require('../model/category_promotion');
require('../model/sponsor');
require('../model/sponsored_subscribe');
require('../model/premiumlog');
require('../model/openedLog');
require('../model/helpdesk_issue_stat');
require('../model/helpdesk_performance');
require('../model/helpdesk_issue');
require('../model/helpdesk_faq');
require('../model/helpdesk_faq_section');
require('../model/helpdesk_message');
require('../model/failed_sync_item');
require('../model/lucky');
require('../model/subscription_log');
require('../model/subscription_code');
require('../model/coupon');
require('../model/provider');
require('../model/partner');
require('../model/extend_remote_wallet');
require('../model/device_notification');
require('../model/search_query');
require('../model/push_notification_session');
require('../model/milestone');
require('../model/item');
require('../model/receipt');
require('../model/use_credit');
require('../model/item_log');
require('../model/sync_error_log');
require('../model/auto_email');
require('../model/register_devML');
require('../model/helpDeskDailyResolve');
require('../model/helpdesk_daily_static');
require('../model/automation_log');
require('../model/finsify_hook_log');
require('../model/subscription_renew_log');
require('../model/campaign_marketing');
require('../model/group');
require('../model/auto_campaign_group');
require('../model/landing_static')

let express			= require('express');
let mongoose 		= require('mongoose');
mongoose.Promise = global.Promise;
let app 			= express();
let https 			= require('https');
let	http 			= require('http');
let	config 			= require('../config/config')[env];
let compression 	= require('compression');
let methodOverride 	= require('method-override');
let bodyParser 		= require('body-parser');
let logger 			= require('morgan');
let cookieParser 	= require('cookie-parser');
let session 		= require('express-session');
//let csrf 			= require('csurf');
let helmet			= require('helmet');
let RedisStore		= require('connect-redis')(session);

let Slackbot 		= require('slackbot');
let slackbot 		= new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');
let hooks			= require(config.root + '/config/hook');
let utils			= require(config.root + '/helper/utils');
//let models_path	= config.root + '/model';
//let config_path	= config.root + '/config';
let routes_path		= config.root + '/backend/routes';
let backendHook 	= require('./hooks');

let connectOptions = {
	server: {
		auto_reconnect: true
	}
};

/*****CATCH EXCEPTIONS*****/
process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err.stack);
});

process.on('exit', function(code){
	console.log('About to exit with code: ' + code);
});

/*****MONGODB CONNECT*****/
mongoose.connect(config.db_url, connectOptions);
let db = mongoose.connection;

//db.on('error', console.error.bind(console, 'connection error:'));
db.on('error', function(err){
    console.log('connection error: ' + err);
    if(env === 'production'){
        let slackMsg = "@cuong: Backend can't connect to mongodb!";
        slackbot.send('#server-status', slackMsg, function(error, response, body){
        });
    }
});
db.once('open', function() {
	console.log('[' + env + '] ' + config.app.name + ' Backend Database connection opened.');
});
db.on('reconnected', function(){
	console.log('[' + env + '] ' + config.app.name + ' Backend Database connection reconnected.')
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

/*****MIDDLEWARE*****/
app.set('views', config.root + '/backend/views');
app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.locals = config.site;
// if (env != 'production') app.use(logger('dev'));
//allow cross origin
app.use(require('cors')());
app.use(helmet());
app.use(compression());
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser(config.secret));
app.use(session({
	key: '_id',
	name: 'sessionId',
	store: new RedisStore({host: config.redis.host, port: config.redis.port}),
	secret: config.secret,
	resave: false,
	saveUninitialized: false
}));
app.use(backendHook.authenticate);
//app.use(csrf());
app.use(hooks.validatePostData);
//app.use(hooks.validateCSRF);
app.use(express.static(config.root + '/backend/public'));
app.use(hooks.cleanError);
// app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

/*****IMPORT ROUTER*****/
require(routes_path)(app, config);

/*****RUN APP*****/
http.createServer(app).listen(config.portAdmin, function(){
	console.log('['+ env +'] ' + config.app.name + ' Backend run on: ' + config.portAdmin);
});
