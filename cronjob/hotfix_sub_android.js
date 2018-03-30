
// /* 
//     Deactive finsify when account expire (rwExpire) and android subscription renew
// */

// 'use strict';

// let env = process.env.NODE_ENV;

// const mongoose = require('mongoose');
// const config = require('../config/config')[env];
// const CronJob = require('cron').CronJob;
// const moment = require('moment');
// const async = require('async');
// const utils = require('../helper/utils');
// const path = require('path');
// const Slackbot = require('slackbot');
// const slackbot = new Slackbot('moneylover', '50cXqEaCuKrX0LiyfaISgtFf');
// const Request = require('request');
// const LogDb = require('../model/helper/mongodb_connect_logs');
// const GOOGLE_CONSOLE_API_KEY_CONFIG = require('../config/google_play_api');
// const _underscore = require('underscore');
// const ErrorCode = require('../config/error');
// /*
//     Interface
// */
// const IapInterface = require('../route/items/item');
// const SubscriptionProductInterface = require('../route/items/item_subscription');

// const iapInterface = new IapInterface();
// const subscriptionInterface = new SubscriptionProductInterface();

// const debug = require('debug')('deactive:debug');

// const FINSIFYBASEURL = config.finsifyBaseUrl;
// const FINSIFYCLIENTID = config.clientFinsify;
// const FINSIFYSERVICESECRET = config.secretFinsify;

// const GOOGLE_CONSOLE_API_KEY = {
//     "client_id": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.client_id,
//     "project_id": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.project_id,
//     "auth_uri": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.auth_uri,
//     "token_uri": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.token_uri,
//     "auth_provider_x509_cert_url": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.auth_provider_x509_cert_url,
//     "client_secret": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.client_secret,
//     "redirect_uris": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.redirect_uris,
//     "refresh_token": GOOGLE_CONSOLE_API_KEY_CONFIG.CONFIG_SUB.refresh_token,
//     "package_name": "com.bookmark.money"
// };

// process.on('uncaughtException', function (err) {
//     console.log(err.stack);
// });

// process.on('exit', function (code) {
//     console.log('About to exit with code: ' + code);
// });

// require('../model/user');
// require('../model/device');
// require('../model/device_notification');
// require('../model/backend_notification');
// require('../model/push_notification_session');
// require('../model/account');
// require('../model/sale_log');
// require('../model/subscription_renew_log');
// require('../model/item_log');


// let connectOptions = {
//     server: {
//         auto_reconnect: true
//     }
// };
// // Connect to MongoDB
// mongoose.Promise = require('bluebird');
// mongoose.connect(config.db_url, connectOptions);
// const db = mongoose.connection;

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

// const User = mongoose.model('User');
// const Device = mongoose.model('Device');
// const DeviceNotification = mongoose.model('DeviceNotification');
// const BackendNotification = mongoose.model('BackendNotification');
// const PushNotificationSession = mongoose.model('PushNotificationSession');
// const Account = mongoose.model('Account');
// const SaleLogModel = LogDb.model('SaleLog');
// const SubscriptionRenewLog = LogDb.model('SubscriptionRenewLog');
// const ProductModel = mongoose.model('Item');
// const hook = require('../backend/routes/hook');
// const pushController = require('../model/sync/push_controller');

// const SCHEDULE_BUS = {
//     'test': '00 * * * * *',
//     'production': '0 0 02 * * *'
// };

// const ACCOUNT_TYPE = {
//     LINKET_WALLET: 2,
//     OTHER: 0
// }

// const Rabbit = require('./android_sub_rabbit/lib/rabbit');

// const RawDataPublisher = new Rabbit.default({
//     tag: 'white-house-worker-androidhook',
//     exchanges: [Rabbit.JOB_EXCHANGE]
// });

// const EVENT_NAME = 'hook.ready.android_hook';

// function findUserExpireWork(callback) {
//     let today = moment();

//     let startDate = moment().startOf('days').subtract('2', 'day').toDate();
//     let endDate = moment().endOf('days').subtract('2', 'day').toDate();
//     let condition;

//     condition = {
//         rwExpire: {
//             $gte: startDate,
//             $lt: endDate
//         }
//     };

//     User.find(condition)
//         .lean(true)
//         .exec(callback);
// }

// function findLinkedWalletOwnWork(users, callback) {
//     let listWallet = [];
//     async.eachSeries(users, function (user, cb) {
//         Account.find({
//             owner: user._id,
//             account_type: { $gt: 0 },
//             // isDelete: false
//         }, function (error, wallet) {
//             if (error) {
//                 cb(error, null);
//             } else {
//                 // debug('wallets ',wallet);
//                 if (wallet.length > 0) {
//                     wallet.forEach(function (item) {
//                         let generateContentLog = {
//                             user: user,
//                             wallet: item
//                         }
//                         // slackPushMarkdown(generateContentLog);
//                         listWallet.push(item);
//                     });
//                 }

//                 cb(null, null);
//             }
//         });
//     }, function (err) {
//         if (err) {
//             callback(err, null);
//         } else {
//             callback(null, listWallet);
//         }
//     });
// }

// function requestFinsifyServerDeactive(loginSecret) {
//     return new Promise(function (resolve, reject) {
//         let opstions = {
//             url: FINSIFYBASEURL + '/login/deactivate',
//             method: 'PUT',
//             headers: {
//                 'content-type': 'application/json',
//                 'charset': 'utf-8',
//                 'Client-id': FINSIFYCLIENTID,
//                 'App-secret': FINSIFYSERVICESECRET,
//                 'Login-secret': loginSecret
//             },
//             body: {

//             }
//         };

//         requestFunc(opstions)
//             .then(function (data) {
//                 // pushToSlack("@loint", data);
//                 resolve(data);
//             }).catch(function (error) {
//                 // pushToSlack("@loint", error.toString());
//                 reject(error);
//             });
//     });
// }

// function requestFunc(options) {
//     return new Promise((resolve, reject) => {
//         Request.put({ url: options.url, headers: options.headers, form: options.body }, (err, response, body) => {
//             if (err) {
//                 return reject(err);
//             } else
//                 resolve(body);
//         });
//     });
// };

// function deactiveWork(listWallet, callback) {
//     async.eachSeries(listWallet, function (wallet, cb) {
//         debug('wallet work ', wallet);
//         let secret;
//         let login_id;

//         if (wallet.rwInfo) {
//             debug('has wallet rwInfo');
//             secret = wallet.rwInfo.secret;
//             login_id = wallet.rwInfo.login_id;
//         } else {
//             let metadata = JSON.parse(wallet.metadata);
//             debug('has no rwInfo');
//             secret = metadata.secret;
//             login_id = metadata.login_id;
//         }

//         if (!login_id || !secret) {
//             let metadata = JSON.parse(wallet.metadata);
//             debug('retry');
//             secret = metadata.secret;
//             login_id = metadata.login_id;
//         }

//         debug('secret ', secret);
//         debug('login_id ', login_id);
//         async.parallel({
//             deactiveFinsifyWallet: function (next) {
//                 requestFinsifyServerDeactive(secret)
//                     .then(function (data) {
//                         // slackPushMarkdown(wallet);
//                         next();
//                     }).catch(function (error) {
//                         next(error);
//                     })
//             },
//             InactiveMLWallet: function (next) {
//                 Account.deactiveLinkedWallet(wallet._id, ErrorCode.SUBSCRIPTION_CODE_EXPIRE, "subscription expire", next);
//             }
//         }, cb);
//     }, function (err) {
//         if (err) callback(err, null);
//         else callback(null, null);
//     });
// }

// function findUserBill(users, callback) {
//     let listBill = [];
//     async.eachSeries(users, function (user, next) {
//         async.setImmediate(() => {
//             let billInfo = {
//                 product_id: user.rwProduct,
//                 user: user._id
//             };

//             SaleLogModel.find(billInfo, function (err, result) {
//                 if (err) {
//                     next(err);
//                 } else {
//                     async.eachSeries(result, function (bill, cb) {
//                         listBill.push(bill);
//                         cb();
//                     }, next);
//                 }
//             });
//         });
//     }, function (error) {
//         if (error) {
//             callback(error, null);
//         } else {
//             callback(null, listBill);
//         }
//     });
// }

// const CHANNEL_SLACK = '#finsify_deactive_log';
// const hookSlackBot = 'https://hooks.slack.com/services/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';

// function pushToSlack(user, content) {
//     slackbot.send(user, JSON.stringify(content), function (err, response, body) {
//     });
// }

// function slackPushMarkdown(generateContentLog) {
//     Request({
//         "url": hookSlackBot,
//         "method": 'POST',
//         "json": true,
//         "body": {
//             "author_name": "Big Noise",
//             "attachments": [
//                 {
//                     "fallback": "Finsify deactive log",
//                     "pretext": "Hi human! You are a new message",
//                     "color": "#36a64f",
//                     "title": "Hi human! You are a new message",
//                     "text": generateContentLog.owner._id,
//                     "fields": [
//                         {
//                             title: 'User id',
//                             value: generateContentLog.owner._id,
//                             short: true
//                         },
//                         {
//                             title: 'Login Id',
//                             value: generateContentLog.rwInfo.login_id,
//                             short: true
//                         },
//                         {
//                             title: 'Expire',
//                             value: generateContentLog.rwInfo.message,
//                             short: true
//                         },
//                         {
//                             title: 'Status',
//                             value: 'Deactive',
//                             short: true
//                         }
//                     ],
//                     "footer": "Slack API",
//                     "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
//                 }
//             ],
//             mrkdwn: true
//         }
//     }, (error, res, body) => {

//     });
// }

// function slackRenewSubscriptionPush(generateContentLog) {
//     Request({
//         "url": "https://hooks.slack.com/services/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",
//         "method": 'POST',
//         "json": true,
//         "body": {
//             "author_name": "Big Noise",
//             "attachments": [
//                 {
//                     "fallback": "Renew Subscription Android log",
//                     "pretext": "Renew Subscription Android log",
//                     "color": "#36a64f",
//                     "title": "Renew Subscription Android log",
//                     "text": generateContentLog.user,
//                     "fields": [
//                         {
//                             title: 'product_id',
//                             value: generateContentLog.product_id,
//                             short: true
//                         },
//                         {
//                             title: 'Bill',
//                             value: generateContentLog.bill_id,
//                             short: true
//                         },
//                         {
//                             title: 'user',
//                             value: generateContentLog.user,
//                             short: true
//                         },
//                         {
//                             title: 'Expire',
//                             value: generateContentLog.expire,
//                             short: true
//                         },
//                         {
//                             title: 'platform',
//                             value: generateContentLog.platform,
//                             short: true
//                         }
//                     ],
//                     "footer": "Slack API",
//                     "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
//                 }
//             ],
//             mrkdwn: true
//         }
//     }, (error, res, body) => {

//     });
// }

// function mainFunc() {
//     let users = [];
//     let listWallet = [];
//     let listWalletDeactive = [];
//     let listBill = [];
//     let access_token;
//     let isRenew = false;
//     let isCancel = false;
//     let deviceTokens = [];

//     let listUserRenewed = [];
//     async.series({
//         findUserExpire: function (callback) {
//             findUserExpireWork(function (error, result) {
//                 if (error) {
//                     callback(error, null);
//                 } else {
//                     users = result;
//                     console.log('users ', users);
//                     // if (env !== 'production') {
//                     //     users.push({
//                     //         _id: "5858b08b77d71e871ffe7775",
//                     //         rwExpire: "2017-09-02T11:01:35.862Z",
//                     //         rwProduct: "finsify_sub_month_1"
//                     //     });
//                     // }

//                     callback(null, null);
//                 }
//             });
//         },
//         findDeviceToken: function (callback) {
//             async.eachSeries(users, function (user, next) {
//                 async.setImmediate(() => {
//                     getTokenDeviceUser(user._id, function (error, devices) {
//                         if (!error) {
//                             async.eachSeries(devices, function (device, cb) {
//                                 async.setImmediate(() => {
//                                     if (device.tokenDevice) {
//                                         deviceTokens[user._id] = device.tokenDevice;
//                                     }
//                                     cb();
//                                 });
//                             }, next);
//                         } else {
//                             next();
//                         }
//                     });
//                 })
//             }, callback);
//         },
//         excuteBeforeActive: function (callback) {
//             if (users.length > 0) {
//                 async.series({
//                     findLinkedWallet: function (cb) {
//                         findLinkedWalletOwnWork(users, function (error, result) {
//                             if (error) {
//                                 cb(error, null);
//                             } else {
//                                 listWallet = result;
//                                 debug('wallets ', listWallet);
//                                 // if (env != 'production') {
//                                 //     listWallet.push({
//                                 //         "acc_id": "993",
//                                 //         "login_id": "638",
//                                 //         "secret": "718ade6d-e00e-42ba-81fb-232461e233a2",
//                                 //         "balance": 2275.58
//                                 //     });
//                                 // }
//                                 cb(null, null);
//                             }
//                         });
//                     },
//                     findBill: function (cb) {
//                         findUserBill(users, function (error, bills) {
//                             if (error) {
//                                 cb(error, null);
//                             } else {
//                                 listBill = bills;
//                                 debug('bills ', bills);
//                                 cb(null, null);
//                             }
//                         });
//                     },
//                     generateAccessToken: function (cb) {
//                         generateAccessToken(function (error, at) {
//                             if (error) {
//                                 cb(error, null);
//                             } else {
//                                 access_token = at;
//                                 cb(null, null);
//                             }
//                         });
//                     },
//                     validateAndGetExpire: function (cb) {
//                         // if (env !== 'production') {
//                         //     let b = {
//                         //         product_id: "finsify_sub_year_1_a",
//                         //         price: 199000,
//                         //         sale_date: new Date(),
//                         //         bill_id: "nmahcgdblfaemdakmiiakanm.AO-J1OzeJvqiSZNqELazPpxYHGz9QxFzjyPQelX8Mlzy8DKibsAaAvMmNiB-ECOLXVWRqk7-D1sWZZuvFNJPvHcdKg7R5xTo_8mRu3agkF63ATmY2d5DPc5xWeufUBq2RQgoQ2p5L2XQ",
//                         //         user: "5858b08b77d71e871ffe7775"
//                         //     }

//                         //     listBill.push(b);
//                         // }

//                         async.eachSeries(listBill, function (bill, next) {
//                             async.setImmediate(() => {
//                                 purchaseSubscriptionGet(access_token, bill, function (error, resource) {
//                                     if (error) {
//                                         next(error, null);
//                                     } else {
//                                         if (resource) {

//                                             if (typeof resource != 'object') {
//                                                 resource = JSON.parse(resource);
//                                             }

//                                             if (resource.cancelReason === 0 || resource.cancelReason === 1) {
//                                                 // user cancel sub
//                                                 isRenew = false;
//                                                 isCancel = true;

//                                                 listWallet.forEach((wallet) => {
//                                                     if (wallet.owner == bill.user && wallet.rwProduct === bill.product_id) {
//                                                         listWalletDeactive.push(wallet.rwInfo);
//                                                     }
//                                                 });

//                                                 // deactiveWork(listWalletDeactive, next);
//                                                 next();
//                                             } else if (resource.autoRenewing) {
//                                                 // auto renew successfully
//                                                 isRenew = true;
//                                                 let expire_time = moment(parseInt(resource.expiryTimeMillis)).toDate();
//                                                 /**
//                                                    * 1-Payment received
//                                                    *  2-Free trial
//                                                    */
//                                                 if (resource.paymentState === 1 || resource.paymentState === 2) {
//                                                     let developerPayload = resource.developerPayload;
//                                                     listUserRenewed.push(bill.user);
//                                                     // updateExpireUser(bill, expire_time, next);
//                                                     // findProductInfo(bill.product_id).then((productInfo) => {
//                                                     //     let purchaseInfo = {
//                                                     //         userId: bill.user,
//                                                     //         tokenDevice: deviceTokens[bill.user],
//                                                     //         source: 'googleplay',
//                                                     //         expire_date_ms: expire_time,
//                                                     //         purchase_date_ms: new Date().valueOf(),
//                                                     //         product_id: bill.product_id
//                                                     //     };

//                                                     //     IapInterface.setPurchaseInfo(purchaseInfo, productInfo).then((object) => {
//                                                     //         debug(object);
//                                                     //         subscriptionInterface.purchase(object).then((reponse) => {
//                                                     //             debug(reponse);
//                                                     //             return next()
//                                                     //         }).catch((error) => {
//                                                     //             debug(error);
//                                                     //             return next()
//                                                     //         })
//                                                     //     });
//                                                     // }).catch((error) => {
//                                                     //     debug(error);
//                                                     //     return next();
//                                                     // })

//                                                     let purchaseInfo = {
//                                                         userId: bill.user,
//                                                         tokenDevice: deviceTokens[bill.user],
//                                                         source: 'googleplay',
//                                                         expire_date_ms: expire_time,
//                                                         purchase_date_ms: new Date().valueOf(),
//                                                         product_id: bill.product_id,
//                                                         bill_id: bill.bill_id
//                                                     };

//                                                     RawDataPublisher.publish(EVENT_NAME, purchaseInfo, Rabbit.PRIORITY.critical, function () {
//                                                         next()
//                                                     });
//                                                 }
//                                                 else {
//                                                     next();
//                                                 }
//                                             } else {
//                                                 isRenew = false;
//                                                 next();
//                                             }
//                                         } else {
//                                             isRenew = false;
//                                             next();
//                                         }
//                                     }
//                                 });
//                             })
//                         }, cb);

//                     },
//                     deactiveUserElse: function (cb) {
//                         let userAllExpireToday = users;
//                         let listUserRenewedWithBill = listUserRenewed;
//                         let userWillBeDeactive = [];
//                         let listWalletAllUser = listWallet;
//                         let listWalletWillDeactive = [];
//                         debug('userAllExpireToday ', userAllExpireToday);
//                         debug('listUserRenewedWithBill ', listUserRenewedWithBill);

//                         userWillBeDeactive = _underscore.difference(userAllExpireToday, listUserRenewedWithBill);
//                         debug('userWillBeDeactive ', userWillBeDeactive);

//                         async.series({
//                             findWalletDeactive: function (next) {
//                                 debug('userWillBeDeactive findWalletDeactive', userWillBeDeactive);
//                                 findLinkedWalletOwnWork(userWillBeDeactive, function (error, result) {
//                                     if (error) {
//                                         next(error, null);
//                                     } else {
//                                         listWalletWillDeactive = result;
//                                         debug('listWalletWillDeactive ', listWalletWillDeactive);
//                                         next(null, null);
//                                     }
//                                 })
//                             },
//                             deactive: function (next) {
//                                 deactiveWork(listWalletWillDeactive, next);
//                             },
//                             PushNotificationSession: function (next) {
//                                 debug('userWillBeDeactive PushNotificationSession ', userWillBeDeactive);
//                                 async.eachSeries(userWillBeDeactive, function (user, cb) {
//                                     debug('userId ', user._id);
//                                     async.setImmediate(() => {
//                                         pushController.pushWhenSubscriptionExpire(user._id, cb);
//                                     })
//                                 }, next);
//                             }
//                         }, cb);
//                     }
//                 }, callback);
//             } else {
//                 callback();
//             }
//         }
//     }, function (error, results) {
//         if (error) pushToSlack("@loint", error.toString());
//     });
// }

// function generateAccessToken(callback) {
//     Request.post({
//         url: GOOGLE_CONSOLE_API_KEY.token_uri,
//         json: true,
//         headers: {
//             "Content-Type": "application/x-www-form-urlencoded",
//             "access_type": "offline"
//         },
//         form: {
//             "grant_type": "refresh_token",
//             "client_id": GOOGLE_CONSOLE_API_KEY.client_id,
//             "client_secret": GOOGLE_CONSOLE_API_KEY.client_secret,
//             "refresh_token": GOOGLE_CONSOLE_API_KEY.refresh_token
//         }
//     }, function (err, response, body) {
//         if (err) {
//             callback(error, null);
//         } else {
//             let access_token = response.body.access_token;
//             callback(null, access_token);
//         }
//     });
// }

// /*
//     bill info

//     product_id: {type: String, index: true},
//     price: {type: Number},
//     sale_date: {type: Date, default: Date.now, index: true},
//     bill_id: {type: String, required: true, unique: true, index: true},
//     user: {type: String}
// */

// function purchaseSubscriptionGet(access_token, bill, callback) {
//     //"GET https://www.googleapis.com/androidpublisher/v2/applications/packageName/purchases/subscriptions/subscriptionId/tokens/token"
//     let url = "https://www.googleapis.com/androidpublisher/v2/applications/" + GOOGLE_CONSOLE_API_KEY.package_name + "/purchases/subscriptions/" + bill.product_id + "/tokens/" + bill.bill_id;

//     // console.log('url ', url);
//     // console.log('access_token ', access_token);
//     Request.get(url, {
//         'auth': {
//             "bearer": access_token
//         }
//     }, function (error, response, body) {
//         if (error) {
//             callback(error, null);
//         } else {
//             // pushToSlack("@loint", 'purchaseSubscriptionGet ================' + body);

//             if (body) {
//                 if (typeof body != 'object') {
//                     body = JSON.parse(body);
//                 }
//             }

//             callback(null, body);
//         }
//     });

// }

// function getTokenDeviceUser(user, callback) {
//     Device.findByUser(user, callback);
// }

// function updateExpireUser(bill, expire_time, callback) {
//     User.update({
//         _id: bill.user
//     }, { $set: { rwExpire: expire_time } }, function (error, result) {
//         if (error) {
//             callback(error, null);
//         } else {
//             let dataLog = {
//                 user: bill.user,
//                 expire: expire_time,
//                 product_id: bill.product_id,
//                 bill_id: bill.bill_id,
//                 platform: "android"
//             };
//             // slackRenewSubscriptionPush(dataLog);
//             getTokenDeviceUser(bill.user, function (error, devices) {
//                 if (!error) {
//                     async.eachSeries(devices, function (device, cb) {
//                         if (device.tokenDevice) {
//                             pushController.pushSubscriptionRenew(bill.user, expire_time, device.tokenDevice);
//                         }
//                         cb();
//                     }, function (error) {
//                     });
//                 }
//             });

//             logAutoRenewUser(dataLog, callback);
//         }
//     });
// }

// function updateExpireAfterTrial(bill, start_time, callback) {
//     User.findOne({
//         _id: user
//     }, function (err, user) {
//         if (err) {
//             callback(err, null);
//         } else {
//             if (user) {
//                 let rwExpire = user.rwExpire;
//                 let rwProduct = user.rwProduct;

//                 if (!rwExpire || !rwProduct) {
//                     return callback(null, null);
//                 }

//                 ///////////////////////////////////
//             } else {
//                 callback(null, null);
//             }
//         }
//     });
// }

// function logAutoRenewUser(recource, callback) {
//     SubscriptionRenewLog.addNew(recource, callback);
// }

// function findProductInfo(product_id) {
//     return new Promise((resolve, reject) => {
//         ProductModel.findByProductId(product_id, function (error, product) {
//             if (error) return reject(error);

//             return resolve(product);
//         })
//     })
// }


// let cronTime = (env === 'production') ? SCHEDULE_BUS['production'] : SCHEDULE_BUS['test'];

// if (env == 'production') {
//     // let deactiveSchedule = new CronJob({
//     //     cronTime: cronTime,
//     //     onTick: mainFunc,
//     //     start: false,
//     //     timeZone: 'Asia/Ho_Chi_Minh'
//     // });

//     // deactiveSchedule.start();
//     mainFunc();
// } else {
//     mainFunc();
//     // generateAccessToken(function () { });

// }



// // function test1() {
// //     let purchaseInfo = {
// //         userId: '1111',
// //         tokenDevice: 'aaaaa',
// //         source: 'googleplay',
// //         expire_date_ms: new Date().valueOf(),
// //         purchase_date_ms: new Date().valueOf(),
// //         product_id: 'bill.product_id',
// //         bill_id : 'bill_id'
// //     };

// //     RawDataPublisher.publish(EVENT_NAME, {
// //         purchaseInfo: purchaseInfo
// //     }, Rabbit.PRIORITY.critical, function () {

// //     });
// // }

// // test1();