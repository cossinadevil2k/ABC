'use strict';

let env = 'dev';

process.env.NODE_ENV = env;
let express = require('express');
let mongoose = require('mongoose');
let http = require('http');
let compression = require('compression');
let methodOverride 	= require('method-override');
let bodyParser 		= require('body-parser');
let cookieParser 	= require('cookie-parser');
global.CONFIG = require('../config/config')[env];

let app = express();

//let hooks		= require(config.root + '/config/hook');
let routes_path	= global.CONFIG.root + '/finsify_hook_service/routes';

/**
 * EXCEPTION HANDLE
 * **/

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err.stack);
});

process.on('exit', function(code){
    console.log('About to exit with code: ' + code);
});

/**
 * MONGO DB
 * **/

require(global.CONFIG.root + '/model/finsify_category_edited_log');
require(global.CONFIG.root + '/model/finsify_fetch_log');
require(global.CONFIG.root + '/model/finsify_hook_log');
require(global.CONFIG.root + '/model/account');
require(global.CONFIG.root + '/model/activity');
require(global.CONFIG.root + '/model/category');
require(global.CONFIG.root + '/model/campaign');
require(global.CONFIG.root + '/model/transaction');
require(global.CONFIG.root + '/model/device');
require(global.CONFIG.root + '/model/user');

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};

mongoose.connect(global.CONFIG.db_url, connectOptions);
let db = mongoose.connection;

//db.on('error', console.error.bind(console, 'connection error:'));
db.on('error', function(err){
    console.log('connection error: ' + err);
});
db.once('open', function() {
    console.log('[' + env + '] ' + global.CONFIG.app.name + ' Backend Database connection opened.');
});
db.on('reconnected', function(){
    console.log('[' + env + '] ' + global.CONFIG.app.name + ' Backend Database connection reconnected.')
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

/**
 * SERVER CONFIG
 * **/

app.enable('trust proxy');
app.disable('x-powered-by');
app.use(compression());
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser(global.CONFIG.secret));
//app.use(express.csrf());
//app.use(hooks.validatePostData);
//app.use(hooks.validateCSRF);

require('./queueHandler');
require(routes_path)(app);

/**RUN SERVER**/
http.createServer(app).listen(global.CONFIG.portFinsifyHook, function(){
    console.log('['+ env +'] Finsify hook service runs on port ' + global.CONFIG.portFinsifyHook);
});