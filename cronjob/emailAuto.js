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

let amqpConn = null;

const mailwizzSdk = require('node-mailwizz-sdk');


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
let queue = kue.createQueue({
    prefix: 'q',
    redis: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.kueDb,
        options: {}
    }
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

const EMAIL_FAKE = ['loint@moneylover.me', 'linhnhat@moneylover.me'];

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

/* Connect DB */

function connectDB() {
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

    // callback();
}

function closeDB(callback) {
    mongoose.connection.close();
    callback();
}

connectDB();

/* ===================RABBITMQ============================= */

// Set up and start rabbit mq 
function start() {
    amqp.connect(config.rabbit.url, function (err, conn) {
        if (err) {
            return setTimeout(start, 1000);
        }
        conn.on("error", function (err) {
            if (err.message !== "Connection closing") {
            }
        });
        conn.on("close", function () {
            return setTimeout(start, 1000);
        });
        amqpConn = conn;
        whenConnected();
    });
};

function whenConnected() {
    startPublisher();
    startWorker();
};

let pubChannel = null;
let offlinePubQueue = [];

function startPublisher() {
    amqpConn.createConfirmChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function (err) {

        });
        ch.on("close", function () {
        });

        pubChannel = ch;
        // send back message for consumer if queue broken before
        while (true) {
            let m = offlinePubQueue.shift();
            if (!m) break;
            publish(m[0], m[1], m[2]);
        }
    });
}
// send message
function publish(exchange, routingKey, content) {
    try {
        pubChannel.publish(exchange, routingKey, content, {
            persistent: true
        },
            function (err, ok) {
                if (err) {
                    offlinePubQueue.push([exchange, routingKey, content]);
                    pubChannel.connection.close();
                }
            });
    } catch (e) {
        offlinePubQueue.push([exchange, routingKey, content]);
    }
}

function startWorker() {
    amqpConn.createChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function (err) {
        });
        ch.on("close", function () {

        });
        // limit unacknowledged is 20 message
        ch.prefetch(20);
        ch.assertQueue(EXCHANGE['name'], {
            durable: true
        }, function (err, _ok) {
            if (closeOnErr(err)) return;
            // receive message
            ch.consume(EXCHANGE['name'], processMsg, {
                noAck: false
            });
        });

        function processMsg(msg) {
            work(msg, function (ok) {
                try {
                    if (ok)
                        ch.ack(msg);
                    else
                        ch.reject(msg, true);
                } catch (e) {
                    closeOnErr(e);
                }
            });
        }
    });
}

function convertObjectToBufferAndPublish(object) {
    publish("", EXCHANGE['name'], new Buffer(JSON.stringify(object)));
}

function convertBufferToObject(buffer) {
    return JSON.parse(buffer.content.toString());
}

// excute message
function work(msg, cb) {
    let receivedObject = convertBufferToObject(msg);
    updateNextSchedule(receivedObject, function (error, result) {
        if (error) {
            cb(false);
        } else {
            cb(true);
        }
    });
}

function closeOnErr(err) {
    if (!err) return false;
    amqpConn.close();
    return true;
}

function slackPushMarkdown(generateDataAutomationLog) {
    Request({
        "url": 'https://hooks.slack.com/services/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',
        "method": 'POST',
        "json": true,
        "body": {
            "author_name": "Maria Ozawa",
            "attachments": [
                {
                    "fallback": "Email",
                    "pretext": "Email Automation Log",
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
                            title: 'Number Of Email',
                            value: generateDataAutomationLog.emails,
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

function pushToSlack(channel, content) {
    slackbot.send(channel, JSON.stringify(content), function (err, response, body) {
    });
}


start();

/* ===================END RABBIT============================= */

/* ===================EMAIL CRONJOB============================= */

let getListAutoEmail = function (callback) {
    // thoi gian cach nhau nua tieng
    let startDate = moment().subtract(0.5, 'hours').toDate();
    let currentDate = moment().toDate().toISOString();

    let startCronJobTimeLog = 'Email Cronjob runned at ' + currentDate;

    let condition = {
        isEnabled: true,
        type: TYPE['Email'],
        nextRun: {
            $gte: startDate,
            $lt: currentDate
        }
    };

    Email_Push_Auto.find(condition)
        .populate('searchQuery')
        .exec(callback);
};

function excuteTimeSpent(startTime, endTime) {
    return (endTime - startTime) / 1000 + "seconds";
}


let generateEmailItem = function (object, resultFromSeachQuery) {
    let returnObject = {};

    returnObject._id = object._id;
    returnObject.name = object.name;
    returnObject.emails = resultFromSeachQuery.hits.hits;
    returnObject.template = object.metadata.template;
    returnObject.hourRun = object.metadata.hourRun;
    returnObject.subject = object.metadata.subject;
    returnObject.fromEmail = object.metadata.fromEmail;
    returnObject.fromName = object.metadata.fromName;
    returnObject.replyTo = object.metadata.replyTo;

    return returnObject;
};

let getListEmailBySearhQuery = function (listAutoEnable, callback) {
    async.mapSeries(listAutoEnable, function (item, cb) {
        if (item.searchQuery) {
            let options = utils.skipLimitSearchQueryDetect(item.searchQuery.query, {});
            let query = utils.createUserQuery(item.searchQuery.query);
            let listEmailFromSource = [];

            User.search(query, options, (err, result) => {
                if (err) {
                    return cb(err, null);
                } else {
                    listEmailFromSource.push(generateEmailItem(item, result));

                    return cb(null, listEmailFromSource);
                }
            });
        } else {
            return cb(null, null);
        }
    }, callback);
};

let convertEmailSource = function (listEmailFromSource) {
    let newArr = [];
    if (listEmailFromSource.length == 1) {
        newArr = listEmailFromSource[0];
    } else {
        for (let i = 0; i < listEmailFromSource.length; i++) {
            newArr = newArr.concat(listEmailFromSource[i]);
        }
    }

    return new Promise(function (resolve, reject) {
        resolve(newArr);
    });
};


let generateContentListWizz = function (infoWizz) {
    let currentDate = moment().toDate().toISOString();
    let info = {};

    info.name = 'Campaign ' + infoWizz.name;
    info.description = 'list created automation at ' + currentDate;
    info.fromName = infoWizz.fromName;
    info.fromEmail = infoWizz.fromEmail;
    info.subject = infoWizz.subject;
    info.replyTo = infoWizz.replyTo;
    info.urlTracking = 'yes';

    return info;
};

let createListWizz = function (listEmailFromSource, callback) {
    if (listEmailFromSource) {
        convertEmailSource(listEmailFromSource).then(function (Emails) {
            async.eachSeries(Emails, function (item, cb) {
                async.setImmediate(() => {
                    let beginTime = Date.now();
                    let info = generateContentListWizz(item);
                    let listSDK = new mailwizzSdk.Lists(wizzConfig);
                    // console.log(item);
                    let generateDataAutomationLog = {
                        autoId: item._id,
                        startRun: '',
                        finishRun: '',
                        type: 'Email',
                        emails: item.emails.length,
                        name: item.name,
                        excuteTimeOfPublisher: ''
                    };

                    listSDK.create(info)
                        .then(function (result) {
                            result = JSON.parse(result);
                            info.listId = result.list_uid;

                            async.series({
                                putEmailIntoListCreated: function (done) {
                                    putEmailIntoListCreated(item.emails, result.list_uid, done);
                                },
                                createCampaign: function (done) {
                                    info.sendAt = moment().format('YYYY-MM-DD hh:mm:ss');

                                    generateDataAutomationLog.startRun = info.sendAt;

                                    if (typeof item.template != 'object') {
                                        item.template = JSON.parse(item.template);
                                    }

                                    info.templateId = item.template.id;

                                    createCampaign(info, function (error, result) {
                                        if (!error) {
                                            let currentDate = moment().format('YYYY-MM-DD hh:mm:ss');
                                            generateDataAutomationLog.finishRun = currentDate;
                                        }

                                        done();
                                    });
                                },
                                lastRunningCampaign: function (done) {
                                    updateLastSchedule(item._id, currentDate, done);
                                },
                                automation_log: function (done) {
                                    if (generateDataAutomationLog.startRun && generateDataAutomationLog.finishRun) {
                                        generateDataAutomationLog.status = 'complete';
                                    } else {
                                        generateDataAutomationLog.status = 'failed';
                                    }

                                    let endTime = Date.now();
                                    let timeSpent = (endTime - beginTime) / 1000 + " secs";
                                    generateDataAutomationLog.excuteTimeOfPublisher = timeSpent;

                                    AutomationLog.addNew(generateDataAutomationLog, done);
                                }
                            }, cb);
                        })
                        .catch(cb);
                });
            }, callback);
        });
    } else {
        callback();
    }
};

let putItemIntoQueue = function (listItemEnable, callback) {
    convertObjectToBufferAndPublish(listItemEnable);
    callback(null, listItemEnable);
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

let putEmailIntoListCreated = function (EmailFromSource, list_uid, callback) {
    /* Product */

    if (env == 'dev') {
        async.eachSeries(EMAIL_FAKE, function (item, cb) {
            async.setImmediate(() => {
                let listSubscriber = new mailwizzSdk.ListSubscribers(wizzConfig);

                // validate email
                if (utils.isEmail(item)) {
                    listSubscriber.create(list_uid, item, '', '')
                        .then(function (result) {
                            cb();
                        })
                        .catch(function (err) {
                            cb();
                        });
                } else {
                    cb();
                }
            });
        }, callback);
    } else {
        async.eachSeries(EmailFromSource, function (item, cb) {
            async.setImmediate(() => {
                let listSubscriber = new mailwizzSdk.ListSubscribers(wizzConfig);

                // validate email
                if (utils.isEmail(item._source.email)) {
                    listSubscriber.create(list_uid, item._source.email, '', '')
                        .then(function (result) {
                            cb();
                        })
                        .catch(function (err) {
                            cb();
                        });
                } else {
                    cb();
                }
            });
        }, callback);
    }
};

let createCampaign = function (info, callback) {
    let campaigns = new mailwizzSdk.Campaigns(wizzConfig);

    campaigns.create(info)
        .then(function (result) {
            return callback(null, null);
        }).catch(function (err) {
            return callback(err, null);
        });
};

/* ===================END EMAIL CRONJOB============================= */

/* =================== SET UP CRONJOB WORKER ============================= */

let emailCronJob = new CronJob({
    cronTime: SCHEDULE_BUS['production'],
    onTick: sendEmail,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

function sendEmail() {
    async.waterfall([
        // connectDB,
        getListAutoEmail,
        putItemIntoQueue,
        getListEmailBySearhQuery,
        createListWizz,
        // closeDB
    ], function (err, result) {
        if (err) {
            pushToSlack("@loint", "Email Auto" + err);
        }
    });
}

emailCronJob.start();

