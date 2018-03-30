/*
 Cronjob
 Email Push Notification Automation
 */

'use strict';

let env = process.env.NODE_ENV;

const mongoose = require('mongoose');
const config = require('../config/config')[env];
let CronJob = require('cron').CronJob;
let moment = require('moment');
let async = require('async');
let utils = require('../helper/utils');
let amqp = require('amqplib/callback_api');
let path = require('path');
let kue = require('kue');
let Request = require('request');
let Slackbot = require('slackbot');
let slackbot = new Slackbot('moneylover', '50cXqEaCuKrX0LiyfaISgtFf');
const LOG_PATH = "logs/";

const Rabbit = require('./automation_rabbit/lib/rabbit');

const RawDataPublisher = new Rabbit.default({
    tag: 'white-house-worker-automation',
    exchanges: [Rabbit.JOB_EXCHANGE]
});

const EVENT_NAME = 'hook.ready.raw_automation';
const EVENT_UPDATE_NEXT_RUNNING = 'hook.ready.raw_next_running';

const EVENT_FEEDBACK_NAME = 'hook.ready.raw_feedback';
// let amqpConn = null;

const WORKER_UPDATE_EXCUTED_DATA_NEXT_RUNNING = 'queue_worker_update_next_running';
const WORKER_FEEDBACK = 'queue_worker_feedback';

const RawDataProcessWorker = new Rabbit.default({
    tag: 'white-house-worker-automation',
    exchanges: [Rabbit.JOB_EXCHANGE],
    queues: [{
        name: WORKER_UPDATE_EXCUTED_DATA_NEXT_RUNNING,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 50
    }, {
        name: WORKER_FEEDBACK,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 50
    }]
});

const mailwizzSdk = require('node-mailwizz-sdk');


const debug = require('debug')('pushCronJob:debug');

const configMailWizz = {
    local: {
        publicKey: '8d30e77bc26f04c920628c01c93877e110bdee70',
        secret: '6b3b9cfd26fc892c45b58076bfd8467a5afc492b',
        baseUrl: 'https://wizz.finsify.com/api'
    },
    dev: {
        publicKey: '8d30e77bc26f04c920628c01c93877e110bdee70',
        secret: '6b3b9cfd26fc892c45b58076bfd8467a5afc492b',
        baseUrl: 'https://wizz.finsify.com/api'
    },
    production: {
        publicKey: '55745ccb210c8e997c5ff79503a45a06d3ba02ba',
        secret: 'b1e062892ba068895ea15b703178d129250b397e',
        baseUrl: 'https://wizz.finsify.com/api'
    }
};

let wizzConfig = (env === 'production') ? configMailWizz.production : configMailWizz.dev;

if (env === 'local') {
    wizzConfig = configMailWizz.local;
}

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});


require('../model/auto_email');
require('../model/search_query');
require('../model/user');
require('../model/device');
require('../model/device_notification');
require('../model/backend_notification');
require('../model/push_notification_session');
require('../model/search_query');
require('../model/account');
require('../model/admin');
require('../model/automation_log');

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};

//create queue instance
// let queue = kue.createQueue({
//     prefix: 'q',
//     redis: {
//         host: config.redis.host,
//         port: config.redis.port,
//         db: config.redis.kueDb,
//         options: {}
//     }
// });

// Connect to MongoDB
mongoose.Promise = require('bluebird');
mongoose.connect(config.db_url, connectOptions);
let db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback() {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});
db.on('reconnected', function () {
    console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
});
db.on('disconnected', function () {
    console.log('Money DB DISCONNECTED');
});

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

let Email_Push_Auto = mongoose.model('EmailAutomationPush');
let User = mongoose.model('User');
let Device = mongoose.model('Device');
let DeviceNotification = mongoose.model('DeviceNotification');
let BackendNotification = mongoose.model('BackendNotification');
let PushNotificationSession = mongoose.model('PushNotificationSession');
let SearchQuery = mongoose.model('SearchQuery');
let Account = mongoose.model('Account');
let Administrator = mongoose.model('Administrator');
let hook = require('../backend/routes/hook');
let AutomationLog = mongoose.model('Automation_Log');

const EMAIL_FAKE = ['ntlzz93@gmail.com', 'loint20@gmail.com', 'linhnhat@moneylover.me'];

const MODE = {
    'daily': 'daily',
    'monthly': 'monthly'
};

const SCHEDULE_BUS = {
    '30_MINTUTES': '00 30 * * * *', // 30 phut 1 lan
    'production': '00 * * * * *',
    'one_hit_one_minute': '00 * * * * *'
};

const TYPE = {
    'Email': 1,
    'Push': 2
};

const EXCHANGE = {
    'name': 'jobs',
    'type': 'topic'
};


function slackPushMarkdown(generateDataAutomationLog) {
    Request({
        "url": 'https://hooks.slack.com/services/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',
        "method": 'POST',
        "json": true,
        "body": {
            "author_name": "Ameri Ichinose",
            "attachments": [
                {
                    "fallback": "Push notificaiton",
                    "pretext": "Push Automation Log",
                    "color": "#36a64f",
                    "title": "Loint is awesome",
                    "text": generateDataAutomationLog.name,
                    "fields": [
                        {
                            title: 'Name',
                            value: generateDataAutomationLog.name,
                            short: true
                        },
                        {
                            title: 'Type',
                            value: generateDataAutomationLog.type,
                            short: true
                        },
                        {
                            title: 'Start Run',
                            value: generateDataAutomationLog.startRun,
                            short: true
                        },
                        {
                            title: 'Finish Run',
                            value: generateDataAutomationLog.finishRun,
                            short: true
                        },
                        {
                            title: 'Number Of Device',
                            value: generateDataAutomationLog.devices,
                            short: true
                        },
                        {
                            title: 'Excute Time Of Publisher',
                            value: generateDataAutomationLog.excuteTimeOfPublisher,
                            short: true
                        },
                        {
                            title: 'Status',
                            value: generateDataAutomationLog.status || 'deafult',
                            short: true
                        }
                    ],
                    "footer": "Slack API",
                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
                }
            ],
            mrkdwn: true
        }
    }, (error, res, body) => {

    });
}

function pushToSlack(user, content) {
    slackbot.send(user, JSON.stringify(content), function (err, response, body) {
    });
}

RawDataProcessWorker.listen(EVENT_FEEDBACK_NAME, WORKER_FEEDBACK, function (data, done) {

    if (typeof data === 'string') {
        data = JSON.parse(data);
    }

    let session = data.session;
    let device = data.device;
    let status = data.status;

    if (status === 'error') {
        saveUserNotificationTracking(session, device._id, 'error', done);
    } else {
        saveUserNotificationTracking(session, device._id, 'sent', done);
    }
});

RawDataProcessWorker.listen(EVENT_UPDATE_NEXT_RUNNING, WORKER_UPDATE_EXCUTED_DATA_NEXT_RUNNING, function (data, done) {
    updateNextSchedule(data, done);
});

let putItemIntoQueue = function (listItemEnable, callback) {
    // convertObjectToBufferAndPublish(listItemEnable);
    RawDataPublisher.publish(EVENT_UPDATE_NEXT_RUNNING, listItemEnable, Rabbit.PRIORITY.critical, function () {
        callback(null, listItemEnable);
    });
};

let updateLastSchedule = function (_id, lastRun, callback) {
    Email_Push_Auto.findByIdAndUpdate(_id, { lastRun: lastRun }, callback);
};

let excuteNextRun = function (hourRun, type, callback) {
    if (type === 'day') {
        hourRun = moment(hourRun).add('1', 'days');
    } else if (type === 'month') {
        hourRun = moment(hourRun).add('1', 'months');
    }

    callback(hourRun);

};

let updateNextScheduleIteratorFunc = function (item, callback) {
    async.setImmediate(() => {
        if (item.mode === MODE['daily']) {
            excuteNextRun(item.nextRun, 'day', function (nextRunUpdate) {
                Email_Push_Auto.findOneAndUpdate({ _id: item._id }, { nextRun: nextRunUpdate }, callback);
            });
        } else if (item.mode === MODE['monthly']) {
            excuteNextRun(item.nextRun, 'month', function (nextRunUpdate) {
                Email_Push_Auto.findOneAndUpdate({ _id: item._id }, { nextRun: nextRunUpdate }, callback);
            });
        }
    });
};

let updateNextSchedule = function (listRecord, callback) {
    async.eachSeries(listRecord, updateNextScheduleIteratorFunc, callback);
};


/* ===================PUSH CRONJOB============================= */

let getListAutoPush = function (callback) {
    // thoi gian cach nhau nua tieng
    let startDate = moment().subtract(0.5, 'hours').toDate();
    let currentDate = moment().toDate().toISOString();

    let startCronJobTimeLog = 'Push Cronjob runned at ' + currentDate;


    let condition = {
        isEnabled: true,
        type: TYPE['Push'],
        nextRun: {
            $gte: startDate,
            $lt: currentDate
        }
    };

    Email_Push_Auto.find(condition)
        .populate('searchQuery')
        .exec(callback);
};

let getAdministrator = function (callback) {
    Administrator.find({ isAdminSystem: true }, callback);
};

let backendPushLog = function (adminId, content, callback) {
    BackendNotification.addNew(adminId, 'backend_push', 'Push notification "' + content + '" completed', '/messages', function (error, result) {
        if (error) {
            callback(error);
        } else {
            if (result) {
                hook.pushBackendNotification(result._id, callback);
            } else {
                callback();
            }
        }
    });
};

let getUserIdBySearhQuery = function (listItemEnable, callback) {
    async.mapSeries(listItemEnable, function (item, cb) {
        if (item.searchQuery) {
            let options = utils.skipLimitSearchQueryDetect(item.searchQuery.query, {});
            let query = utils.createUserQuery(item.searchQuery.query);
            let keyRedis = item.searchQuery.keyRedis;
            let session_info = generateSessisonInfoObject(item);
            let objectMessage = item.metadata;
            let idRecord = item._id;

            let title = objectMessage.title;
            let adminId = session_info.pushBy;

            User.search(query, options, (err, result) => {
                if (err) {
                    return cb(err);
                }

                PushNotificationSession.addNew(session_info, function (createSessionErr, createSessionResult) {
                    if (createSessionErr) {
                        cb();
                    } else {
                        let listUserId = result.hits.hits;

                        async.series([
                            function (next) {
                                //increase search-query use count
                                SearchQuery.pushCountIncrement(session_info.searchQuery); // search_query id
                                next();
                            },
                            function (next) {
                                let notificationInfo = objectMessage;
                                pushNotification(createSessionResult._id, notificationInfo, listUserId, idRecord, keyRedis, next);
                            },
                            // function (next) {
                            //     getAdministrator(function (error, result) {
                            //         if (error) {
                            //             return next(error);
                            //         } else {
                            //             for (let id of result) {
                            //                 adminId.push(id);
                            //             }
                            //             return next();
                            //         }
                            //     });
                            // },
                            function (next) {
                                backendPushLog(adminId, title, next);
                            }
                        ], cb);

                    }
                });
            });
        } else {
            cb();
        }
    }, callback);
};

function excuteTimeSpent(startTime, endTime) {
    return (endTime - startTime) / 1000 + "seconds";
}

function pushNotification(session, notification, listUserId, idRecord, keyRedis, callback) {
    let listDevice = [];
    async.series([
        function (cb) {
            let startTime = Date.now();
            getStoredDevices(keyRedis, function (err, result) {
                if (err) return cb(err);
                if (!result) return cb(null, []);
                if (!result.device) return cb(null, []);
                listDevice = JSON.parse(result.device);
                debug('listDevice ', listDevice);
                let endTime = Date.now();
                let timeSpent = excuteTimeSpent(startTime, endTime);
                debug('timeSpent getStoredDevices ', timeSpent);
                // pushToSlack('@loint', { timeRedis: timeSpent });
                cb(null, JSON.parse(result.device));
            });
        },
        function (cb) {
            if (listDevice.length === 0) {
                return cb();
            }
            // pushToSlack('@loint', listDevice);
            sendSingleNotificationByKue(session, notification, listDevice, idRecord, cb);
        },
        function (cb) {
            changeSessionStatus(session, 'Accepted', cb);
        }
    ], callback);
};

function getDeviceFromElastic(listOwner) {
    return new Promise((resolve, reject) => {
        let searchQuery = {
            filtered: {
                filter: {
                    bool: {
                        must: [
                            {
                                terms: {
                                    owner: listOwner
                                }
                            }
                        ]
                    }
                }
            }
        };

        Device.search(searchQuery, { hydrate: true }, function (err, deviceList) {
            if (err || !deviceList) {
                reject();
            }

            resolve(deviceList.hits.hits);
        });
    });
}

function getStoredDevices(keyRedis, callback) {
    let redisClient = require('../config/database').redisClient;
    redisClient.HGETALL(keyRedis, callback);
}

function changeSessionStatus(session_id, status, callback) {
    PushNotificationSession.changeStatus(session_id, status, callback);
};

function sendSingleNotificationByKue(session, notification, deviceIdList, idRecord, callback) {
    //mỗi device là một kue job
    let generateDataAutomationLog = {
        autoId: idRecord,
        startRun: moment().format('YYYY-MM-DD hh:mm:ss'),
        finishRun: '',
        type: 'Push notification',
        devices: deviceIdList.length,
        name: notification.title,
        excuteTimeOfPublisher: ''
    };
    let beginTime;
    let endTime;
    async.series({
        sendKue: function (next) {
            beginTime = Date.now();
            debug('deviceIdList ', deviceIdList.length);
            async.eachSeries(deviceIdList, (deviceId, cb) => {
                Device.findById(deviceId, (err, device) => {
                    if (err) return cb(err);
                    if (!device) return cb();

                    RawDataPublisher.publish(EVENT_NAME, {
                        session: session,
                        notification: notification,
                        device: device,
                        action: 28
                    }, Rabbit.PRIORITY.critical, function () {
                        let currentDate = moment().toDate().toISOString();
                        updateLastRunnedPush(idRecord, currentDate, cb);
                    });

                });
            }, function (err, status) {
                generateDataAutomationLog.status = status;
                generateDataAutomationLog.finishRun = moment().format('YYYY-MM-DD hh:mm:ss');

                endTime = Date.now();
                next();
            });
        },
        log: function (next) {
            AutomationLog.addNew(generateDataAutomationLog, function () { });
            let timeSpent = (endTime - beginTime) / 1000 + " secs";
            generateDataAutomationLog.excuteTimeOfPublisher = timeSpent;
            // slackPushMarkdown(generateDataAutomationLog);
            next();
        }
    }, callback)

};

let updateLastRunnedPush = function (idRecord, currentDate, callback) {
    updateLastSchedule(idRecord, currentDate, callback);
};

function saveUserNotificationTracking(sessionId, deviceId, state, callback) {
    DeviceNotification.addNew({ device: deviceId, session: sessionId, state: state }, callback);
};

function scheduleTimeParser(dateTime) {
    //string_time format DD/MM/YYYY hh:mm
    let date = moment(dateTime);
    let year = moment().year();
    let month = moment().month();
    let day = moment().date();
    let hour = moment().hour();
    let mintute = moment().minute();

    return day + '/' + month + '/' + year + ' ' + hour + ':' + mintute;
};

let generateSessisonInfoObject = function (itemEnableObject) {
    let notification = itemEnableObject.metadata._id;
    let searchQuery = itemEnableObject.searchQuery._id;
    let adminId = itemEnableObject.metadata.owner._id;
    let schedule_time = scheduleTimeParser(itemEnableObject.nextRun); // convert to cronjob time

    let session_info = {
        notification: notification,
        searchQuery: searchQuery,
        pushBy: adminId,
        approvedBy: adminId,
        schedule_time: schedule_time
    };
    return session_info;
};


function connectDB(callback) {
    // Connect to MongoDB
    mongoose.Promise = require('bluebird');
    mongoose.connect(config.db_url, connectOptions);
    let db = mongoose.connection;

    db.on('error', console.error.bind(console, ' Sync Database connection error:'));
    db.once('open', function callback() {
        console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
    });
    db.on('reconnected', function () {
        console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
    });
    db.on('disconnected', function () {
        console.log('Money DB DISCONNECTED');
    });

    callback();
}

function closeDB(callback) {
    mongoose.connection.close();
    callback();
}


/* =================== SET UP CRONJOB WORKER ============================= */
function pushNotificationCron() {
    async.waterfall([
        // connectDB,
        getListAutoPush,
        putItemIntoQueue,
        getUserIdBySearhQuery,
        // closeDB
    ], function (err, result) {
        if (err) {
            pushToSlack("@loint", err);
        }
    });
}

let pushCronJob = new CronJob({
    cronTime: SCHEDULE_BUS['production'],
    onTick: pushNotificationCron,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

pushCronJob.start();