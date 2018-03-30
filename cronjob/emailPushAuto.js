// /*
//  Cronjob
//  Email Push Notification Automation
//  */

// 'use strict';

// let env = process.env.NODE_ENV;

// const mongoose = require('mongoose');
// const config = require('../config/config')[env];
// let CronJob = require('cron').CronJob;
// let moment = require('moment');
// let async = require('async');
// let utils = require('../helper/utils');
// let amqp = require('amqplib/callback_api');
// let path = require('path');
// let kue = require('kue');
// // let logger = require(path.join(__dirname, '../', 'backend/logs/logger.js'))();
// let Slackbot = require('slackbot');
// let slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');
// const LOG_PATH = "logs/";

// let amqpConn = null;

// const mailwizzSdk = require('node-mailwizz-sdk');


// const configMailWizz = {
//     local: {
//         publicKey: '8d30e77bc26f04c920628c01c93877e110bdee70',
//         secret: '6b3b9cfd26fc892c45b58076bfd8467a5afc492b',
//         baseUrl: 'https://wizz.finsify.com/api'
//     },
//     dev: {
//         publicKey: '8d30e77bc26f04c920628c01c93877e110bdee70',
//         secret: '6b3b9cfd26fc892c45b58076bfd8467a5afc492b',
//         baseUrl: 'https://wizz.finsify.com/api'
//     },
//     production: {
//         publicKey: '55745ccb210c8e997c5ff79503a45a06d3ba02ba',
//         secret: 'b1e062892ba068895ea15b703178d129250b397e',
//         baseUrl: 'https://wizz.finsify.com/api'
//     }
// };

// let wizzConfig = (env === 'production') ? configMailWizz.production : configMailWizz.dev;

// if (env === 'local') {
//     wizzConfig = configMailWizz.local;
// }

// // let listSDK = new mailwizzSdk.Lists(wizzConfig);
// // let campaigns = new mailwizzSdk.Campaigns(wizzConfig);
// // let listSubscriber = new mailwizzSdk.ListSubscribers(wizzConfig);

// process.on('uncaughtException', function (err) {
//     // logger.log('error', JSON.stringify(err.stack));
//     console.log(err.stack);
// });

// process.on('exit', function (code) {
//     // logger.log('About to exit with code: ' + code);
//     console.log('About to exit with code: ' + code);
// });


// require('../model/auto_email');
// require('../model/search_query');
// require('../model/user');
// require('../model/device');
// require('../model/device_notification');
// require('../model/backend_notification');
// require('../model/push_notification_session');
// require('../model/search_query');
// require('../model/account');
// require('../model/admin');

// let connectOptions = {
//     server: {
//         auto_reconnect: true
//     }
// };

// //create queue instance
// let queue = kue.createQueue({
//     prefix: 'q',
//     redis: {
//         host: config.redis.host,
//         port: config.redis.port,
//         db: config.redis.kueDb,
//         options: {}
//     }
// });

// // Connect to MongoDB
// mongoose.connect(config.db_url, connectOptions);
// let db = mongoose.connection;

// db.on('error', console.error.bind(console, ' Sync Database connection error:'));
// db.once('open', function callback() {
//     console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
// });
// db.on('reconnected', function () {
//     console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
// });
// db.on('disconnected', function () {
//     console.log('Money DB DISCONNECTED');
// });

// //when nodejs process ends, close mongoose connection
// process.on('SIGINT', function () {
//     db.close(function () {
//         console.log('Mongoose default connection disconnected through app termination');
//         process.exit(0);
//     });
// });

// let Email_Push_Auto = mongoose.model('EmailAutomationPush');
// let User = mongoose.model('User');
// let Device = mongoose.model('Device');
// let DeviceNotification = mongoose.model('DeviceNotification');
// let BackendNotification = mongoose.model('BackendNotification');
// let PushNotificationSession = mongoose.model('PushNotificationSession');
// let SearchQuery = mongoose.model('SearchQuery');
// let Account = mongoose.model('Account');
// let Administrator = mongoose.model('Administrator');
// let hook = require('../backend/routes/hook');


// const EMAIL_FAKE = ['ntlzz93@gmail.com', 'loint20@gmail.com', 'linhnhat@moneylover.me'];

// const MODE = {
//     'daily': 'daily',
//     'monthly': 'monthly'
// };

// const SCHEDULE_BUS = {
//     '30_MINTUTES': '00 30 * * * *', // 30 phut 1 lan
//     'production': '00 * * * * *',
//     'one_hit_one_minute': '00 * * * * *'
// };

// const TYPE = {
//     'Email': 1,
//     'Push': 2
// };

// const EXCHANGE = {
//     'name': 'jobs',
//     'type': 'topic'
// };

// /* ===================RABBITMQ============================= */

// // Set up and start rabbit mq 
// function start() {
//     amqp.connect(config.rabbit.url, function (err, conn) {
//         if (err) {
//             // logger.log('error', JSON.stringify(err.message));
//             return setTimeout(start, 1000);
//         }
//         conn.on("error", function (err) {
//             if (err.message !== "Connection closing") {
//                 // logger.log('error', JSON.stringify(err.message));
//                 // console.log('Rabbit connection close');
//             }
//         });
//         conn.on("close", function () {
//             return setTimeout(start, 1000);
//         });
//         amqpConn = conn;
//         whenConnected();
//     });
// };

// function whenConnected() {
//     startPublisher();
//     startWorker();
// };

// let pubChannel = null;
// let offlinePubQueue = [];

// function startPublisher() {
//     amqpConn.createConfirmChannel(function (err, ch) {
//         if (closeOnErr(err)) return;
//         ch.on("error", function (err) {
//             // logger.log('error', JSON.stringify(err.message));
//             console.log(err);
//         });
//         ch.on("close", function () {
//             // logger.log('info', "[AMQP] channel closed");
//         });

//         pubChannel = ch;
//         // send back message for consumer if queue broken before
//         while (true) {
//             let m = offlinePubQueue.shift();
//             if (!m) break;
//             publish(m[0], m[1], m[2]);
//         }
//     });
// }
// // send message
// function publish(exchange, routingKey, content) {
//     try {
//         pubChannel.publish(exchange, routingKey, content, {
//             persistent: true
//         },
//             function (err, ok) {
//                 if (err) {
//                     // logger.log('error', JSON.stringify(err));
//                     offlinePubQueue.push([exchange, routingKey, content]);
//                     pubChannel.connection.close();
//                 }
//             });
//     } catch (e) {
//         // logger.log('error', JSON.stringify(e.message));
//         offlinePubQueue.push([exchange, routingKey, content]);
//     }
// }

// function startWorker() {
//     amqpConn.createChannel(function (err, ch) {
//         if (closeOnErr(err)) return;
//         ch.on("error", function (err) {
//             // logger.log('error', JSON.stringify(err.message));
//         });
//         ch.on("close", function () {
//             // logger.log('info', "[AMQP] channel closed");
//         });
//         // limit unacknowledged is 20 message
//         ch.prefetch(20);
//         ch.assertQueue(EXCHANGE['name'], {
//             durable: true
//         }, function (err, _ok) {
//             if (closeOnErr(err)) return;
//             // receive message
//             ch.consume(EXCHANGE['name'], processMsg, {
//                 noAck: false
//             });
//             // console.log("Worker is started");
//         });

//         function processMsg(msg) {
//             work(msg, function (ok) {
//                 try {
//                     if (ok)
//                         ch.ack(msg);
//                     else
//                         ch.reject(msg, true);
//                 } catch (e) {
//                     closeOnErr(e);
//                 }
//             });
//         }
//     });
// }

// function convertObjectToBufferAndPublish(object) {
//     publish("", EXCHANGE['name'], new Buffer(JSON.stringify(object)));
// }

// function convertBufferToObject(buffer) {
//     return JSON.parse(buffer.content.toString());
// }

// // excute message
// function work(msg, cb) {
//     let receivedObject = convertBufferToObject(msg);
//     updateNextSchedule(receivedObject, function (error, result) {
//         if (error) {
//             cb(false);
//         } else {
//             cb(true);
//         }
//     });
// }

// function closeOnErr(err) {
//     if (!err) return false;
//     // logger.log('error', JSON.stringify(err));
//     amqpConn.close();
//     return true;
// }

// function pushToSlack(user, content) {
//     slackbot.send(user, JSON.stringify(content), function (err, response, body) {
//     });
// }

// start();

// /* ===================END RABBIT============================= */

// /* ===================EMAIL CRONJOB============================= */

// let getListAutoEmail = function (callback) {
//     // thoi gian cach nhau nua tieng
//     let startDate = moment().subtract(0.5, 'hours').toDate();
//     let currentDate = moment().toDate().toISOString();

//     let startCronJobTimeLog = 'Email Cronjob runned at ' + currentDate;

//     let condition = {
//         isEnabled: true,
//         type: TYPE['Email'],
//         nextRun: {
//             $gte: startDate,
//             $lt: currentDate
//         }
//     };

//     Email_Push_Auto.find(condition)
//         .populate('searchQuery')
//         .exec(callback);
// };


// let generateEmailItem = function (object, resultFromSeachQuery) {
//     let returnObject = {};

//     returnObject._id = object._id;
//     returnObject.name = object.name;
//     returnObject.emails = resultFromSeachQuery.hits.hits;
//     returnObject.template = object.metadata.template;
//     returnObject.hourRun = object.metadata.hourRun;
//     returnObject.subject = object.metadata.subject;
//     returnObject.fromEmail = object.metadata.fromEmail;
//     returnObject.fromName = object.metadata.fromName;
//     returnObject.replyTo = object.metadata.replyTo;

//     return returnObject;
// };

// let getListEmailBySearhQuery = function (listAutoEnable, callback) {
//     async.mapSeries(listAutoEnable, function (item, cb) {
//         let options = utils.skipLimitSearchQueryDetect(item.searchQuery.query, {});
//         let query = utils.createUserQuery(item.searchQuery.query);
//         let listEmailFromSource = [];

//         User.search(query, options, (err, result) => {
//             if (err) {
//                 return cb(err, null);
//             } else {
//                 listEmailFromSource.push(generateEmailItem(item, result));

//                 return cb(null, listEmailFromSource);
//             }
//         });
//     }, callback);
// };

// let convertEmailSource = function (listEmailFromSource) {
//     let newArr = [];

//     for (let i = 0; i < listEmailFromSource.length; i++) {
//         newArr = newArr.concat(listEmailFromSource[i]);
//     }
//     return new Promise(function (resolve, reject) {
//         resolve(newArr);
//     });
// };

// let convertDeviceSource = function (listDeviceSource) {
//     let newArr = [];
//     for (let i = 0; i < listDeviceSource.length; i++) {
//         newArr = newArr.concat(listDeviceSource[i]);
//     }

//     return new Promise(function (resolve, reject) {
//         resolve(newArr);
//     });

// };

// let generateContentListWizz = function (infoWizz) {
//     let currentDate = moment().toDate().toISOString();
//     let info = {};

//     info.name = 'Campaign ' + infoWizz.name;
//     info.description = 'list created automation at ' + currentDate;
//     info.fromName = infoWizz.fromName;
//     info.fromEmail = infoWizz.fromEmail;
//     info.subject = infoWizz.subject;
//     info.replyTo = infoWizz.replyTo;
//     info.urlTracking = 'yes';

//     return info;
// };

// function checkTemplateExist(templateId) {
//     return new Promise(function (resolve, reject) {
//         let Templates = new mailwizzSdk.Templates(wizzConfig);

//         Templates.getTemplate(templateId)
//             .then(function (template) {
//                 resolve(template);
//             })
//             .catch(function (err) {
//                 reject(err);
//             })
//     });
// }

// let createListWizz = function (listEmailFromSource, callback) {

//     convertEmailSource(listEmailFromSource).then(function (newArr) {
//         async.eachSeries(newArr, function (item, cb) {
//             async.setImmediate(() => {
//                 let info = generateContentListWizz(item);
//                 let listSDK = new mailwizzSdk.Lists(wizzConfig);
//                 // console.log(item);
//                 listSDK.create(info)
//                     .then(function (result) {
//                         result = JSON.parse(result);
//                         info.listId = result.list_uid;

//                         async.series({
//                             putEmailIntoListCreated: function (done) {
//                                 putEmailIntoListCreated(item.emails, result.list_uid, done);
//                             },
//                             createCampaign: function (done) {
//                                 info.sendAt = moment().format('YYYY-MM-DD hh:mm:ss');

//                                 if (typeof item.template != 'object') {
//                                     item.template = JSON.parse(item.template);
//                                 }

//                                 info.templateId = item.template.id;
//                                 // check template exits
//                                 checkTemplateExist(info.templateId)
//                                     .then(function (template) {
//                                         createCampaign(info, done);
//                                     })
//                                     .catch(function (error) {
//                                         console.log('check template error ', item.template + ' => ' + error);
//                                         done();
//                                     })
//                             },
//                             lastRunningCampaign: function (done) {
//                                 let currentDate = moment().toDate().toISOString();
//                                 updateLastSchedule(item._id, currentDate, done);
//                             }
//                         }, cb);
//                     })
//                     .catch(cb);
//             });
//         }, callback);
//     });
// };

// let putItemIntoQueue = function (listItemEnable, callback) {
//     convertObjectToBufferAndPublish(listItemEnable);
//     callback(null, listItemEnable);
// };

// let updateLastSchedule = function (_id, lastRun, callback) {
//     Email_Push_Auto.findByIdAndUpdate(_id, { lastRun: lastRun }, callback);
// };

// let excuteNextRun = function (hourRun, type, callback) {
//     if (type === 'day') {
//         hourRun = moment(hourRun).add('1', 'days');
//     } else if (type === 'month') {
//         hourRun = moment(hourRun).add('1', 'months');
//     }

//     callback(hourRun);

// };

// let updateNextScheduleIteratorFunc = function (item, callback) {
//     async.setImmediate(() => {
//         if (item.mode === MODE['daily']) {
//             excuteNextRun(item.nextRun, 'day', function (nextRunUpdate) {
//                 Email_Push_Auto.findOneAndUpdate({ _id: item._id }, { nextRun: nextRunUpdate }, callback);
//             });
//         } else if (item.mode === MODE['monthly']) {
//             excuteNextRun(item.nextRun, 'month', function (nextRunUpdate) {
//                 Email_Push_Auto.findOneAndUpdate({ _id: item._id }, { nextRun: nextRunUpdate }, callback);
//             });
//         }
//     });
// };

// let updateNextSchedule = function (listRecord, callback) {
//     async.eachSeries(listRecord, updateNextScheduleIteratorFunc, callback);
// };

// let putEmailIntoListCreated = function (EmailFromSource, list_uid, callback) {
//     /* Product */
//     async.eachSeries(EmailFromSource, function (item, cb) {
//         async.setImmediate(() => {
//             let listSubscriber = new mailwizzSdk.ListSubscribers(wizzConfig);

//             // validate email
//             if (utils.isEmail(item._source.email)) {
//                 listSubscriber.create(list_uid, item._source.email, '', '')
//                     .then(function (result) {
//                         cb();
//                     })
//                     .catch(function (err) {
//                         // logger.log('error', JSON.stringify(err));
//                         console.log('putEmailIntoListCreated error ', err);
//                         cb();
//                     });
//             } else {
//                 cb();
//             }
//         });
//     }, callback);

// };

// let createCampaign = function (info, callback) {
//     let campaigns = new mailwizzSdk.Campaigns(wizzConfig);

//     campaigns.create(info)
//         .then(function (result) {
//             return callback(null, null);
//         }).catch(function (err) {
//             console.log('create campaign error ', err);
//             return callback(err, null);
//         });
// };

// /* ===================END EMAIL CRONJOB============================= */

// /* ===================PUSH CRONJOB============================= */

// let getListAutoPush = function (callback) {
//     // thoi gian cach nhau nua tieng
//     let startDate = moment().subtract(0.5, 'hours').toDate();
//     let currentDate = moment().toDate().toISOString();

//     let startCronJobTimeLog = 'Push Cronjob runned at ' + currentDate;


//     let condition = {
//         isEnabled: true,
//         type: TYPE['Push'],
//         nextRun: {
//             $gte: startDate,
//             $lt: currentDate
//         }
//     };

//     Email_Push_Auto.find(condition)
//         .populate('searchQuery')
//         .exec(callback);
// };

// let getAdministrator = function (callback) {
//     Administrator.find({ isAdminSystem: true }, callback);
// };

// let backendPushLog = function (adminId, content, callback) {
//     async.eachSeries(adminId, function (admin, done) {
//         async.setImmediate(() => {
//             BackendNotification.addNew(admin._id, 'backend_push', 'Push notification "' + content + '" completed', '/messages', function (error, result) {
//                 if (error) {
//                     done(error);
//                 } else {
//                     if (result) {
//                         hook.pushBackendNotification(result._id, done);
//                     } else {
//                         done();
//                     }
//                 }
//             });
//         });
//     }, function (error) {
//         if (error) {
//             return callback(error);
//         } else return callback();
//     });
// };

// let getUserIdBySearhQuery = function (listItemEnable, callback) {
//     // console.log(listItemEnable);
//     async.mapSeries(listItemEnable, function (item, cb) {
//         let options = utils.skipLimitSearchQueryDetect(item.searchQuery.query, {});
//         let query = utils.createUserQuery(item.searchQuery.query);

//         let session_info = generateSessisonInfoObject(item);
//         let objectMessage = item.metadata;
//         let idRecord = item._id;
//         // console.log('objectMessage',objectMessage);
//         let title = objectMessage.title;
//         let adminId = [];

//         User.search(query, options, (err, result) => {
//             if (err) {
//                 return cb(err);
//             }

//             PushNotificationSession.addNew(session_info, function (createSessionErr, createSessionResult) {
//                 if (createSessionErr) {
//                     cb();
//                 } else {
//                     let listUserId = result.hits.hits;

//                     async.series([
//                         function (next) {
//                             //increase search-query use count
//                             SearchQuery.pushCountIncrement(session_info.searchQuery); // search_query id
//                             next();
//                         },
//                         function (next) {
//                             let notificationInfo = objectMessage;
//                             pushNotification(createSessionResult._id, notificationInfo, listUserId, idRecord, next);
//                         },
//                         function (next) {
//                             getAdministrator(function (error, result) {
//                                 if (error) {
//                                     return next(error);
//                                 } else {
//                                     for (let id of result) {
//                                         adminId.push(id);
//                                     }
//                                     return next();
//                                 }
//                             });
//                         },
//                         function (next) {
//                             backendPushLog(adminId, title, next);
//                         }
//                     ], cb);

//                 }
//             });
//         });
//     }, callback);
// };

// function pushNotification(session, notification, listUserId, idRecord, callback) {
//     let listDevice = [];
//     async.series([
//         function (cb) {
//             getDeviceFromUserId(listUserId, function (deviceList) {
//                 if (deviceList) {
//                     listDevice = deviceList;
//                     cb(null, null);
//                 } else {
//                     cb(null, []);
//                 }
//             });
//         },
//         function (cb) {
//             if (listDevice.length === 0) {
//                 return cb();
//             }
//             convertDeviceSource(listDevice).then(function (listDevice) {
//                 sendSingleNotificationByKue(session, notification, listDevice, idRecord, cb);
//             });
//         },
//         // function (cb) {
//         //     let messageId = notification._id;
//         //     let objectCreate = {
//         //         notification: messageId,
//         //         pushBy: notification.owner._id,
//         //         approvedBy: notification.owner._id,
//         //         status: 'Accepted'
//         //     };
//         //     PushNotificationSession.addNew(objectCreate, cb);
//         // },
//         function (cb) {
//             changeSessionStatus(session, 'Accepted', cb);
//         }
//     ], callback);
// };

// function changeSessionStatus(session_id, status, callback) {
//     PushNotificationSession.changeStatus(session_id, status, callback);
// };

// function sendSingleNotificationByKue(session, notification, deviceIdList, idRecord, callback) {
//     //mỗi device là một kue job

//     async.eachSeries(deviceIdList, (deviceId, cb) => {
//         async.setImmediate(() => {
//             Device.findById(deviceId, (err, device) => {
//                 if (err) return cb(err);
//                 if (!device) return cb();

//                 ////// theo doi ///////////////
//                 // let pushInfo = {
//                 //     session: session,
//                 //     notification: notification,
//                 //     device: device
//                 // };

//                 // pushToSlack('@loint', pushInfo);
//                 ////////////////////////////

//                 let job = queue.create('push_notification', {
//                     session: session,
//                     notification: notification,
//                     device: device,
//                     action: 0
//                 }).removeOnComplete(true).save();
//                 job.on('complete', function () {
//                     //update tracking sent status
//                     async.series([
//                         function (done) {
//                             saveUserNotificationTracking(session, device._id, 'sent', done);
//                         },
//                         function (done) {
//                             updateLastRunnedPush(idRecord, done);
//                         }
//                     ], function (error, result) {
//                         if (error) {
//                             // pushToSlack('@loint', error);
//                             return cb();
//                         } else {
//                             return cb();
//                         }
//                     });
//                 }).on('failed', function (errorMessage) {
//                     //update tracking failed status

//                     saveUserNotificationTracking(session, device._id, 'error', function (error, result) {
//                         if (error) {
//                             // pushToSlack('@loint', error);
//                             return cb();
//                         } else {
//                             return cb();
//                         }
//                     });
//                 });
//             });
//         });
//     }, callback);
// };

// let updateLastRunnedPush = function (idRecord, callback) {
//     let currentDate = moment().toDate().toISOString();
//     updateLastSchedule(idRecord, currentDate, callback);
// };

// function saveUserNotificationTracking(sessionId, deviceId, state, callback) {
//     DeviceNotification.addNew({ device: deviceId, session: sessionId, state: state }, callback);
// };

// function scheduleTimeParser(dateTime) {
//     //string_time format DD/MM/YYYY hh:mm
//     let date = moment(dateTime);
//     let year = moment().year();
//     let month = moment().month();
//     let day = moment().date();
//     let hour = moment().hour();
//     let mintute = moment().minute();

//     return day + '/' + month + '/' + year + ' ' + hour + ':' + mintute;
// };

// let generateSessisonInfoObject = function (itemEnableObject) {
//     let notification = itemEnableObject.metadata._id;
//     let searchQuery = itemEnableObject.searchQuery._id;
//     let adminId = itemEnableObject.metadata.owner._id;
//     let schedule_time = scheduleTimeParser(itemEnableObject.nextRun); // convert to cronjob time

//     let session_info = {
//         notification: notification,
//         searchQuery: searchQuery,
//         pushBy: adminId,
//         approvedBy: adminId,
//         schedule_time: schedule_time
//     };
//     return session_info;
// };

// let getDeviceFromUserId = function (itemList, callback) {
//     let devideList = [];

//     /* FAKE DEVICE*/
//     // itemList = [{
//     //     _id: '52e099a311f9947d5800000e'
//     // }, {
//     //     _id: "5314871edc096b7e760000b7"
//     // }];

//     async.eachSeries(itemList, function (item, next) {
//         async.setImmediate(() => {
//             getFromDeviceModel(item._id, function (error, device) {
//                 if (error) {
//                     next(error);
//                 } else {
//                     if (device) {
//                         devideList.push(device);
//                     }
//                     next();
//                 }
//             });
//         });
//     }, function (error) {
//         if (error) {
//             callback(null);
//         } else {
//             callback(devideList);
//         }
//     });
// };

// let getFromDeviceModel = function (userId, callback) {
//     let userObjectId = mongoose.Types.ObjectId(userId);
//     Device.find({ owner: userObjectId }, function (error, result) {
//         if (error) {
//             return callback(error, null);
//         } else {
//             return callback(null, result);
//         }
//     });
// };

// /* ===================END PUSH CRONJOB============================= */

// /* =================== SET UP CRONJOB WORKER ============================= */

// let emailCronJob = new CronJob({
//     cronTime: SCHEDULE_BUS['production'],
//     onTick: sendEmail,
//     start: false,
//     timeZone: 'Asia/Ho_Chi_Minh'
// });

// function sendEmail() {
//     async.waterfall([
//         getListAutoEmail,
//         putItemIntoQueue,
//         getListEmailBySearhQuery,
//         createListWizz
//     ], function (err, result) {
//         if (err) {
//             // logger.log('error', JSON.stringify(err));
//             console.log(err);
//         }
//     });
// }

// function pushNotificationCron() {
//     async.waterfall([
//         getListAutoPush,
//         putItemIntoQueue,
//         getUserIdBySearhQuery
//     ], function (err, result) {
//         if (err) {
//             // logger.log('error', JSON.stringify(err));
//             console.log(err);
//         }
//     });
// }

// let pushCronJob = new CronJob({
//     cronTime: SCHEDULE_BUS['production'],
//     onTick: pushNotificationCron,
//     start: false,
//     timeZone: 'Asia/Ho_Chi_Minh'
// });

// emailCronJob.start();
// pushCronJob.start();

