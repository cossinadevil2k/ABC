/**
 * Created by cuongpham on 20/09/2014.
 * Update to ES6 by cuongpham on 29/01/2016
 */

'use strict';

var env			= process.env.NODE_ENV;
var config		= require('../../config/config')[env];
var ZooAPN		= require('../../helper/newapn');
var gcm			= require('node-gcm');
var wns         = require('wns');
//var Utils		= require('../../helper/utils');
//var Validator	= require('../../helper/validators');
//var Error		= require('../../config/error');
var DeviceNoti	= require('../../config/device.json');
var DeviceNotiDev = require('../../config/device_dev.json');
var mongoose	= require('mongoose');
var Device		= mongoose.model('Device');
var Account		= mongoose.model('Account');
//var Activity    = mongoose.model('Activity');
var async		= require('async');
var redisClient	= require('../../config/database').redisClient;

var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});

var gcmList = [];
var apnsList = [];

console.log("ENV newhook is " + env);

var DeviceList = (env==='production') ? DeviceNoti : DeviceNotiDev;

var initNotify = function(){
    DeviceList.d.forEach(function(device){
        if(device.type === 1) initGCM(device);
        if(device.type === 2) initAPN(device);
        //if(device.type === 6) initAPN(device);
    });
};

var initGCM = function(data){
    gcmList[data.id] = new gcm.Sender(data.gcmId);
};

var initAPN =  function(data){
    apnsList[data.id] = new ZooAPN({
        certFile: config.root + data.certFile,
        keyFile:  config.root + data.keyFile,
        passphrase: data.passphrase
    });
};

if(gcmList.length === 0 || apnsList.length === 0) {
    initNotify();
}

class Push {
    constructor(info) {
        this.__deviceId = null;
        this.__config = config.Notify;
        this.__walletId = null;
        this.__skipGetListUser = false;
        this.__condition = {};
        this.__getAllDevice = false;
        this.__collapseKey = null;
        this.__pushData = null;
        this.__tokenDevice = null;
        this.__eventId = null;

        if(info){
            this.__userId = info.user_id;
            this.__walletId = info.account_id;
            this.__tokenDevice = info.tokenDevice;
        }
    }

    __gcmMessage(){
        var that = this;

        if (that.__walletId) {
            that.__pushData.a = that.__walletId;
        }

        that.__pushData.collapse_key = that.__collapseKey || '0';

        var message = new gcm.Message({
            delayWhileIdle: this.__config.delayWhileIdle,
            data: that.__pushData
        });


        message.collapseKey = that.__collapseKey || '0';

        return message;
    }

    __wnsMessage(){
        var that = this;
        if (that.__walletId) that.__pushData.a = that.__walletId;

        var message = {dataMessage: that.__pushData};

        if(that.__collapseKey == '1'){
            message.type = 1;
        } else {
            message.type = 2;
        }

        return message;
    }

    __sendWNSMessage(appId, channels, cb){
        //cb(error, data)
        if(channels.length === 0) return cb();

        var option = {
            client_id: DeviceList.d[3].client_id,
            client_secret: DeviceList.d[3].client_secret
        };

        var message = JSON.stringify(this.__wnsMessage());

        async.each(channels, function(channel, callback){
            wns.sendRaw(channel, message, option, callback);
        }, cb);
    }

    __sendGCMMessage(appId, registrationIds, cb){
        //cb(error, data)
        if(registrationIds.length == 0)  return cb();

        var message = this.__gcmMessage();

        gcmList[appId].send(message, registrationIds, this.__config.reTries, cb);
    }

    __apnsMessage(){
        var that = this;

        if (that.__walletId) that.__pushData.a = that.__walletId;

        var message = {dataMessage: that.__pushData};

        if(that.__collapseKey == '1' && (that.__pushData.m || that.__pushData.t)){
            message.type = 1;
        } else {
            message.type = 2;
        }

        //var listAc = [6, 10, 12, 13, 16, 17];
        //
        //if (that.__pushData.ac && listAc.indexOf(that.__pushData.ac)) {
        //    var info = {
        //        user: that.__userId,
        //        content: message
        //    };
        //    Activity.addNew(info, function(err, result){
        //
        //    });
        //}

        return message;
    }

    __sendAPNSMessage(appId, deviceTokens, cb){
        //cb(error, data)
        if(deviceTokens.length === 0) return cb();

        var message = this.__apnsMessage();

        apnsList[appId].notify(deviceTokens, message);
        cb();
    }

    __getUser(callback){
        Account.findUser(this.__walletId, callback);
    }

    __getDevice(cb){
        var that = this;
        if(that.__skipGetListUser){
            Device.findByUsers([this.__userId], cb);
        } else if(that.__getAllDevice){
            Device.finds(that.__condition, cb);
        } else {
            that.__getUser(function(listUser){
                if(listUser.length > 0){
                    Device.findByUsers(listUser, cb);
                } else cb(false, 'No user');
            });
        }
    }

    __parseDevice(listDevice, appId){
        var tmpDevice = [];
        var that = this;
        listDevice.forEach(function(device, key){
            if(appId == 7) {
                //web app "device"
                if (device.appId == 7) tmpDevice.push(device.deviceId);
            } else {
                if (device.appId === appId && device.deviceId && device.tokenDevice && device.tokenDevice != that.__tokenDevice) {
                    tmpDevice.push(device.deviceId);
                }
            }
        });
        return tmpDevice;
    }

    __sendWidgetMessage(){
        if(this.__walletId){
            var room = '/wallet/' + this.__walletId;
            io.emit(room, 'PING');
            var keyInfo = 'widget-wallet-' + this.__walletId + '-info',
                keyTransaction = 'widget-wallet-' + this.__walletId + '-transaction';

            redisClient.DEL(keyInfo, keyTransaction, function(err, result){
            });
        }
    }

    __sendWebAppMessage(listDevice){
        var devices = this.__parseDevice(listDevice, 7);
        if(devices.length > 0) {
            var message = this.__wnsMessage();
            devices.forEach(function(room){
                io.emit(room, JSON.stringify(message));
            });
        }
    }

    send(content, skipGetUser, cb, account_id, collapseKey){ // Sync message
        this.__skipGetListUser = skipGetUser || false;
        this.__collapseKey = collapseKey || null;
        this.__pushData = content;
        this.__walletId = account_id || this.__walletId;
        this.__run(cb);
    }

    sharePush(userId, content, cb){
        this.__skipGetListUser = true;
        this.__collapseKey = '1';
        this.__userId = userId;
        this.__pushData = content;
        this.__run(cb);
    }

    notify(conditon, data, cb){
        this.__getAllDevice = true;
        this.__condition = conditon;
        this.__collapseKey = '1';
        this.__pushData = data;
        this.__run(cb);
    }

    pushd(listDevice, key, data, cb){
        this.__collapseKey = key;
        this.__pushData = data;
        this.__send(listDevice, cb);
    }

    __run(cb){
        var that = this;
        that.__getDevice(function(listDevice){
            if(listDevice === false || listDevice.length === 0) cb(false, 'No device');
            else {
                that.__send(listDevice, cb);
            }
        });
    }

    __send(listDevice, cb){
        var that = this;

        // for web applications
        that.__sendWidgetMessage();
        that.__sendWebAppMessage(listDevice);

        async.each(DeviceList.d, function(device, callback){
            var appId = device.id;
            var newListDevice = that.__parseDevice(listDevice, appId);

            switch (device.type) {
                case 1:
                    that.__sendGCMMessage(appId, newListDevice, callback);
                    break;
                case 2:
                    that.__sendAPNSMessage(appId, newListDevice, callback);
                    break;
                case 3:
                    that.__sendWNSMessage(appId, newListDevice, callback);
                    break;
                default:
                    callback();
                    break;
            }
        }, function(error){
            cb(error);
        });
    }
}

module.exports = Push;