'use strict';

let mongoose = require('mongoose');
let Device   = mongoose.model('Device');
let User     = mongoose.model('User');
let _        = require('underscore');
let Error    = require('../config/error');
let moment   = require('moment');
let async    = require('async');
let geoip	 = require('geoip-lite');
let PushController = require('../model/sync/push_controller');

function checkServerMaintainLoginRequired(res){
	if (global.isServerMaintain){
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}
}

function checkServerMaintain(res){
	if (global.isServerMaintain){
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}
}

function generateUniqueCode(platform, code){
	let pre = "";
	if(platform === 1) pre = "android";
	else if (platform === 2) pre = "ios";
	else if (platform === 3) pre = "windows";
	else if (platform === 6) pre = "osx";
	else if (platform === 7) pre = "web";

	return pre + "-" + code;
}

let convertDevice = function(listDevice){
	let tmpDevice = [];
	listDevice.forEach(function(device){
		device.createdDate = moment(device.createdDate).format('X');
		device.updateAt = moment(device.updateAt).format('X');
		tmpDevice.push(device);
	});
	return tmpDevice;
};

let vailDevice = function(obj){
	return obj.platform && _.isNumber(obj.platform) && obj.platform > 0 && obj.platform <= 7 &&
		obj.version && _.isNumber(obj.version) &&
		obj.deviceId;
};

let makeItem = function(param){
	let device = {
		platform: param.pl,
		version: param.v || 0,
		deviceId: param.did,
		appId: param.aid
	};

	if (param.na) device.name = param.na;
	if (param.uid) device.owner = param.uid;
	if (param.au) device.tokenDevice = param.au;
	if (param.uc) device.uniqueCode = param.uc;

	return device;
};

let add = function(deviceInfo, callback){
	Device.addNew(deviceInfo.platform, deviceInfo.version, deviceInfo.deviceId, deviceInfo.userId, deviceInfo.tokenDevice, deviceInfo.appId, callback, deviceInfo.uniqueCode);
};

let edit = function(deviceInfo, callback){
	Device.findOne({deviceId: deviceInfo.deviceId}, function(err, device){
		if(device){
			device.appId = deviceInfo.appId;
			device.platform = deviceInfo.platform;
			device.version = deviceInfo.version;
			if(deviceInfo.owner) device.owner = deviceInfo.owner;
			if(deviceInfo.tokenDevice) device.tokenDevice = deviceInfo.tokenDevice;
			device.save(function(err){
				callback(!err);
			});
		} else callback(false);
	});
};

let editWithUniqueCode = function(deviceId, deviceInfo, callback){
	let update = {
		deviceId: deviceInfo.deviceId
	};
	if (deviceInfo.owner) update.ownder = deviceInfo.owner;
	if (deviceInfo.tokenDevice) update.tokenDevice = deviceInfo.tokenDevice;

	Device.findByIdAndUpdate(deviceId, update, function(err, result){
		//console.log(result);
		callback(!err);
	});
};

let appPush = function(req, res){
	checkServerMaintain(res);

	let params = req.body;
	//if ([4, 5].indexOf(params.aid) !== -1) console.log(params);

	if (!params || !params.pl || !params.did || !params.aid) {
		return res.send({status: false, error: Error.PARAM_INVALID});
	}

	let deviceInfo = makeItem(params);

	if (req.tokenDevice) {
		deviceInfo.tokenDevice = req.tokenDevice;
	}

	deviceInfo.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	if (deviceInfo.ip) {
		deviceInfo.ip = deviceInfo.ip.split(',')[0];
	}

	let location = geoip.lookup(deviceInfo.ip);
	if (location) {
		if (location.country) {
			deviceInfo.country = location.country.toLowerCase();
		} else {
			deviceInfo.country = 'n/a';
		}

		if (location.city) {
			deviceInfo.city = location.city.toLowerCase();
		}
	}

	if (!vailDevice(deviceInfo)) {
		return res.send({status: false, m: 'No data'});
	}

	Device.pushDevice(deviceInfo, function(status, device){
		let reply = {status: status};
		if (device) reply.data = device;
		res.send(reply);
	});
};

let appGetDevice = function(req, res){
	checkServerMaintainLoginRequired(res);

	let user_id = req.user_id;
	let body = req.body;

	if(!user_id) res.send({s: false, e: Error.USER_NOT_LOGIN});
	else if(!body || body.okget !== true) res.send({s: false, e: Error.USER_WARNING_INFO});
	else {
		async.parallel({
			getMaxDevice: function(cb){
				User.findById(user_id, '-_id limitDevice', function(err, user){
					if(err || !user) cb(true, null);
					else cb(null, user.limitDevice);
				});
			},
			findDevice: function(cb){
				Device.find({owner: user_id, isDev: false})
				.select('name platform appId version deviceId createdDate updateAt')
				.sort('-updateAt')
				.lean(true)
				.exec(function(err, devices){
					if(err) cb(true, null);
					else cb(null, convertDevice(devices));
				});
			}
		}, function(err, result){
			if(err) res.send({s: false, e: Error.ERROR_SERVER});
			else {
				// console.error({s: true, d: result.findDevice, md: result.getMaxDevice});
				res.send({s: true, d: result.findDevice, md: result.getMaxDevice});
			}
		});
	}
};

let appUnlink = function(req, res){
	checkServerMaintainLoginRequired(res);

	let user_id = req.user_id;
	let body = req.body;

	if (!user_id) {
		return res.send({s: false, e: Error.USER_NOT_LOGIN});
	}

	if (!body || !body.did) {
		return res.send({s: false, e: Error.USER_WARNING_INFO});
	}

	function unlinkDevice(device){
		if (!device || !device.owner || device.owner._id != user_id) {
			return res.send({s: false, e: Error.USER_HAVE_NOT_PERMISSION});
		}

		Device.unlinkUser(device, function (status) {
			let response = {s: status};

			if (!status) {
				response.e = Error.CAN_NOT_CHANGE_DEVICE;
			}

			res.send(response);

			if (status) {
				PushController.pushKickDevice(device, device.owner.email);
			}
		}, true);
	}

	function removeDevices(callback){
		Device.remove({deviceId: body.did}, callback);
	}

	Device.find({deviceId: body.did})
		.populate('owner', 'email')
		.sort('-createdDate')
		.exec(function(err, devices){
			if (err) {
				return res.send({s: false, e: Error.ERROR_SERVER});
			}

			if (devices.length === 0) {
				return res.send({s: true});
			}

			if (devices.length === 1) {
				return unlinkDevice(devices[0]);
			}

			removeDevices((error) => {
				if (error) console.log(error);

				res.send({s: true});
			});
		});

};

let appUpgradeDevice = function(req, res){
	checkServerMaintainLoginRequired(res);

	let postData = req.body;
	let userId = postData.uuid, amountDevice = postData.ad;

	let extendDeviceResult = function(err, result){
		if(err){
			if(result === 'user_not_found')
				res.send({s:false, e: Error.USER_NOT_EXIST});
			else {
				res.send({s: false, e: Error.ERROR_SERVER})
			}
		} else {
			res.send({s:true});
		}
	};

	if(userId && amountDevice && amountDevice > 0){
		User.extendDevice(userId, amountDevice, extendDeviceResult);
	} else {
		res.send({s:false, e: Error.PARAM_INVALID})
	}
};

let appUpdate = function(req, res){
	checkServerMaintain(res);

	let info = req.body;

	if (info.oid && info.nid) {
		Device.findOneAndUpdate({deviceId: info.oid}, {deviceId: info.nid}, function(err, result){
			res.send({status: !err});
		});
	} else {
		res.send({status: false});
	}
};

let appMigrateTokenDevice = function(req, res){
	checkServerMaintain(res);

	let tokenDevice = req.tokenDevice;
	let deviceId = req.body.did;

	if (!tokenDevice) {
		return res.send({s: false, e: Error.USER_NOT_LOGIN});
	}

	if (!deviceId) {
		return res.send({s: false, e: Error.PARAM_INVALID});
	}

	let deviceInfo = {
		deviceId: deviceId,
		tokenDevice: tokenDevice
	};

	Device.pushDevice(deviceInfo, (status) => {
		let response = {s: status};

		if (!status) {
			response.e = Error.ERROR_SERVER;
		}

		res.send(response);
	});
};

module.exports = function(server, config){
	server.post('/device/update', appUpdate);
	server.post('/device/push', appPush);
	server.post('/device/get', appGetDevice);
	server.post('/device/unlink', appUnlink);
	server.post('/device/upgrade-device', appUpgradeDevice);
	server.post('/device/migrate-device', appMigrateTokenDevice);
};
