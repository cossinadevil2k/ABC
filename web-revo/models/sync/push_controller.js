/**
 * Created by cuongpham on 29/02/16.
 */

'use strict';
var env = process.env.NODE_ENV;

var mongoose = require('mongoose');
var Device = mongoose.model('Device');
var Wallet = mongoose.model('Account');
var kue = require('kue');

var config = require('../../config/config')[env];
var Email = require('../email');
var async = require('async');
var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
var redisClient = require('../../config/database').redisClient;
var moment = require('moment');
var elasticsearch = require('elasticsearch');
var elasticClient = new elasticsearch.Client({
    host: config.elasticsearch.hostUrl
});

var Utils = require('../../helper/utils');
var NotificationActions = require('../../config/notification_action_code').NOTIFICATION_ACTION;
var platformCodes = require('../../config/platform_codes').platformCode;
var appIdCodes = require('../../config/platform_codes').appIdCode;
var SyncCodes = require('../../config/sync_codes');
var SyncActions = require('../../config/sync_contant');
var EVENTS = {
    BIZ: 'push_notification',
    TRANSACTION_NOTIFICATION: 'transaction_notification',
    SYSTEM_BACKEND_NOTIFICATION: 'system_backend_notification',
    SYNC: 'sync'
};

var skipGetListUserFlags = [
    SyncCodes.WALLET + SyncActions.FLAG_ADD,
    SyncCodes.BUDGET,
    SyncCodes.CAMPAIGN,
    SyncCodes.SETTING
];

var pushLogIndexName = env + '_notification_error';

//create kue
var queue = kue.createQueue({
    prefix:'q',
    redis:{
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.kueDb,
        options:{}
    }
});

function parseDevice(listDevice, tokenDevice){
    var data = [];

    listDevice.forEach(function(device){
        if (device.tokenDevice != tokenDevice) {
            data.push(device);
        }
    });

    return data;
}

function recordPushFailLog(device, content, event, error) {
    if (!device || !content || !event || !error) {
        return;
    }

    let id = Utils.uid(16);

    let body = {
        device: device,
        content: content,
        event: event,
        error: error,
        date: moment().toISOString()
    };

    return createElasticRecord(pushLogIndexName, event, id, body);
}

function createElasticRecord(indexName, event, id , body){
    if (!indexName || !event || !id || !body){
        return;
    }

    let promise = new Promise(function(resolve, reject){
        elasticClient.create({
            index: indexName,
            type: event,
            id: id,
            body: body
        }, function(err){
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

    return promise;
}

function getListUserWallet(wallet_id){
    let promise = new Promise(function(resolve, reject){
        Wallet.findUser(wallet_id, function(data){
            resolve(data);
        });
    });

    return promise;
}

function findAllDeviceByListUser(list_user, tokenDevice){
    let promise = new Promise(function(resolve, reject){
        Device.findByUsers(list_user, function(devices){
            if (devices) {
                if (tokenDevice) {
                    resolve(parseDevice(devices, tokenDevice));
                } else {
                    resolve(devices);
                }
            } else {
                reject(new Error('GetDeviceListFailed'));
            }
        });
    });

    return promise;
}

function findDeviceByPlatformAndUser(userId, platform, tokenDevice){
    let query = {owner: userId};

    if (platform) {
        query.platform = platform;
    }

    let promise = new Promise(function(resolve, reject){
        Device.find(query, function(err, result){
            if (err) {
                reject(err);
            } else {
                resolve(parseDevice(result, tokenDevice));
            }
        });
    });

    return promise;
}

function findDevice(user_id, skipGetListUser, wallet_id, tokenDevice){
    if (skipGetListUser) {
        return findAllDeviceByListUser([user_id], tokenDevice);
    }

    return getListUserWallet(wallet_id)
    .then(function(listUser){
        return findAllDeviceByListUser(listUser, tokenDevice);
    });
}

function sendToDevice(content, device, event){
    let promise = new Promise(function(resolve, reject){
        queue.createJob(event, {
            device: device,
            content: content
        }).removeOnComplete(true).save();
        
        resolve();
    });

    return promise;

}

function sendToListDevice(content, list_device, event){
    var promise = new Promise(function(resolve, reject){
        async.eachSeries(list_device, function(device, cb){
            sendToDevice(content, device, event)
                .then(function(){
                    cb();
                })
                .catch(function(err){
                    // recordPushFailLog(device, content, event, err);
                    cb();
                });
        }, function(error){
            resolve();
        });
    });

    return promise;
}

function send(content, user_id, skipGetListUser, event, wallet_id, tokenDevice){
    let promise = new Promise(function(resolve, reject){
        findDevice(user_id, skipGetListUser, wallet_id, tokenDevice)
            .then(function(list_device){
                sendToListDevice(content, list_device, event);
            })
            .then(function(){
                resolve();
            })
            .catch(function(error){
                reject(error);
            });
    });

    return promise;
}

var pushTransactionNotification = function(info){
    if (!info || !info.user_id) {
        return 0;
    }

    var text = null;

    if (info.language && info.language === 'vi') {
        text = ' giao dịch mới được cập nhật'
    } else {
        let s = (info.new_transaction_amount > 1)? 's' : '';
        text = ' transaction' + s + ' was updated';
    }

    let content = {
        am: info.new_transaction_amount,
        wl: info.wallet_id,
        m: info.new_transaction_amount + text,
        ac: NotificationActions.TRANSACTION_NOTIFICATION
    };

    let promise = new Promise(function(resolve, reject){
        findDeviceByPlatformAndUser(info.user_id, 2, info.tokenDevice)
            .then(function(deviceList){
                sendToListDevice(content, deviceList, EVENTS.TRANSACTION_NOTIFICATION);
            })
            .then(function(){
                resolve();
            })
            .catch(function(error){
                reject(error);
            });
    });

    return promise;
};

var pushSyncNotification = function(info){
    if (!info || !info.user_id || !info.flag) {
        return;
    }

    let content = {
        f: info.flag
    };

    if (info.flag === SyncCodes.SETTING) {
        content.uuid = info.user_id;
    }

    if (info.wallet_id) {
        content.a = info.wallet_id;
    }

    let skipGetListUser = (skipGetListUserFlags.indexOf(info.flag) !== -1);

    return send(content, info.user_id, skipGetListUser, EVENTS.SYNC, info.wallet_id, info.tokenDevice);
};

var pushShareWallet = function(info){
    if (!info) return;
    if (!info.userId) return;
    if (!info.emailFrom) return;
    if (!info.emailTo) return;
    if (!info.shareCode) return;
    if (!info.walletName) return;

    let content = {
        ac: NotificationActions.SHARED_WALLET_INVITE,
        t: 'Account Share',
        m: '',
        em: info.emailFrom,
        to: info.emailTo,
        sc: info.shareCode,
        wa: info.walletName
    };

    let skipGetListUser = true;

    return send(content, info.userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION);
};

var pushAcceptShareWallet = function(info){
    if (!info) return;
    if (!info.userId || !info.walletName || !info.tokenDevice) return;

    let content = {
        ac: NotificationActions.SHARED_WALLET_ACCEPTED,
        t: 'Account Share',
        wa: info.walletName
    };

    let skipGetListUser = true;

    return send(content, info.userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, info.tokenDevice);
};

var pushWidgetMessage = function(walletId){
    var room = '/wallet/' + walletId;
    io.emit(room, 'PING');
    var keyInfo = 'widget-wallet-' + walletId + '-info',
        keyTransaction = 'widget-wallet-' + walletId + '-transaction';

    redisClient.DEL(keyInfo, keyTransaction, function(err, result){
    });
};

var pushKickDevice = function(device, email){
    if (!device || !email) {
        return;
    }

    let content = {
        ac: NotificationActions.LOG_OUT,
        em: email
    };

    return sendToDevice(content, device, EVENTS.SYSTEM_BACKEND_NOTIFICATION);
};

var pushKickShareWallet = function (info) {
    if (!info || !info.tokenDevice || !info.walletId) {
        return;
    }
    
    let content = {
        ac: NotificationActions.SHARED_WALLET_KICKED,
        a: info.walletId
    };
    
    let skipGetListUser = false;
    
    return send(content, null, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, info.walletId, info.tokenDevice);
};

exports.pushTransactionNotification = pushTransactionNotification;
exports.pushSyncNotification = pushSyncNotification;
exports.pushShareWallet = pushShareWallet;
exports.pushAcceptShareWallet = pushAcceptShareWallet;
exports.pushKickShareWallet = pushKickShareWallet;
exports.pushWidgetMessage = pushWidgetMessage;
exports.pushKickDevice = pushKickDevice;
