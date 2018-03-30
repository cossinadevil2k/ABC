'use strict';

let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let hook = require('../routes/hook');
let utils = require('../../helper/utils');

let mongoose = require('mongoose');
let async = require('async');
let kue = require('kue');
let CronJob = require('cron').CronJob;

let PushNotificationSession = mongoose.model('PushNotificationSession');
let BackendNotification = mongoose.model('BackendNotification');
let DeviceNotification = mongoose.model('DeviceNotification');
let SearchQuery = mongoose.model('SearchQuery');
let User = mongoose.model('User');
let Device = mongoose.model('Device');

let queue = kue.createQueue({
    prefix:'q',
    redis:{
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.kueDb,
        options:{}
    }
});

function checkPermission(req, res, next){
    // if (req.session.adminSystem) return next();
    // if (req.session.adminName === 'congto') return next();
    
    // res.send({s: false, e: "permission_error"});

    return next();
}

function getStoredDevices(keyRedis, callback){
    let redisClient = require('../../config/database').redisClient;
    redisClient.HGETALL(keyRedis, callback);
}

function saveUserNotificationTracking(sessionId, deviceId, state, callback){
    DeviceNotification.addNew({device: deviceId, session: sessionId, state: state}, callback);
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
            }).removeOnComplete(true).save();
            
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

function pushScheduleCompleteTransaction(session_id){
    PushNotificationSession.findById(session_id)
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

let appGetPending = function (req, res) {
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!limit) return res.send({s: false});

    PushNotificationSession.findPending(skip, limit, function(err, result){
        if (err) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

let appGetAccepted = function(req ,res){
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!limit) return res.send({s: false});

    PushNotificationSession.findAccepted(skip, limit, function(err, result){
        if (err) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

let appGetDenied = function(req, res){
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!limit) return res.send({s: false});

    PushNotificationSession.findDenied(skip, limit, function(err, result){
        if (err) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

let appGetAll = function(req, res){
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!limit) return res.send({s: false});

    PushNotificationSession.findAll(skip, limit, function(err, result){
        if (err) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

let appAccept = function (req, res) {
    let session = req.body.session;
    let adminId = req.session.adminId;

    if (!session) return res.send({s: false});

    PushNotificationSession.acceptSession(session._id, adminId, function(err, result){
        if (err) return res.send({s: false});

        res.send({s: true});

        let session_info = {};

        if (session.searchQuery) {
            SearchQuery.pushCountIncrement(session.searchQuery._id);
            session_info.keyRedis = session.searchQuery.keyRedis;
        }

        if (result.schedule_time) {
            session_info.schedule_time = result.schedule_time;
        }

        if (result.email_list) {
            session_info.email_list = result.email_list;
        }

        
        
        let jobInfo = {
            sessionId: session._id,
            notification: session.notification,
            info: session_info
        };
        
        let job = queue.create('MARKETING_NOTIFICATION', jobInfo).priority('high').removeOnComplete(true).save();
        
        job.on('complete', function () {
            let msg;

            if (!result.schedule_time) {
                msg = 'Push notification "' + session.notification.title + '" completed';

                BackendNotification.addNew(session.pushBy._id, 'backend_push', msg, '/messages', function(error, result){
                    if (result) hook.pushBackendNotification(result._id, function(){});
                });

                if (adminId !== session.pushBy._id) {
                    BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
                        if (result) hook.pushBackendNotification(result._id, function(){});
                    });
                }
            } else {
                msg = 'Push notification "' + session.notification.title + '" scheduled';

                BackendNotification.addNew(session.pushBy._id, 'backend_push', msg, '/messages', function(error, result){
                    if (result) hook.pushBackendNotification(result._id, function(){});
                });

                if (adminId !== session.pushBy._id){
                    BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
                        if (result) hook.pushBackendNotification(result._id, function(){});
                    });
                }
            }
        }).on('failed', function(errorMessage) {
            let msg;

            if (!result.schedule_time) {
                msg = 'Push notification "' + session.notification.title + '" completed';

                BackendNotification.addNew(session.pushBy._id, 'backend_push', msg, '/messages', function(error, result){
                    if (result) hook.pushBackendNotification(result._id, function(){});
                });

                if (adminId !== session.pushBy._id) {
                    BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
                        if (result) hook.pushBackendNotification(result._id, function(){});
                    });
                }
            } else {
                msg = 'Push notification "' + session.notification.title + '" scheduled';

                BackendNotification.addNew(session.pushBy._id, 'backend_push', msg, '/messages', function(error, result){
                    if (result) hook.pushBackendNotification(result._id, function(){});
                });

                if (adminId !== session.pushBy._id){
                    BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
                        if (result) hook.pushBackendNotification(result._id, function(){});
                    });
                }
            }
        });

        // pushNotification(session._id, session.notification, session_info, function (pushNotificationError) {
        //     let msg;
        //
        //     if (!result.schedule_time) {
        //         msg = 'Push notification "' + session.notification.title + '" completed';
        //
        //         BackendNotification.addNew(session.pushBy._id, 'backend_push', msg, '/messages', function(error, result){
        //             if (result) hook.pushBackendNotification(result._id, function(){});
        //         });
        //
        //         if (adminId !== session.pushBy._id) {
        //             BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
        //                 if (result) hook.pushBackendNotification(result._id, function(){});
        //             });
        //         }
        //     } else {
        //         msg = 'Push notification "' + session.notification.title + '" scheduled';
        //
        //         BackendNotification.addNew(session.pushBy._id, 'backend_push', msg, '/messages', function(error, result){
        //             if (result) hook.pushBackendNotification(result._id, function(){});
        //         });
        //
        //         if (adminId !== session.pushBy._id){
        //             BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
        //                 if (result) hook.pushBackendNotification(result._id, function(){});
        //             });
        //         }
        //     }
        // });
    });
};

let appDeny = function (req, res) {
    let session = req.body.session;
    let adminId = req.session.adminId;

    if (!session) return res.send({s: false});

    PushNotificationSession.denySession(session._id, adminId, function(err){
        if (err) res.send({s: false});
        else res.send({s: true});
        BackendNotification.addNew(session.pushBy._id, 'backend_push', 'Push notification "' + session.notification.title + '" has been denied', '/messages', function(error, result){
            if (result) hook.pushBackendNotification(result._id, function(){});
        });
    });
};

let appRemove = function (req, res) {
    let sessionId = req.body.id;

    if (!sessionId) return res.send({s: false});

    PushNotificationSession.findByIdAndRemove(sessionId, function(err){
        if (err) res.send({s: false});
        else res.send({s: true});
    });
};

module.exports = function(app, config){
    app.get('/push-notification-request', staticsMain);
    app.post('/push-notification-request/get-pending', checkPermission, appGetPending);
    app.post('/push-notification-request/get-accepted', checkPermission, appGetAccepted);
    app.post('/push-notification-request/get-denied', checkPermission, appGetDenied);
    app.post('/push-notification-request/get-all', checkPermission, appGetAll);
    app.post('/push-notification-request/accept', checkPermission, appAccept);
    app.post('/push-notification-request/deny', checkPermission, appDeny);
    app.post('/push-notification-request/remove', checkPermission, appRemove);
};
