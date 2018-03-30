'use strict';

var env = process.env.NODE_ENV;

/********* IMPORT DB SCHEMA **********/
require('../model/provider');
require('../model/partner');
require('../model/loans');

var express         = require('express');
var mongoose        = require('mongoose');
var bodyParser      = require('body-parser');
var config          = require('../config/config')[env];
var app             = express();
var projectFolder   = config.root + '/bankin';
var routes_path     = projectFolder + '/routes';

var connectOptions = {
    server : {
        auto_reconnect: true,
    }
};


/******** CONNECT DB MONGODB ********/
mongoose.connect(config.db_url, connectOptions);
var db = mongoose.connection;

db.on('error', function(err){
    console.log('connection error' + err);
    if (env === 'production') {
        var slackMsg = '@cuong: backend can not connnect to mongodb';
        slackbot.send('#server-status', slackMsg, function(error, response, body){
        });
    }
});
db.once('open', function() {
	console.log('[' + env + '] ' + config.app.name + ' ML Database connection opened.');
});
db.on('reconnected', function(){
	console.log('[' + env + '] ' + config.app.name + ' ML Database connection reconnected.')
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

/****** MIDDLEWARE ******/
app.use(express.static(config.root + '/bankin/public'));
app.set('views', config.root + '/bankin/views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

/***** IMPORT ROUTER *****/
require(routes_path)(app, config);

app.listen(config.portBankin, function () {
  console.log(`Bankin app listening on port ${config.portBankin}!`);
});
