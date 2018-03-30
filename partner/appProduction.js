'use strict';

var env = 'production';
process.env.NODE_ENV = env;

/*****IMPORT DB SCHEMAS*****/
require('../model/partner_notification');
require('../model/user');
require('../model/account');
require('../model/account_share');
require('../model/category');
require('../model/campaign');
require('../model/transaction');
require('../model/sponsor');
require('../model/provider');
require('../model/partner');
require('../model/push_notification_session');
require('../model/clientkey');
require('../model/device');
require('../model/promotion');
require('../model/category_promotion');
require('../model/loans');

var express			= require('express');
var mongoose 		= require('mongoose');
var app 			= express();
var https 			= require('https');
var	http 			= require('http');
var	config 			= require('../config/config')[env];
var compression 	= require('compression');
var methodOverride 	= require('method-override');
var bodyParser 		= require('body-parser');
var logger 			= require('morgan');
var cookieParser 	= require('cookie-parser');
var session 		= require('express-session');
//var csrf 			= require('csurf');
var helmet			= require('helmet');
var RedisStore		= require('connect-redis')(session);

var Slackbot 		= require('slackbot');
var slackbot 		= new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');
var hooks			= require(config.root + '/config/hook');
var utils			= require(config.root + '/helper/utils');
//var models_path	= config.root + '/model';
//var config_path	= config.root + '/config';
var backendHook 	= require('./hooks');

var projectFolder = config.root + '/partner';

var routes_path	= projectFolder + '/routes';

var connectOptions = {
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
var db = mongoose.connection;

//db.on('error', console.error.bind(console, 'connection error:'));
db.on('error', function(err){
    console.log('connection error: ' + err);
    if(env === 'production'){
        var slackMsg = "@cuong: Backend can't connect to mongodb!";
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
app.set('views', projectFolder + '/views');
app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.locals = config.site;
if (env != 'production') app.use(logger('dev'));
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
app.use(express.static(projectFolder + '/public'));
app.use(hooks.cleanError);
// app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

/*****IMPORT ROUTER*****/
require(routes_path)(app, config);

/*****RUN APP*****/
http.createServer(app).listen(config.portPartner, function(){
    console.log('['+ env +'] ' + config.app.name + ' Partner App run on: ' + config.portPartner);
});
