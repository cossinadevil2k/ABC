/*
 Message
 */

'use strict';

let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let mongoose = require('mongoose');
let kue = require('kue');
let async = require('async');
let CronJob = require('cron').CronJob;
let utils = require('../../helper/utils');

let Messages = mongoose.model('Message');
let Admin = mongoose.model('Administrator');
let Device = mongoose.model('Device');
let User = mongoose.model('User');
let DeviceNotification = mongoose.model('DeviceNotification');
let BackendNotification = mongoose.model('BackendNotification');
let PushNotificationSession = mongoose.model('PushNotificationSession');
let SearchQuery = mongoose.model('SearchQuery');
//let pushHook = require('../../model/sync/hook');
let pushHook = require('../../model/sync/newhook');
let hook = require('../routes/hook');

let maxDevicePushWithoutApproval = config.maxPushDeviceWithoutApproval;

const REGEX = /^[^ -]+$/g;

//create queue instance
let queue = kue.createQueue({
    prefix: 'q',
    redis: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.kueDb,
        options: {}
    }
});

function editMessage(id, data, cb) {
    let editedData = {
        title: data.t,
        content: data.m,
        lastEditBy: data.editBy,
        runDate: data.rd,
        action: data.ac,
        device: data.dv,
        option: {}
    };
    if (data.l) {
        editedData.link = data.l;
    }
    if (data.ca) {
        editedData.option.ca = data.ca;
    }
    if (data.group) {
        editedData.option.group = data.group;
    }
    Messages.editMsg(id, editedData, function (data) {
        cb(data);
    });
}

function saveMessage(data, condition, cb) {
    let newData = {
        title: data.t,
        content: data.m,
        runDate: data.rd,
        owner: data.owner,
        action: data.ac,
        device: data.dv,
        option: condition
    };
    if (data.l) {
        newData.link = data.l;
    }


    Messages.addNew(newData, function (data) {
        cb(data);
    });
}

function sendNotificationByListEmail(session, list, notification, callback, schedule_time) {
    //callback(error)
    if (!schedule_time) {
        return doPush(callback);
    }

    callback(null, true);

    let cronTime = utils.convertGeneralTimeToCronTime(schedule_time);

    let job = new CronJob({
        cronTime: cronTime,
        start: false,
        timeZone: 'Asia/Ho_Chi_Minh',
        onTick: function () {
            doPush((err) => {
                if (!err) {
                    changeSessionStatus(session, 'Accepted');
                    pushScheduleCompleteTransaction(session);
                }

                this.stop();
            });
        }
    });

    job.start();

    function doPush(done) {
        let devices = [];

        async.eachSeries(list, function (email, cb) {
            User.findByEmail(email, function (err, user) {
                if (err) return cb(err);
                if (!user) return cb();
                Device.findByUser(user._id, function (result) {
                    if (!result || result.length === 0) {
                        return cb();
                    }

                    devices = devices.concat(result);

                    cb();
                });
            });
        }, function (error) {
            if (error) {
                return done(error);
            }

            if (devices.length === 0) {
                return done();
            }

            sendSingleNotificationByKue(session, notification, devices, done);
        });
    }

}

function saveUserNotificationTracking(sessionId, deviceId, state, callback) {
    DeviceNotification.addNew({ device: deviceId, session: sessionId, state: state }, callback);
}

function sendMessage(session, listDevice, data) {
    let msg = {
        t: data.title,
        m: data.content,
        ac: data.action,
        n: session
    };
    if (data.link) {
        msg.l = data.link;
    }
    let ph = new pushHook();
    ph.pushd(listDevice, '1', msg);
}

function createDeviceQuery(deviceQuery, queryList) {
    let result = deviceQuery;
    queryList.forEach(function (q) {
        q = q.trim();
        if (q.indexOf('recentdays:') != -1) {
            let days = parseInt((q.split(':')[1]), 10);
            let startDate = moment().startOf('day').subtract(days, 'days').format();
            result.createdDate = { $gte: startDate };
        }
        if (q.indexOf('owner') === 1) {
            if (!result.owner) result.owner = {};
            if (!result.owner['$or']) result.owner['$or'] = [];
            result.owner['$or'].push({ $exists: false });
        }
        if (q.indexOf('owner') === 0) {
            if (!result.owner) result.owner = {};
            if (!result.owner['$or']) result.owner['$or'] = [];
            result.owner['$or'].push({ $exists: true });
        }
        if (q.indexOf('country:') === 0 || q.indexOf('city:') != -1) {
            if (!result.tags) result.tags = {};
            if (!result.tags['$in']) result.tags['$in'] = [];
            result.tags['$in'].push(q);
        }
        if (q.indexOf('country:') === 1 || q.indexOf('!city:') != -1) {
            if (!result.tags) result.tags = {};
            if (!result.tags['$nin']) result.tags['$nin'] = [];
            result.tags['$nin'].push(q);
        }
    });
    return result;
}

function pushNotification(session, notification, keyRedis, callback, schedule_time) {
    //callback(err, isScheduled);

    if (!schedule_time) {
        return doPush(callback);
    }

    callback();

    let cronTime = utils.convertGeneralTimeToCronTime(schedule_time);

    let job = new CronJob({
        cronTime: cronTime,
        start: false,
        timeZone: 'Asia/Ho_Chi_Minh',
        onTick: function () {
            doPush((err) => {
                if (!err) {
                    changeSessionStatus(session, 'Accepted');
                }

                this.stop();
            });
        }
    });

    job.start();

    function doPush(done) {
        async.waterfall([
            function (cb) {
                //get device
                getStoredDevices(keyRedis, function (err, result) {
                    if (err) return cb(err);
                    if (!result) return cb('no_device');
                    if (!result.device) return cb(null, []);

                    cb(null, JSON.parse(result.device));
                });
            },
            function (devices, cb) {
                if (devices.length === 0) {
                    return cb();
                }

                sendSingleNotificationByKue(session, notification, devices, cb);
            }
        ], done);
    }
}

function changeSessionStatus(session_id, status) {
    PushNotificationSession.changeStatus(session_id, status, function () { });
}

function pushScheduleCompleteTransaction(session_id) {
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

function getStoredDevices(keyRedis, callback) {
    let redisClient = require('../../config/database').redisClient;
    redisClient.HGETALL(keyRedis, callback);
}

function sendSingleNotificationByKue(session, notification, deviceIdList, callback) {
    //mỗi device là một kue job
    async.eachSeries(deviceIdList, (deviceId, cb) => {
        Device.findById(deviceId, (err, device) => {
            if (err) return cb(err);
            if (!device) return cb();

            let job = queue.create('push_notification', {
                session: session,
                notification: notification,
                device: device
            }).priority('critical').attempts(5).removeOnComplete(true).save();
            job.on('complete', function () {
                //update tracking sent status
                saveUserNotificationTracking(session, device._id, 'sent', function () { });
                cb();
            }).on('failed', function (errorMessage) {
                //update tracking failed status
                saveUserNotificationTracking(session, device._id, 'error', function () { });
                cb();
            });
        });
    }, callback);
}

let appGet = function (req, res) {
    Messages.find({})
        .sort('-createdAt')
        .populate('owner lastEditBy')
        .exec(function (err, messages) {
            if (err) res.send({ err: true, msg: err });
            else { res.send({ err: false, data: messages }); }
        });
};

let appSend = function (req, res) {
    let mess = req.body.mess,
        toList = req.body.toList,
        sendMode = req.body.send_mode,
        query = req.body.query,
        schedule_time = req.body.schedule_time;

    let adminId = req.session.adminId;

    if (sendMode === 'search_query') {
        workWithSearchQuery();
    } else {
        workWithListEmail();
    }

    function workWithListEmail() {
        /**manual**/
        if (!toList) return res.send({ s: false });
        //create session
        let session_info = {
            notification: mess._id,
            pushBy: adminId
        };

        // if (toList.length <= maxDevicePushWithoutApproval) {
        //     session_info.approvedBy = adminId;
        // } else {
        //     session_info.email_list = toList;
        // }
        session_info.approvedBy = adminId;
        session_info.email_list = toList;


        if (schedule_time) {
            session_info.schedule_time = schedule_time;
        }

        PushNotificationSession.addNew(session_info, function (createSessionErr, createSessionResult) {
            if (createSessionErr) {
                res.send({ s: false });
            } else {
                res.send({ s: true });

                // if (toList.length <= maxDevicePushWithoutApproval) {
                //     sendNotificationByListEmail(createSessionResult._id, toList, mess, function(err, isScheduled){
                //         let result;

                //         if (err) result = 'failed';
                //         else if (isScheduled) result = 'scheduled';
                //         else result = 'success';

                //         let msg = 'Push notification "' + mess.title + '" ' + result;

                //         BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function(error, result){
                //             if (result) hook.pushBackendNotification(result._id, function(){});
                //         });
                //     }, schedule_time);
                // } else {
                //     BackendNotification.addNew(adminId, 'backend_push', 'Push notification "' + mess.title + '" is pending approval', '/messages', function(error, result){
                //         if (result) hook.pushBackendNotification(result._id, function(){});
                //     });

                //     Admin.find({isAdminSystem: true}, function(findAdminErr, findAdminResult){
                //         if (findAdminResult && findAdminResult.length > 0) {
                //             async.each(findAdminResult, function(admin, cb){
                //                 BackendNotification.addNew(admin._id, 'backend_push', 'Push notification "' + mess.title + '" is waiting for you', '/push-notification-request', function(e, r){
                //                     if (r) hook.pushBackendNotification(r._id, function(){});
                //                     cb();
                //                 });
                //             }, function(error){});
                //         }
                //     });
                // }

                sendNotificationByListEmail(createSessionResult._id, toList, mess, function (err, isScheduled) {
                    let result;

                    if (err) result = 'failed';
                    else if (isScheduled) result = 'scheduled';
                    else result = 'success';

                    let msg = 'Push notification "' + mess.title + '" ' + result;

                    BackendNotification.addNew(adminId, 'backend_push', msg, '/messages', function (error, result) {
                        if (result) hook.pushBackendNotification(result._id, function () { });
                    });
                }, schedule_time);

            }
        });
    }

    function workWithSearchQuery() {
        if (!query) return res.send({ s: false });
        if (!query.keyRedis) return res.send({ s: false });

        //check device amount
        getStoredDevices(query.keyRedis, function (err, result) {
            if (err) return res.send({ s: false });
            if (!result) return res.send({ s: true, r: 1 });

            let devices = JSON.parse(result.device);
            // if (devices.length <= maxDevicePushWithoutApproval) {
            //     //push luôn không cần duyệt
            //     //create session
            //     instantPush();
            // } else {
            //     //chờ duyệt
            //     submitPushRequest();
            // }

            instantPush();


            function submitPushRequest() {
                let session_info = {
                    notification: mess._id,
                    searchQuery: query._id,
                    pushBy: adminId
                };

                if (schedule_time) {
                    session_info.schedule_time = schedule_time;
                }

                PushNotificationSession.addNew(session_info, function (createSessionErr, createSessionResult) {
                    if (createSessionErr) res.send({ s: false });
                    else res.send({ s: true, r: 0 });

                    BackendNotification.addNew(adminId, 'backend_push', 'Push notification "' + mess.title + '" is pending approval', '/messages', function (error, result) {
                        if (result) hook.pushBackendNotification(result._id, function () { });
                    });

                    Admin.find({ isAdminSystem: true }, function (findAdminErr, findAdminResult) {
                        if (findAdminErr) return 0;
                        Admin.findOne({ username: 'congto' }, function (findAdminErr, cong) {
                            if (findAdminErr) return 0;

                            if (cong) {
                                findAdminResult.push(cong);
                            }

                            if (findAdminResult.length > 0) {
                                async.each(findAdminResult, function (admin, cb) {
                                    BackendNotification.addNew(admin._id, 'backend_push', 'Push notification "' + mess.title + '" is waiting for you', '/push-notification-request', function (e, r) {
                                        if (r) hook.pushBackendNotification(r._id, function () {
                                        });
                                        cb();
                                    });
                                }, function (error) { });
                            }
                        });
                    });
                });
            }

            function instantPush() {
                let session_info = {
                    notification: mess._id,
                    searchQuery: query._id,
                    pushBy: adminId,
                    approvedBy: adminId
                };

                if (schedule_time) {
                    session_info.schedule_time = schedule_time;
                }

                PushNotificationSession.addNew(session_info, function (createSessionErr, createSessionResult) {
                    if (createSessionErr) {
                        res.send({ s: false });
                    } else {
                        res.send({ s: true, r: 1 });
                        //increase search-query use count
                        SearchQuery.pushCountIncrement(query._id);
                        pushNotification(createSessionResult._id, mess, query.keyRedis, function (err) {
                            if (err) res.send({ s: false });
                            else {
                                BackendNotification.addNew(adminId, 'backend_push', 'Push notification "' + mess.title + '" completed', '/messages', function (error, result) {
                                    if (result) hook.pushBackendNotification(result._id, function () { });
                                });
                            }
                        }, schedule_time);
                    }
                });
            }
        });
    }
};

function validateCa(campaign) {
    return campaign.match(REGEX);
}

let appSave = function (req, res) {
    let adminId = req.session.adminId;
    let postData = req.body;
    let newData = { t: postData.msgInfo.title, m: postData.msgInfo.content, ac: postData.msgInfo.action, rd: postData.msgInfo.runDate, dv: postData.msgInfo.device };
    if (postData.msgInfo.link) newData.l = postData.msgInfo.link;
    let condition = req.body.condition;
    if (postData.msgInfo.campaign) {
        if (validateCa(postData.msgInfo.campaign)) {
            condition.ca = postData.msgInfo.campaign;
        }
    }
    if (postData.msgInfo.group) {
        condition.group = postData.msgInfo.group;
    }
    newData.owner = adminId;
    saveMessage(newData, condition, function (data) {
        res.send(data);
    });
};

let appEdit = function (req, res) {
    let adminId = req.session.adminId;
    let postData = req.body;
    let editedData = { t: postData.msgInfo.title, m: postData.msgInfo.content, ac: postData.msgInfo.action, rd: postData.msgInfo.runDate, dv: postData.msgInfo.device, editBy: adminId };
    if (postData.msgInfo.link) editedData.l = postData.msgInfo.link;
    if (postData.msgInfo.campaign) {
        if (validateCa(postData.msgInfo.campaign)) {
            editedData.ca = postData.msgInfo.campaign;
        }
    }
    if (postData.msgInfo.group) {
        editedData.group = postData.msgInfo.group;
    }
    editMessage(postData.msgInfo._id, editedData, function (data) {
        res.send(data);
    });
};

let appDelete = function (req, res) {
    let id = req.body.messid;
    Messages.deleteMsg(id, function (data) {
        res.send(data);
    });
};

let appSaveAndSend = function (req, res) {
    let adminId = req.session.adminId;
    let postData = req.body;
    let newData = { t: postData.msgInfo.title, m: postData.msgInfo.content, ac: postData.msgInfo.act };
    if (postData.msgInfo.l) newData.l = postData.msgInfo.l;
    let condition = req.body.condition;
    async.parallel({
        send: function (cb) {
            sendMessage(req, condition, newData, function (status, data) {
                cb(null, data);
            });
        },
        save: function (cb) {
            newData.owner = adminId;
            saveMessage(newData, condition, function (data) {
                cb(null, data);
            });
        }
    }, function (err, data) {
        res.send(data);
    });
};

let appReport = function (req, res) {
    let id = req.body.id;
    async.parallel({
        total: function (cb) {
            DeviceNotification.countTotalBySession(id, cb);
        },
        open: function (cb) {
            DeviceNotification.countOpenedDeviceBySession(id, cb);
        },
        sent: function (cb) {
            DeviceNotification.countSentDeviceBySession(id, cb);
        },
        error: function (cb) {
            DeviceNotification.countErrorDeviceBySession(id, cb);
        }
    }, function (error, result) {
        if (error) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appGetOne = function (req, res) {
    let id = req.body.id;
    Messages.findById(id, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

function dailyCount(query, callback) {
    DeviceNotification.aggregate(
        {
            $match: query
        },
        {
            $group: {
                _id: {
                    year: { $year: "$sentDate" },
                    month: { $month: "$sentDate" },
                    days: { $dayOfMonth: "$sentDate" }
                },
                total: {
                    $sum: 1
                }
            }
        },
        {
            $group: {
                _id: {
                    year: "$_id.year",
                    month: "$_id.month"
                },
                dailyStats: {
                    $push: {
                        ngay: '$_id.days',
                        count: "$total"
                    }
                }
            }
        }, callback
    );
}

let appDailyTotalSendStat = function (req, res) {
    dailyCount({}, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appDailyTotalOpenedStat = function (req, res) {
    dailyCount({ state: "read" }, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appDailyNotificationSendStat = function (req, res) {
    let id = req.body.id;
    if (!id) return res.send({ s: false });
    dailyCount({ notification: id }, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appDailyNotificationOpenedStat = function (req, res) {
    let id = req.body.id;
    if (!id) return res.send({ s: false });
    dailyCount({ notification: id, state: "read" }, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appOpenedByPushSession = function (req, res) {
    let id = req.body.id;
    let skip = req.body.skip;
    let limit = req.body.limit;
    if (!id || !limit) res.send({ s: false });
    DeviceNotification.findReadDeviceBySession(id, skip, limit, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appSentNotificationByUser = function (req, res) {
    let id = req.body.id;
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!id || !limit) return res.send({ s: false });

    DeviceNotification.findSentNotificationByUser(id, skip, limit, function (err, result) {
        if (err) res.send({ s: false });
        else if (result.length == 0) res.send({ s: true, d: result });
        else {
            let notificationList = [];
            async.eachSeries(result, function (notificationId, cb) {
                Messages.findById(notificationId, function (err, noti) {
                    if (err) cb(err);
                    else if (!noti) cb();
                    else {
                        notificationList.push(noti);
                        cb();
                    }
                });
            }, function (error) {
                if (error) res.send({ s: false });
                else res.send({ s: true, d: notificationList });
            });
        }
    });
};

let appErrorByPushSession = function (req, res) {
    let id = req.body.id;
    let skip = req.body.skip;
    let limit = req.body.limit;
    if (!id || !limit) return res.send({ s: false });
    DeviceNotification.findErrorDeviceBySession(id, skip, limit, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appSentByPushSession = function (req, res) {
    let id = req.body.id;
    let skip = req.body.skip;
    let limit = req.body.limit;
    if (!id || !limit) res.send({ s: false });
    DeviceNotification.findSentDeviceBySession(id, skip, limit, function (err, result) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: result });
    });
};

let appGetSession = function (req, res) {
    let id = req.body.messageId;
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!id || !limit) return res.send({ s: false });

    PushNotificationSession.findByNotificationId(id, skip, limit, function (err, list) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: list });
    });
};

let appGetOneSession = function (req, res) {
    let id = req.body.id;

    if (!id) return res.send({ s: false });

    PushNotificationSession.findById(id)
        .populate('notification')
        .populate('searchQuery')
        .lean()
        .exec(function (err, resullt) {
            if (err) res.send({ s: false });
            else res.send({ s: true, d: resullt });
        });
};

module.exports = function (app, config) {
    app.get('/messages', staticsMain);
    app.get('/messages/report', staticsMain);
    app.post('/message/get', appGet);
    app.post('/message/get-one', appGetOne);
    app.post('/message/send', appSend);
    app.post('/message/save', appSave);
    app.post('/message/update', appEdit);
    app.post('/message/saveandsend', appSaveAndSend);
    app.post('/message/delete', appDelete);
    app.post('/message/report', appReport);
    app.post('/message/daily-total-send-stat', appDailyTotalSendStat);
    app.post('/message/daily-total-opened-stat', appDailyTotalOpenedStat);
    app.post('/message/daily-notification-send-stat', appDailyNotificationSendStat);
    app.post('/message/daily-notification-opened-stat', appDailyNotificationOpenedStat);
    app.post('/message/opened-by-push-session', appOpenedByPushSession);
    app.post('/message/sent-by-push-session', appSentByPushSession);
    app.post('/message/error-by-push-session', appErrorByPushSession);
    app.post('/message/sent-notification-by-user', appSentNotificationByUser);
    app.post('/message/get-push-session', appGetSession);
    app.post('/message/get-one-session', appGetOneSession);
};
