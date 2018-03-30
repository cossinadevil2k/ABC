var env = 'local';
process.env.NODE_ENV = env;

var express     = require('express'),
    mongoose    = require('mongoose'),
    app         = express(),
    path        = require('path'),
    favicon     = require('serve-favicon'),
    logger      = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser  = require('body-parser'),
    methodOverride = require('method-override'),
    session     = require('express-session'),
    compress    = require('compression'),
    helmet     = require('helmet'),
    http        = require('http'),
    https       = require('https'),
    config	    = require('../config/config')[env],
    RedisStore	= require('connect-redis')(session),
    projectFolder = 'new-app';

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err.stack);
});

process.on('exit', function(code){
    console.log('About to exit with code: ' + code);
});

require(config.root + '/model/activity');
require(config.root + '/model/authkey');
require(config.root + '/model/clientkey');
require(config.root + '/model/errorLog');
require(config.root + '/model/user');
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

var connectOptions = {
    server: {
        auto_reconnect: true
    }
};
// Connect to MongoDB
mongoose.connect(config.db_url, connectOptions);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.appBeta.name + ' New-App Database connection opened.');
});
db.on('reconnected', function(){
    console.log('[' + env + '] ' + config.appBeta.name + ' New-App Database connection reconnected.')
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

// view engine setup
app.set('views', config.root + '/'+ projectFolder +'/views');
app.enable('trust proxy');
app.disable('view cache');
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.locals = config.site;
app.use(favicon(__dirname + '/public/favicon.ico'));
if (env != 'production') app.use(logger('dev'));
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride());
app.use(cookieParser(config.secret));
app.use(session({
    key:'_id',
    name: 'sessionId',
    store: new RedisStore({host:config.redis.host, port:config.redis.port}),
    secret:config.secret,
    resave: false,
    saveUninitialized: false
}));
//app.use(csrf());
app.use(hooks.validatePostData);
//app.use(hooks.validateCSRF);
app.use(hooks.loginChecker);
app.use(hooks.cleanError);
app.use(compress());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/browser-not-support', function(req, res){
    res.render('not-support', { title: 'Browser Not Support' })
});

require('./routes')(app);
console.log(path.join(__dirname, 'public'));


/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});



//app.listen(8002);
http.createServer(app).listen(config.betaAppPort, function(){
    console.log('['+ env +'] ' + config.app.name + ' App run on: ' + config.betaAppPort);
    console.log('db_url: ' + config.db_url)
});

//module.exports = app;