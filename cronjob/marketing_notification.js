'use strict';

// const env = 'production';

let env = process.env.NODE_ENV;

const mongoose = require('mongoose');

require('../model/finsify_category_edited_log');
require('../model/statsDaily');
require('../model/account');
require('../model/account_share');
require('../model/budget');
require('../model/campaign');
require('../model/category');
require('../model/device');
require('../model/transaction');
require('../model/transaction_share');
require('../model/user');
require('../model/errorLog');
require('../model/purchasedstat');
require('../model/subscription_log');
require('../model/push_notification_session');
require('../model/device_notification');
require('../model/backend_notification');
require('../model/helpdesk_performance');
require('../model/helpdesk_issue_stat');
require('../model/helpdesk_issue');
require('../model/search_query');
require('../model/messages');

const config	= require('../config/config')[env];
const utils = require('../helper/utils');
let hook = require('../backend/routes/hook');
let CronJob = require('cron').CronJob;
let moment = require('moment');
let async = require('async');
let kue = require('kue');

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err.stack);
});

process.on('exit', function(code){
    console.log('About to exit with code: ' + code);
});

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};
// Connect to MongoDB
mongoose.connect(config.db_url, connectOptions);
let db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});
db.on('reconnected', function(){
    console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.')
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

let PushNotificationSession = mongoose.model('PushNotificationSession');
let BackendNotification = mongoose.model('BackendNotification');
let SearchQuery = mongoose.model('SearchQuery');
let User = mongoose.model('User');
let Device = mongoose.model('Device');
let DeviceNotification = mongoose.model('DeviceNotification');

const EVENT = 'MARKETING_NOTIFICATION';

//create kue with redis
let queue = kue.createQueue({
    prefix: 'q',
    redis: {
        port: config.redis.port,
        host: config.redis.host,
        db: config.redis.kueDb,
        options: {

        }
    }
});

queue.on('error', function(err){
    console.log('Queue error: ', err);
});

queue.process(EVENT, (job, done) => {
    let info = job.data.info;
    let sessionId = job.data.sessionId;
    let notification = job.data.notification;
    // console.log('I HAVE A PEN');
    
    
    pushNotification(sessionId, notification, info, done);
});

function pushNotification(sessionId, notification, info, callback){
    if (!info.schedule_time) {
        return doPush(callback);
    }

    callback();
    
    let cronTime = utils.convertGeneralTimeToCronTime(info.schedule_time);
    let job = new CronJob({
        cronTime: cronTime,
        start: false,
        timeZone: 'Asia/Ho_Chi_Minh',
        onTick: function() {
            doPush((err) => {
                if (!err) {
                    changeSessionStatus(sessionId, 'Accepted');
                    pushScheduleCompleteTransaction(sessionId);
                }

                this.stop();
            });
        }
    });

    job.start();

    function doPush(done) {
        if (info.keyRedis) {
            return pushToStoredDevices(info.keyRedis, done);
        }

        if (info.email_list) {
            return pushToEmailList(info.email_list, done);
        }

        done();
    }

    function pushToEmailList(list, done){
        let devices = [];

        async.eachSeries(list, function(email, cb){
            User.findByEmail(email, function(err, user){
                if (err) return cb(err);
                if (!user) return cb();

                Device.findByUser(user._id, function(result){
                    if (!result) {
                        return cb();
                    }

                    devices = devices.concat(result);
                    cb();
                });
            });
        }, function(error){
            if (error) {
                return done(error);
            }

            if (devices.length === 0) {
                return done();
            }

            sendSingleNotificationByKue(sessionId, notification, devices, done);
        });
    }

    function pushToStoredDevices(keyRedis, done){
        async.waterfall([
            function(cb){
                //get device
                getStoredDevices(keyRedis, function(err, result){
                    if (err) cb(err);
                    else if (!result) cb('no_device');
                    else if (!result.device) cb(null, []);
                    else cb(null, JSON.parse(result.device));
                });
            },
            function(devices, cb){
                if (devices.length === 0) {
                    cb();
                } else {
                    sendSingleNotificationByKue(sessionId, notification, devices, cb);
                }
            }
        ], done);
    }
}

function changeSessionStatus(session_id, status){
    PushNotificationSession.changeStatus(session_id, status, function(){});
}

function pushScheduleCompleteTransaction(session_id) {
    PushNotificationSession.findOne({_id: session_id})
        .populate('notification')
        .exec((err, session) => {
            if (session) {
                let msg = `Schedule of notification "${session.notification.title}" has complete`;

                BackendNotification.addNew(session.approvedBy, 'backend_push', msg, '/messages', function (error, result) {
                    if (result) hook.pushBackendNotification(result._id, function () {
                    });
                });

                if (session.pushBy != session.approvedBy) {
                    BackendNotification.addNew(session.pushBy, 'backend_push', msg, '/messages', function (error, result) {
                        if (result) hook.pushBackendNotification(result._id, function () {
                        });
                    });
                }
            }
        });
}

function sendSingleNotificationByKue(sessionId, notification, deviceIdList, callback){
    if (deviceIdList.length === 0) {
        return callback();
    }

    //mỗi device là một kue job
    async.eachSeries(deviceIdList, function(deviceId, cb) {
        Device.findById(deviceId, (err, device) => {
            if (err) return cb(err);
            if (!device) return cb();

            let job = queue.create('push_notification', {
                session: sessionId,
                notification: notification,
                device: device
            }).priority('high').removeOnComplete(true).save();
            
            job.on('complete', function () {
                //update tracking sent status
                saveUserNotificationTracking(sessionId, device._id, 'sent', function() {});
                cb();
            }).on('failed', function (errorMessage) {
                //update tracking failed status
                saveUserNotificationTracking(sessionId, device._id, 'error', function() {});
                cb();
            });
        });
    }, callback);
}

function saveUserNotificationTracking(sessionId, deviceId, state, callback){
    DeviceNotification.addNew({device: deviceId, session: sessionId, state: state}, callback);
}

function getStoredDevices(keyRedis, callback){
    let redisClient = require('../config/database').redisClient;
    redisClient.HGETALL(keyRedis, callback);
}
