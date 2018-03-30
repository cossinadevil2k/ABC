'use strict';

var env = process.env.NODE_ENV;

/*****IMPORT DB SCHEMAS*****/
require('../model/provider');
require('../model/promotion');
require('../model/category_promotion');
require('../model/partner');

var express         =   require('express');
var mongoose        =   require('mongoose');
var bodyParser 	    =   require('body-parser');
var	config 			=   require('../config/config')[env];
var app             =   express();
var projectFolder   =   config.root + '/promotion-app';
var routes_path	    =   projectFolder + '/routes';

var connectOptions = {
	server: {
		auto_reconnect: true
	}
};


/*****MONGODB CONNECT*****/
mongoose.connect(config.db_url, connectOptions);
var db = mongoose.connection;

db.on('error', function(err){
    console.log('connection error: ' + err);
    if(env === 'production'){
        var slackMsg = "@cuong: Backend can't connect to mongodb!";
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

/*****MIDDLEWARE*****/
app.use(express.static(config.root + '/promotion-app/public'));
app.set('views', config.root + '/promotion-app/views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

/*****IMPORT ROUTER*****/
require(routes_path)(app, config);

app.listen(config.portPromote, function () {
  console.log(`Promotion app listening on port ${config.portPromote}!`);
});
