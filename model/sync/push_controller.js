/**
 * Created by cuongpham on 29/02/16.
 */

'use strict';
let env = process.env.NODE_ENV;

let mongoose = require('mongoose');
let Device = mongoose.model('Device');
let Wallet = mongoose.model('Account');
let User = mongoose.model('User');
let kue = require('kue');

let config = require('../../config/config')[env];
let Email = require('../email');
let async = require('async');
let io = require('socket.io-emitter')({ host: config.redis.host, port: config.redis.port });
let redisClient = require('../../config/database').redisClient;
let moment = require('moment');
let elasticsearch = require('elasticsearch');
let elasticClient = new elasticsearch.Client({
    host: config.elasticsearch.hostUrl
});

let Utils = require('../../helper/utils');
let NotificationActions = require('../../config/notification_action_code').NOTIFICATION_ACTION;
let platformCodes = require('../../config/platform_codes').platformCode;
let appIdCodes = require('../../config/platform_codes').appIdCode;
let Error = require('../../config/error');
let SyncCodes = require('../../config/sync_codes');
let SyncActions = require('../../config/sync_contant');
let EVENTS = {
    BIZ: 'push_notification',
    TRANSACTION_NOTIFICATION: 'transaction_notification',
    SYSTEM_BACKEND_NOTIFICATION: 'system_backend_notification',
    SYNC: 'sync',
    SYSTEM_BACKEND_NOTIFICATION_AWS: 'system_backend_notification_aws'
};

let skipGetListUserFlags = [
    SyncCodes.WALLET + SyncActions.FLAG_ADD,
    SyncCodes.BUDGET,
    SyncCodes.CAMPAIGN,
    SyncCodes.SETTING
];

let pushLogIndexName = env + '_notification_error';

//Rabit config
const Rabbit = require('../../config/rabbit_push_notification/lib/rabbit');

const RawDataPublisher = new Rabbit.default({
    tag: 'white-house-worker-automation',
    exchanges: [Rabbit.JOB_EXCHANGE]
});

const EVENT_SEND_NOTIFICATION = 'hook.ready.send';

//create kue
let queue = kue.createQueue({
    prefix: 'q',
    redis: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.kueDb,
        options: {}
    }
});

function parseDevice(listDevice, tokenDevice) {
    let data = [];

    listDevice.forEach(function (device) {
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

function createElasticRecord(indexName, event, id, body) {
    if (!indexName || !event || !id || !body) {
        return;
    }

    let promise = new Promise(function (resolve, reject) {
        elasticClient.create({
            index: indexName,
            type: event,
            id: id,
            body: body
        }, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

    return promise;
}

function getListUserWallet(wallet_id) {
    let promise = new Promise(function (resolve, reject) {
        Wallet.findUser(wallet_id, function (data) {
            resolve(data);
        });
    });

    return promise;
}

function findAllDeviceByListUser(list_user, tokenDevice) {
    let promise = new Promise(function (resolve, reject) {
        Device.findByUsers(list_user, function (devices) {
            if (devices) {
                if (tokenDevice) {
                    resolve(parseDevice(devices, tokenDevice));
                } else {
                    resolve(devices);
                }
            } else {
                // reject(new Error('GetDeviceListFailed'));
                resolve([]);
            }
        });
    });

    return promise;
}

function findDeviceByPlatformAndUser(userId, platform, tokenDevice) {
    let query = { owner: userId };

    if (platform) {
        query.platform = platform;
    }

    let promise = new Promise(function (resolve, reject) {
        Device.find(query, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(parseDevice(result, tokenDevice));
            }
        });
    });

    return promise;
}

function findDevice(user_id, skipGetListUser, wallet_id, tokenDevice) {
    if (skipGetListUser) {
        return findAllDeviceByListUser([user_id], tokenDevice);
    }

    return getListUserWallet(wallet_id)
        .then(function (listUser) {
            return findAllDeviceByListUser(listUser, tokenDevice);
        });
}

function sendToDevice(content, device, event) {
    let promise = new Promise(function (resolve, reject) {
        queue.createJob(event, {
            device: device,
            content: content
        }).priority('critical').removeOnComplete(true).save();

        resolve();
    });

    return promise;

}

function sendToDeviceByRabbitMQ(content, device, hook_name) {
    return new Promise((resolve, reject) => {
        RawDataPublisher.publish(hook_name, {
            content: content,
            device: device
        }, Rabbit.PRIORITY.critical, function () {
            resolve();
        });
    });
}


function sendToListDevice(content, list_device, event) {
    let promise = new Promise(function (resolve, reject) {
        if (list_device.length === 0) {
            return resolve();
        }

        async.eachSeries(list_device, function (device, cb) {

            sendToDevice(content, device, event)
                .then(function () {
                    cb();
                })
                .catch(function (err) {
                    // recordPushFailLog(device, content, event, err);
                    cb();
                });
        }, function (error) {
            resolve();
        });
    });

    return promise;
}


function sendToListDeviceByRabbitMQ(content, list_device, hook_name) {
    let promise = new Promise(function (resolve, reject) {
        if (list_device.length === 0) {
            return resolve();
        }

        async.eachSeries(list_device, function (device, cb) {

            sendToDeviceByRabbitMQ(content, device, hook_name)
                .then(function () {
                    cb();
                })
                .catch(function (err) {
                    // recordPushFailLog(device, content, event, err);
                    cb();
                });
        }, function (error) {
            resolve();
        });
    });

    return promise;
}
// send with kue
function send(content, user_id, skipGetListUser, event, wallet_id, tokenDevice) {
    let promise = new Promise(function (resolve, reject) {
        findDevice(user_id, skipGetListUser, wallet_id, tokenDevice)
            .then(function (list_device) {
                sendToListDevice(content, list_device, event);
            })
            .then(function () {
                resolve();
            })
            .catch(function (error) {
                reject(error);
            });
    });

    return promise;
}
// send with rabbit
function sendByRabbitMQ(content, user_id, skipGetListUser, hook_name, wallet_id, tokenDevice) {
    let promise = new Promise(function (resolve, reject) {
        findDevice(user_id, skipGetListUser, wallet_id, tokenDevice)
            .then(function (list_device) {
                sendToListDeviceByRabbitMQ(content, list_device, hook_name);
            })
            .then(function () {
                resolve();
            })
            .catch(function (error) {
                reject(error);
            });
    });

    return promise;
}

let pushTransactionNotification = function (info) {
    if (!info || !info.user_id) {
        return 0;
    }

    let text = null;

    if (info.language && info.language === 'vi') {
        text = ' giao dịch mới được cập nhật'
    } else {
        let s = (info.new_transaction_amount > 1) ? 's' : '';
        text = ' transaction' + s + ' was updated';
    }

    let content = {
        am: info.new_transaction_amount,
        wl: info.wallet_id,
        m: info.new_transaction_amount + text,
        ac: NotificationActions.TRANSACTION_NOTIFICATION
    };

    let promise = new Promise(function (resolve, reject) {
        findDeviceByPlatformAndUser(info.user_id, 2, info.tokenDevice)
            .then(function (deviceList) {
                sendToListDevice(content, deviceList, EVENTS.TRANSACTION_NOTIFICATION);
            })
            .then(function () {
                resolve();
            })
            .catch(function (error) {
                reject(error);
            });
    });

    return promise;
};

let pushSyncNotification = function (info) {
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

let pushShareWallet = function (info) {
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

let pushAcceptShareWallet = function (info) {
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

let pushWidgetMessage = function (walletId) {
    let room = '/wallet/' + walletId;
    io.emit(room, 'PING');
    let keyInfo = 'widget-wallet-' + walletId + '-info',
        keyTransaction = 'widget-wallet-' + walletId + '-transaction';

    redisClient.DEL(keyInfo, keyTransaction, function (err, result) {
    });
};

let pushKickDevice = function (device, email) {
    if (!device || !email) {
        return;
    }

    let content = {
        ac: NotificationActions.LOG_OUT,
        em: email
    };

    return sendToDevice(content, device, EVENTS.SYSTEM_BACKEND_NOTIFICATION);
};

let pushKickShareWallet = function (info) {
    if (!info || !info.tokenDevice || !info.walletId || !info.userId) {
        return;
    }

    let content = {
        ac: NotificationActions.SHARED_WALLET_KICKED,
        a: info.walletId
    };

    let skipGetListUser = false;

    return send(content, info.user_id, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, info.walletId, info.tokenDevice);
};

let pushSubscriptionRenew = function (user_id, expire, tokenDevice) {
    if (!user_id || !expire || !tokenDevice) {
        return;
    }

    let content = {
        ac: NotificationActions.SUBSCRIPTION_RENEW,
        exp: expire
    };

    let skipGetListUser = true;

    return send(content, user_id, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, tokenDevice);
};

let pushLinkedWalletRenew = function (user_id, expire, tokenDevice) {
    if (!user_id || !expire || !tokenDevice) {
        return;
    }

    let content = {
        ac: NotificationActions.REMOTE_WALLET_RENEW,
        exp: expire
    };

    let skipGetListUser = true;

    return send(content, user_id, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, tokenDevice);
};

let pushReceiptResult = function (user_id, transaction_id, status, data) {
    if (!user_id || status === undefined || status === null || (status && !transaction_id)) {
        return;
    }

    let content = {
        ac: NotificationActions.RECEIPT_DONE,
        status: status,
        m: 'Your receipt has been resolve successfully.'
    };

    if (status) {
        content.tr = transaction_id;
    }

    if (data) {
        content.data = data;
    }

    let skipGetListUser = true;

    return send(content, user_id, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, null)
};

let pushReceiptReject = function (user_id, image_id, error, message) {
    if (!user_id || !image_id || !error || !message) {
        return;
    }

    let content = {
        ac: NotificationActions.RECEIPT_REJECT,
        im: image_id,
        er: error,
        ms: message
    };

    let skipGetListUser = true;

    return send(content, user_id, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, null);
};

let pushPremiumActivated = function (userId, tokenDevice) {
    const content_en = 'Congratulations! Your Money Lover account has been upgraded to Premium.';
    const content_vi = 'Chúc mừng! Tài khoản Money Lover của bạn đã được nâng cấp lên Premium.';

    let data = {
        r: 'Money Lover Premium',
        uid: userId,
        ac: NotificationActions.PREMIUM
    };

    let skipGetListUser = true;

    User.findById(userId, (err, user) => {
        if (err) return 0;

        if (!user) return 0;

        if (user.client_setting && user.client_setting.l && user.client_setting.l === 'vi') {
            data.m = content_vi;
        } else {
            data.m = content_en;
        }

        return send(data, userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, tokenDevice);
    });
};

let pushFinsifyFailNotification = function (userId, loginId) {
    if (!userId) return;

    let data = {
        ac: NotificationActions.FINSIFY,
        e: Error.FINSIFY_LOGIN_INVALID,
        lid: loginId
    };

    let skipGetListUser = true;

    return send(data, userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, null);
};

function generatePushNotificationContent(wallet, error) {
    let message;

    if (error == Error.FINSIFY_WRONG_CREDENTIALS) {
        message = "Incorrect login information of " + wallet.name + ". Tap to update it.";
    } else if (error == Error.FINSIFY_PASSWORD_EXPIRED) {
        message = "Your wallet " + wallet.name + " needs to update login information. Please update and then login again.";
    } else if (error == Error.FINSIFY_ACCOUNT_LOCKED) {
        message = "Your account " + wallet.name + " was locked. Please contact bank to unlock it.";
    } else if (error == Error.SUBSCRIPTION_CODE_EXPIRE) {
        message = "Your subscription was expired.";
    }

    return message;
}

let pushFinsifyErrorNotificationExtension = function (userId, loginId, error, wallet, tokenDevice) {
    if (!userId) return;
    let data;
    let wallet_id = wallet._id;

    let message = generatePushNotificationContent(wallet, error);

    if (error == Error.FINSIFY_WRONG_CREDENTIALS) {
        data = {
            ac: NotificationActions.FINSIFY_WRONG_CREDENTIALS,
            e: error,
            t: 'FINSIFY_WRONG_CREDENTIALS',
            m: message,
            lid: loginId
        };
    } else if (error == Error.FINSIFY_PASSWORD_EXPIRED) {
        data = {
            ac: NotificationActions.FINSIFY_PASSWORD_EXPIRE,
            e: error,
            lid: loginId,
            t: 'FINSIFY_PASSWORD_EXPIRE',
            m: message
        };
    } else if (error == Error.FINSIFY_ACCOUNT_LOCKED) {
        data = {
            ac: NotificationActions.FINSIFY_ACCOUNT_LOCKED,
            e: error,
            lid: loginId,
            t: 'FINSIFY_ACCOUNT_LOCKED',
            m: message
        };
    }

    let skipGetListUser;

    if (!wallet_id || !tokenDevice) {
        skipGetListUser = true;
        return send(data, userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION_AWS, null, null);
    } else {
        skipGetListUser = false;
        return send(data, userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION_AWS, wallet_id, tokenDevice);
    }
}

let pushWhenSubscriptionExpire = function (userId, callback) {
    if (!userId) return;

    let message = generatePushNotificationContent(null, Error.SUBSCRIPTION_CODE_EXPIRE);

    let data = {
        ac: NotificationActions.SUBSCRIPTION_EXPIRE,
        e: Error.SUBSCRIPTION_CODE_EXPIRE,
        t: 'SUBSCRIPTION_EXPIRE',
        m: message
    };

    sendByRabbitMQ(data, userId, true, EVENT_SEND_NOTIFICATION, null, null)
        .then((response) => {
            return callback(null, response);
        }).catch((err) => {
            return callback(err, null);
        })
}

let pushRefundItem = function (userId, type, productId) {
    if (!userId || !type) return;

    let data = {
        ac: NotificationActions.REFUND_ITEM,
        type: type
    };

    if (productId) data.product_id = productId;

    let skipGetListUser = true;

    return send(data, userId, skipGetListUser, EVENTS.SYSTEM_BACKEND_NOTIFICATION, null, null);
};

exports.pushTransactionNotification = pushTransactionNotification;
exports.pushSyncNotification = pushSyncNotification;
exports.pushShareWallet = pushShareWallet;
exports.pushAcceptShareWallet = pushAcceptShareWallet;
exports.pushKickShareWallet = pushKickShareWallet;
exports.pushWidgetMessage = pushWidgetMessage;
exports.pushKickDevice = pushKickDevice;
exports.pushSubscriptionRenew = pushSubscriptionRenew;
exports.pushLinkedWalletRenew = pushLinkedWalletRenew;
exports.pushReceiptResult = pushReceiptResult;
exports.pushReceiptReject = pushReceiptReject;
exports.pushPremiumActivated = pushPremiumActivated;
exports.pushFinsifyFailNotification = pushFinsifyFailNotification;
exports.pushFinsifyErrorNotificationExtension = pushFinsifyErrorNotificationExtension;
exports.pushRefundItem = pushRefundItem;
exports.pushWhenSubscriptionExpire = pushWhenSubscriptionExpire;
