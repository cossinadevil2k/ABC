process.env.NODE_ENV = 'local';
var express		= require('express'),
    mongoose	= require('mongoose'),
    app			= express(),
    https		= require('https'),
    http		= require('http'),
    env			= process.env.NODE_ENV,
    config		= require('../config/config')[env],
    compression = require('compression'),
    methodOverride 	= require('method-override'),
    bodyParser 	= require('body-parser'),
    logger 		= require('morgan'),
    cookieParser = require('cookie-parser'),
    session 	= require('express-session'),
    helmet      = require('helmet'),
    RedisStore	= require('connect-redis')(session);

var utils		= require(config.root + '/helper/utils');
var projectFolderName = 'helpdesk-app';
var routes_path	= config.root + '/'+ projectFolderName +'/routes';

var connectOptions = {
    server: {
        auto_reconnect: true
    }
};

/****CATCH EXCEPTION*******/
process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err.stack);
});

process.on('exit', function(code){
    console.log('About to exit with code: ' + code);
});

/****IMPORT MODEL**********/
require(config.root + '/model/backend_notification');
require(config.root + '/model/admin');
require(config.root + '/model/device');
require(config.root + '/model/user');
require(config.root + '/model/authkey');
require(config.root + '/model/clientkey');
require(config.root + '/model/account');
require(config.root + '/model/account_share');
require(config.root + '/model/helpdesk_issue_stat');
require(config.root + '/model/helpdesk_performance');
require(config.root + '/model/helpdesk_issue');
require(config.root + '/model/helpdesk_faq');
require(config.root + '/model/helpdesk_faq_section');
require(config.root + '/model/helpdesk_message');

/****Connect to MongoDB*******/
mongoose.connect(config.db_url, connectOptions);
var db = mongoose.connection;

db.on('error', function(err){
    console.log('connection error: ' + err);
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

/****MIDDLEWARES***********/
app.set('views', config.root + '/' + projectFolderName + '/views');
app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.locals = config.site;
app.use(logger('dev'));
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
app.use(express.static(config.root + '/' + projectFolderName + '/public'));

/****IMPORT ROUTER**********/
require(routes_path)(app, config);

/****START APP**************/
http.createServer(app).listen(config.portHelpdesk, function(){
    console.log('['+ env +'] ' + config.app.name + ' Helpdesk-app run on: ' + config.portHelpdesk);
});