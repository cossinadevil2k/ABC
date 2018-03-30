//process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'dev';

require('../model/account.js')
require('../model/device.js');
require('../model/messages.js');

var mongoose = require('mongoose');
var env		= process.env.NODE_ENV || 'dev';
var config	= require('../config/config')[env];
var CronJob = require('cron').CronJob;
var moment = require('moment');
var pushHook = require('../model/sync/newhook');
var Message = mongoose.model('Message');
var Device = mongoose.model('Device');

// Connect to MongoDB
mongoose.connect(config.db_url);
var db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback () {
	console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

//var Daily = '0 0 7 * * *';
//mỗi ngày check 1 lần vào 7 giờ sáng

var Daily = '0 */1 11 * * *';

var DailyJob = new CronJob({
	cronTime: Daily,
	onTick: function(){
		Message.find({})
        .select('title runDate content action link device')
        .sort('runDate')
        .exec(function(err, messages){
            if(err) {
            	console.log("Can't find messages from database");
            }
            else {
            	messages.forEach(function(mess, index){
            		if(moment(mess.runDate).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')){
            			var platform=[];
            			mess.device.forEach(function(element, index){
            				if(element==='dId_1'){
        						platform.push(1);
            				}
            				if(element==='dId_2'){
            					platform.push(2);
            				}
            				if (element==='dId_3'){
            					platform.push(3);
            				}
            			});

            			Device.findByPlatformAndDev(platform,10, true,function(listDevice){
							var msg = {
								t: mess.title,
								m: mess.content,
								ac: mess.action
							};
							if(mess.link){
								msg.l = mess.link;
							}
							var ph = new pushHook();
							ph.pushd(listDevice, '1', msg);
						});
            		}
            	});
            }
        });
	},
	start: true,
	timeZone: 'Asia/Ho_Chi_Minh'
});

DailyJob.start();