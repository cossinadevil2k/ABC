/*
	Cronjob
	Stat daily
 */

process.env.NODE_ENV = 'production';
var mongoose = require('mongoose');
var env		= process.env.NODE_ENV || 'dev';
var config	= require('../config/config')[env];
var CronJob = require('cron').CronJob;
var moment = require('moment');


require('../model/device');

// Connect to MongoDB
mongoose.connect(config.db_url);
var db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback () {
	console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});


var Device = mongoose.model('Device');
var Daily = '0 0 0 * * *';

var DailyJob = new CronJob({
	cronTime: Daily,
	onTick: function(){

	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

DailyJob.start();