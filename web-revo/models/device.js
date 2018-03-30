/**
 * Module dependencies.
 */

'use strict';

var env	= process.env.NODE_ENV || 'production';
var config = require('../config/config')[env];
var mongoose	= require('mongoose');
var mongoosastic = require('mongoosastic');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.Types.ObjectId;
var limitDevice = 3;
var TagConstant = require('../config/tag_constant');

var DeviceSchema = new Schema({
	name: {type: String, trim: true},
	platform: {type: Number, default: 0, require: true, index: true, es_indexed: true},
	version: {type: Number},
	deviceId: {type: String, trim: true, index: true},
	owner: {type: ObjectId, ref: 'User', index: true, es_indexed: true},
	createdDate: {type: Date, default: Date.now, index: true, es_indexed: true},
	updateAt: {type: Date, default: Date.now, index: true, es_indexed: true},
	tokenDevice: {type: String, index: true},
	isDev: {type: Boolean, default: false},
	blockDevice: {type: Boolean, default: false},
	appId: {type: Number, require: true, default: 1, index: true, es_indexed: true},
	isDelete: {type: Boolean, default: false, index: true, es_indexed: true},
	uniqueCode: {type: String, trim: true, index: true, unique: true, es_indexed: true},
	ip: {type: String, trim: true},
	tags: [{type: String, trim: true, lowercase: true, es_indexed: true}]
});

DeviceSchema.index({isDev: 1, owner: 1, deviceId: 1});
DeviceSchema.index({isDev: 1, owner: 1});

DeviceSchema.pre('save', function(next){
	this.updateAt = new Date();
	next();
});

function updateUserDeviceTags(device){
	if (device && device.appId && device.owner) {
		var tag = [];
		switch (device.appId) {
			case 1:
				tag.push(TagConstant.DEVICE_ANDROID);
				break;
			case 2:
				tag.push(TagConstant.DEVICE_IOS);
				break;
			case 3:
				tag.push(TagConstant.DEVICE_IOS);
				break;
			case 4:
				tag.push(TagConstant.DEVICE_WP);
				break;
			case 5:
				tag.push(TagConstant.DEVICE_WINDOWS);
				break;
			case 6:
				tag.push(TagConstant.DEVICE_MAC);
				break;
			case 7:
				tag.push(TagConstant.DEVICE_WEB);
				break;
			case 9:
				tag.push(TagConstant.DEVICE_CONNECT);
				break;
			default :
				break;
		}
		if (tag.length > 0) {
			var User = mongoose.model('User');
			User.updateTags(device.owner, tag, function(e,r){});
		}
	}
}

function pushDeviceWithUniqueCode(deviceSchema, deviceInfo, callback){
	//callback(error, result)
	if (!deviceInfo.uniqueCode) return callback(true);

	deviceSchema.findByUniqueCode(deviceInfo.uniqueCode, function(err, device){
		if (err) callback(err);
		else {
			if (device) {
				editDevice(device, deviceInfo, callback);
			} else {
				addDevice(deviceSchema, deviceInfo, callback);
			}
		}
	});
}

function addDevice(deviceSchema, deviceInfo, callback){
	//callback(error, result)
	var newDevice = new deviceSchema({
		platform: deviceInfo.platform,
		version: deviceInfo.version,
		deviceId: deviceInfo.deviceId,
		appId: deviceInfo.appId
	});

	if (deviceInfo.appId) newDevice.appId = deviceInfo.appId;
	if (deviceInfo.name) newDevice.name = deviceInfo.name;
	if (deviceInfo.uniqueCode) newDevice.uniqueCode = deviceInfo.uniqueCode;

	//init tags
	var tags = [];
	if(deviceInfo.country) tags.push("country:" + deviceInfo.country);
	if(deviceInfo.city) tags.push("city:" + deviceInfo.city);
	if (tags.length > 0) newDevice.tags = tags;

	if(deviceInfo.ip) newDevice.ip = deviceInfo.ip;
	if(deviceInfo.owner) newDevice.owner = deviceInfo.owner;
	if(deviceInfo.tokenDevice) newDevice.tokenDevice = deviceInfo.tokenDevice;

	newDevice.save(function(err, result){
		callback(err, result);
		if (!err && result) updateUserDeviceTags(result);
	});
}

function editDevice(device, deviceInfo, callback){
	//callback(error, result)
	if (deviceInfo.deviceId) device.deviceId = deviceInfo.deviceId;
	if (deviceInfo.name) device.name = deviceInfo.name;
	if (deviceInfo.tokenDevice) device.tokenDevice = deviceInfo.tokenDevice;
	if (deviceInfo.owner) device.owner = deviceInfo.owner;
	if (deviceInfo.appId) device.appId = deviceInfo.appId;
	if (deviceInfo.version) device.version = deviceInfo.version;
	if (deviceInfo.ip) device.ip = deviceInfo.ip;
	device.save(function(err, result){
		callback(err, result);
		if (!err && result) updateUserDeviceTags(result);
	});
}

function pushDeviceWithoutUniqueCode(deviceSchema, deviceInfo, callback){
	//callback(error, device)
	if (!deviceInfo || !deviceInfo.deviceId) return callback(true);

	deviceSchema.findByDeviceId(deviceInfo.deviceId, function(err, device){
		if (err) callback(err);
		else {
			if (device) {
				editDevice(device, deviceInfo, callback);
			} else {
				addDevice(deviceSchema, deviceInfo, callback);
			}
		}
	});
}

function updateDeviceWithOldChannel(deviceSchema, oldChannel, deviceInfo, callback){
	if (!oldChannel || !deviceInfo || !deviceInfo.deviceId) {
		return callback(true);
	}

	deviceSchema.findByDeviceId(oldChannel, function(err, device){
		if (err) callback(err);
		else {
			if (device) {
				editDevice(device, deviceInfo, callback);
			} else {
				addDevice(deviceSchema, deviceInfo, callback);
			}
		}
	});
}

function generateUniqueCode(platform, code){
	var pre = "";
	if(platform === 1) pre = "android";
	else if (platform === 2) pre = "ios";
	else if (platform === 3) pre = "windows";
	else if (platform === 6) pre = "osx";
	else if (platform === 7) pre = "web";

	return pre + "-" + code;
}

function checkLimitDevice(owner, deviceId, cb){
	var User = mongoose.model('User');
	User.getLimitDevice(owner, function(counter){
		limitDevice = counter || limitDevice;

		Device.count({isDev: false, owner: owner, deviceId: {$ne: deviceId}}, function(err, counter){
			if(err) cb(false);
			else cb(counter < limitDevice);
		});
	});
}

DeviceSchema.statics = {
	addNew: function(platform, version, deviceId, userId, tokenDevice, appId, callback, uc){
		var device = new this({
			platform: platform,
			version: version,
			deviceId: deviceId,
			appId: appId
		});
		if(userId) device.owner = userId;
		if(tokenDevice) device.tokenDevice = tokenDevice;
		if(uc) device.uniqueCode = generateUniqueCode(platform, uc);
		device.save(function(err, result){
			if(err || !result) callback(false);
			else {
				callback(true);
				updateUserDeviceTags(result);
			}
		});
	},
	mergeToken: function(deviceInfo, cb, acceptSync){
		if (deviceInfo.uniqueCode && deviceInfo.platform) {
			deviceInfo.uniqueCode = generateUniqueCode(deviceInfo.platform, deviceInfo.uniqueCode);
		}

		let that = this;

		if (!deviceInfo.deviceId) {
			return cb();
		}

		checkLimitDevice(deviceInfo.owner, deviceInfo.deviceId, function(status){
			if(status === false && acceptSync) {
				return cb(null, true);
			}

			pushDeviceWithoutUniqueCode(that, deviceInfo, function(err, device){
				cb(null, false, device);
			});

			// if (deviceInfo.uniqueCode) {
			// 	pushDeviceWithUniqueCode(that, deviceInfo, function(err, device){
			// 		cb(null, false, device);
			// 	});
			// } else {
			// 	pushDeviceWithoutUniqueCode(that, deviceInfo, function(err, device){
			// 		cb(null, false, device);
			// 	});
			// }
		});
	},
	delete: function(deviceId, callback){
		this.findByIdAndRemove(deviceId, function(err){
			callback(!err);
		});
	},

	checkExists: function(deviceId, cb){
		this.findOne({deviceId: deviceId}, function(err, status){
			cb(!status);
		});
	},

	findUser: function(deviceId, cb){
		this.findOne({deviceId: deviceId}, 'owner', function(err, user){
			if(err || !user) cb(false);
			else cb(user.owner);
		});
	},
	finds: function(condition, cb){
		this.find(condition)
			.sort('-updateAt')
			.select('platform deviceId tokenDevice appId')
			.exec(function(err, devices){
				if(err) cb(false);
				else cb(devices);
			});
	},
	findByPlatformAndDev: function(platformId, limit, offset, isDev, cb){
		this.find()
			.where('platform').in(platformId)
			.where('isDev').equals(isDev)
			.sort('-updateAt')
			.limit(limit)
			.skip(offset)
			.exec(function(err, device){
				if(err) cb(false);
				else cb(device);
			});
	},
	findByUser: function(userId, cb){
		this.find({owner: userId})
			.sort('-updateAt')
			.exec(function(err, device){
				if(err || device.length === 0) cb(false);
				else cb(device);
			});
	},
	findByUsers: function(listUser, cb){
		this.find({owner: {$in: listUser}})
			.sort('-updateAt')
			.select('platform deviceId tokenDevice appId')
			.exec(function(err, device){
				if(err || device.length === 0) cb(false);
				else cb(device);
			});
	},
	findByUniqueCode: function(uniqueCode, callback){
		this.findOne({uniqueCode: uniqueCode}, callback);
	},
	findByTokenDevice: function(tokenDevice, callback){
		this.findOne({tokenDevice: tokenDevice}, callback);
	},
	findByDeviceId: function(deviceId, callback){
		this.findOne({deviceId: deviceId}, callback);
	},
	clearDevice: function(listDevice){
		var that = this;

		listDevice.forEach(function(device){
			if(device.status === 2){
				that.checkExists(device.newDevice, function(status){
					if(status){
						that.update({deviceId: device.device}, {$set: {deviceId: device.newDevice}}, function(err, update){

						});
					}
				});
			}
			if(device.status === 3){
				that.remove({deviceId: device.device}, function(err){

				});
			}
		});
	},
	unlinkUser: function(device, cb, sendMSG){
		this.findByIdAndUpdate(device._id, {$set: {owner: null}}, function(err, dv){
			cb(!err, dv);
		});
	},
	pushDevice: function(deviceInfo, callback){
		//callback(status)
		if (!deviceInfo.deviceId) {
			return callback(false);
		}

		let that = this;

		let callbackFunction = function(err, device){
			if (err || !device) {
				callback(false);
			} else {
				callback(true, device);
			}
		};

		if (deviceInfo.uniqueCode && deviceInfo.platform) {
			deviceInfo.uniqueCode = generateUniqueCode(deviceInfo.platform, deviceInfo.uniqueCode);
		}

		if (deviceInfo.oid) {
			updateDeviceWithOldChannel(that, deviceInfo.oid, deviceInfo, callbackFunction);
		} else {
			pushDeviceWithoutUniqueCode(that, deviceInfo, callbackFunction);
			
			// if (deviceInfo.uniqueCode) {
			// 	pushDeviceWithUniqueCode(that, deviceInfo, callbackFunction);
			// } else {
			// 	pushDeviceWithoutUniqueCode(that, deviceInfo, callbackFunction);
			// }
		}
	}
};

DeviceSchema.plugin(mongoosastic, {
	index: env + '_device',
	hosts: [
		config.elasticsearch.hostUrl
	]
});

var Device = mongoose.model('Device', DeviceSchema);
//var stream = Device.synchronize();
//var count = 0;
//
//stream.on('data', function(err, doc){
//	count++;
//	console.log("indexed " + count + " devices");
//});
//stream.on('close', function(){
//	console.log('indexed all device documents!');
//});
//stream.on('error', function(err){
//	console.log(err);
//});
