/*
	OK
*/

var mongoose = require('mongoose');
process.env.NODE_ENV = 'production';
// var gcm = require('node-gcm');

require('./model/active');
// require('./model/user');
// require('./model/device');
// require('./model/category');
// require('./model/transaction');
require('./model/clientkey');

var env		= process.env.NODE_ENV || 'dev';
var config	= require('./config/config')[env];
var utils	= require('./helper/utils');

// Connect to MongoDB
mongoose.connect(config.db_url);
var db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback () {
	console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

// var getUId = function(users){
// 	var tmpU = [];
// 	users.forEach(function(user){
// 		tmpU.push(user._id);
// 	});
// 	return tmpU;
// };

// var parseCanonical = function(source, data, cb){
// 	var dataLen = data.results.length;
// 	var deviceOld = [];
// 	var updateState = function(deviceo){
// 		--dataLen;

// 		if(deviceo) deviceOld.push(deviceo);

// 		if(dataLen === 0) cb(deviceOld);
// 	};

// 	data.results.forEach(function(device, index){
// 		if(device.registration_id || device.error) updateState(source[index]);
// 		else updateState(false);
// 	});
// };

// var Device = mongoose.model('Device');
// var User = mongoose.model('User');
// var ClientKey = mongoose.model('ClientKey');

// User.find({email: {$in: ['cuongle.kti@gmail.com']}})
// 	.select('_id')
// 	.lean(true)
// 	.exec(function(err, users){

// 		var listId = getUId(users);
		// var limit = 1000;
		// var page = 28; // 27

// for(page; page <= 200; page++){

		// var skiped = (page - 1) * limit;
		// console.log('Page: %d', page);

		// Device.find({owner: {$in: listId}})
		// 	.select('-_id deviceId')
		// 	.sort({'createdDate': 1})
		// 	.limit(1000)
		// 	.skip(0)
		// 	.lean(true)
		// 	.exec(function(err, devices){
		// 		var tmpDevice = [];

		// 		devices.forEach(function(device){
		// 			tmpDevice.push(device.deviceId);
		// 		});
		// 		var sender = new gcm.Sender('AIzaSyBZRMskytU6asBJIy5ULmtOOtmC9Lh48ZY');
		// 		var message = new gcm.Message({
		// 			dryRun: true,
		// 			collapseKey: '1',
		// 			delayWhileIdle: true,
		// 			data: {t: 'NEW Icon Packages: #Brasil2014', m: 'Drop by our Icon Store to see new free icon packages!', ac: 3}
		// 		});
		// 		var registrationIds = tmpDevice;

		// 		console.log(registrationIds);

		// 		if(registrationIds.length > 0){
		// 			sender.send(message, registrationIds, 5, function(err, data){
		// 				console.log(data);
		// 				if(err) console.log("Error: %j", err);
		// 				else {

		// 					console.log('Device: %d', tmpDevice.length);
		// 					console.log("Success: %d", data.success);
		// 					console.log("Failure: %d", data.failure);
		// 					console.log("Canonical_ids: %d", data.canonical_ids);
							// parseCanonical(registrationIds, data, function(data2){
							// 	// data2.forEach(function(deviceId){
							// 		if(data2.length > 0){
							// 			Device.update({deviceId: {$in: data2}}, {$set: {isDelete: true}}, {multi: true}, function(err, numUp){
							// 				console.log('err: %j', err);
							// 				console.log('update: %j', numUp);
							// 			});
							// 		}
							// 	// });
							// });
	// 					}
	// 				});
	// 			} else {
	// 				console.log('Break');
	// 			}
	// 		});
	// });
// }


// Device.count({platform: 1}, function(err, counter){
// 	var getPage = Math.round(counter/1000);
// 	var skip = 0;
// 	var i = 0;
// 	var limit = 1000;
// 	var lenDevice = 0;

// 	for(i; i < 1; i++){
// 		skip = i * limit;
// 		Device.find({platform: 1})
// 			.select('deviceId')
// 			.limit(limit)
// 			.skip(skip)
// 			.sort({'createdDate': 1})
// 			.lean(true)
// 			.exec(function(err, listDevice){
// 				var tmpDevice = [];
// 				listDevice.forEach(function(device){
// 					tmpDevice.push(device.deviceId);
// 				});
// 				var sender = new gcm.Sender('AIzaSyBZRMskytU6asBJIy5ULmtOOtmC9Lh48ZY');
// 				var message = new gcm.Message({
// 					dryRun: true,
// 					delayWhileIdle: true,
// 					data: {},

// 				});
// 				sender.send(message, tmpDevice, 5, function(err, data){
// 					// console.log('%j', data);
// 					console.log('Device: %d', tmpDevice.length);
// 					console.log("Success: %d", data.success);
// 					console.log("Failure: %d", data.failure);
// 					console.log("Canonical_ids: %d", data.canonical_ids);
// 				});
// 			});
// 	}
// });

// console.log('OK');

var Active = mongoose.model('Active');
var i = 0;

for(i; i <= 100; i++){
	var createActiveCode = new Active({
		code: 'anhhangxom-' + utils.uid(5),
		mlEvent: '53cf91700e10f47e0c000007'
	});

	createActiveCode.save(function(err, data){
		// console.log(data.code);
	});
}

// console.log('OK');
// console.log("Another xin chao");

