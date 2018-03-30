'use strict';

let env = process.env.NODE_ENV;
let Item = require('./item');
let ItemIcon = require('./item_icon');
let ItemCredit = require('./item_credit');
let ItemSubscription = require('./item_subscription');
let ItemPremium = require('./item_premium');

let mongoose = require('mongoose');
let LogDb = require('../../model/helper/mongodb_connect_logs');
let ItemModel = mongoose.model('Item');
let UserModel = mongoose.model('User');
let SaleLogModel = LogDb.model('SaleLog');

let Error = require('../../config/error');
let utils = require('../../helper/utils');
let moment = require('moment');
let _ = require('underscore');
let request = require('request');
let iap = require('in-app-purchase');

const APPLE_HOST = {
    production: 'buy.itunes.apple.com',
    dev: 'sandbox.itunes.apple.com',
    local: 'sandbox.itunes.apple.com'
};

const IAP_PASSWORD = require('../../config/iap')[env];
let IAP_CONFIG_ORIGIN = {
    applePassword: IAP_PASSWORD.IOS,
    googlePublicKeyStrSandbox: IAP_PASSWORD.ANDROID.publicKey,
    googlePublicKeyStrLive: IAP_PASSWORD.ANDROID.publicKey,
};

let IAP_CONFIG_SUBSCRIPTION = {
    googleAccToken: IAP_PASSWORD.ANDROID.accessToken,
    googleRefToken: IAP_PASSWORD.ANDROID.refreshToken,
    googleClientID: IAP_PASSWORD.ANDROID.clientId,
    googleClientSecret: IAP_PASSWORD.ANDROID.clientSecret
};

/**
 *
 */

function checkLogin(req, res, next){
    if (!req.user_id) {
        return res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    next();
}

function checkBillExist(billId, skip){
    if (skip) return Promise.resolve();

    return new Promise((resolve, reject) => {
        SaleLogModel.findByBillId(billId, (err, log) => {
            if (err) {
                return reject(Error.ERROR_SERVER);
            }

            if (log) {
                return reject(Error.ITEM_BILL_DUPLICATE);
            }

            resolve();
        });
    });
}

function getServiceKey(appId){
    if (appId === 1) return 'GOOGLE';
    if (appId === 2 || appId === 3) return 'APPLE';
    if (appId === 4 || appId === 5) return 'WINDOWS';
}

function recordIntoSaleLog(billId, productId, userId, skip){
    if (skip) return Promise.resolve();

    let item = new SaleLogModel({
        bill_id: billId,
        product_id: productId,
        user: userId
    });

    return new Promise((resolve, reject) => {
        item.save((err) => {
            return err ? reject(Error.ERROR_SERVER) : resolve();
        });
    });
}

function purchaseItem(purchaseInfo){
    return new Promise((resolve, reject) => {
        ItemModel.findByProductId(purchaseInfo.productId, (err, product) => {
            if (err) {
                return reject(Error.ERROR_SERVER);
            }

            if (!product || !product.type) {
                return reject(Error.ITEM_NOT_REGISTER);
            }

            let info = product;
            info.user_id = purchaseInfo.userId;
            info.tokenDevice = purchaseInfo.tokenDevice;
            info.source = purchaseInfo.market;
            info.purchase_date = purchaseInfo.purchaseDate;
            info.purchase_date_ms = purchaseInfo.purchaseDateMs;
            info.expire_date_ms = purchaseInfo.expireDateMs;

            let itemInstance;

            switch (product.type) {
                case Item.Type.ICON:
                    itemInstance = new ItemIcon(info);
                    break;
                case Item.Type.PREMIUM:
                    itemInstance = new ItemPremium(info);
                    break;
                case Item.Type.CREDIT:
                    itemInstance = new ItemCredit(info);
                    break;
                case Item.Type.SUBSCRIPTION:
                    itemInstance = new ItemSubscription(info);
                    break;
                default:
                    break;
            }

            if (!itemInstance) {
                if (product.type === Item.Type.OTHER) {
                    return resolve();
                }

                return reject(Error.ITEM_NOT_REGISTER);
            }

            itemInstance.purchase()
                .then(resolve)
                .catch(reject);
        });
    });
}

function refundItem(productId, userId, tokenDevice){
    return new Promise((resolve, reject) => {
        ItemModel.findByProductId(productId, (err, product) => {
            if (err) {
                return reject(Error.ERROR_SERVER);
            }

            if (!product || !product.type) {
                return reject(Error.ITEM_NOT_REGISTER);
            }

            let info = product;
            info.user_id = userId;
            info.tokenDevice = tokenDevice;

            let itemInstance;

            switch (product.type) {
                case Item.Type.ICON:
                    itemInstance = new ItemIcon(info);
                    break;
                case Item.Type.PREMIUM:
                    itemInstance = new ItemPremium(info);
                    break;
                case Item.Type.CREDIT:
                    itemInstance = new ItemCredit(info);
                    break;
                case Item.Type.SUBSCRIPTION:
                    itemInstance = new ItemSubscription(info);
                    break;
                default:
                    break;
            }

            if (!itemInstance) {
                return reject(Error.ITEM_NOT_REGISTER);
            }

            itemInstance.refund()
                .then(resolve)
                .catch(reject);

        });
    });
}

/**
 *
 */

let appCreditPurchase = function (req, res) {
    let user_id = req.user_id;
    let product_id = req.body.product_id;
    let market = req.body.market;

    if (!product_id || !market) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    ItemModel.findByProductId(product_id, (err, product) =>{
        if (err) {
            return res.json({s: false, e: Error.ERROR_SERVER});
        }
        
        if (!product) {
            return res.json({s: false, e: ItemCredit.Error.ITEM_NOT_REGISTER});
        }
        
        let info = product;
        info.user_id = user_id;
        info.source = market;
        
        let itemCredit = new ItemCredit(info);
        itemCredit.purchase()
            .then((current_credit) => {
                res.json({s: true, credit: current_credit});
            })
            .catch((err) => {
                res.json({s: false, e: err});
            });
    });
};

function sendRequest(host, path, header, payload){
    return new Promise((resolve, reject) => {
        let options = {
            url: `https://${host}${path}`,
            method: 'POST',
            headers: header,
            body: payload,
            json: true
        };

        request(options, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
}

let appSubAppleValidate = function(req, res){
    let receipt_data = req.body.receipt_data;
    let password = req.body.password;
    let user_id = req.user_id;
    let product_id = req.body.product_id;
    let tokenDevice = req.tokenDevice;

    if (!receipt_data) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    let host = APPLE_HOST[env];
    let path = '/verifyReceipt';
    let header = {
        'Content-Type': 'application/json'
    };
    let data = {
        // 'receipt-data': utils.base64Encode(receipt_data)
        'receipt-data': receipt_data
    };

    if (password) {
        data.password = password;
    }

    sendRequest(host, path, header, data)
        .then(handleResult)
        .catch(function(err){
            res.json({s: false, e: 204});
        });

    function handleResult(result){
        if (!result.status) {
            if (result.latest_receipt_info && result.latest_receipt_info.length > 0) {
                let info = {
                    user_id: user_id,
                    expire_date: parseInt(result.latest_receipt_info[result.latest_receipt_info.length - 1]['expires_date_ms']),
                    market: 'appstore',
                    product: product_id,
                    purchase_date: parseInt(result.latest_receipt_info[result.latest_receipt_info.length - 1]['original_purchase_date_ms'])
                };

                updateExpire(info, (err) => {
                    res.json({
                        s: true,
                        latest_receipt_info: result.latest_receipt_info
                    });

                    ItemSubscription.pushNotification(user_id, info.expire_date, tokenDevice);
                });
            }
        } else {
            res.json({s: false, e: result.status});
        }
    }

    function updateExpire(info, callback) {
        UserModel.findById(info.user_id, (err, user) => {
            if (err) {
                return callback(err)
            }

            if (!user) {
                return callback();
            }

            let update = {
                $set: {
                    expireDate: new Date(info.expire_date),
                    subscribeProduct: info.product,
                    lastPurchase: new Date(info.purchase_date),
                    subscribeMarket: info.market
                }
            };

            if (!user.firstPurchase) {
                update.firstPurchase = new Date(info.purchase_date)
            }

            UserModel.findByIdAndUpdate(info.user_id, update, callback);
        });
    }
};

let appPurchase = function(req, res){
    let productId = req.body.product_id;
    let userId = req.user_id;
    let tokenDevice = req.tokenDevice;
    let market = req.body.market;
    let purchaseDate = req.body.purchase_date;

    if (!productId || !market) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    purchaseItem({productId, market, userId, tokenDevice, purchaseDate})
        .then(() => {
            res.json({s: true});
        })
        .catch((err) => {
            res.json({s: false, e: err});
        })
};

let appBillPurchase = function(req, res){
    let receiptData = req.body.receipt_data;
    let productId = req.body.product_id;
    let appId = req.body.app_id;
    let market = req.body.market;
    let userId = req.user_id;
    let tokenDevice = req.tokenDevice;
    let config = _.clone(IAP_CONFIG_ORIGIN);

    if (!receiptData || !productId || !appId || !market) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    let serviceKey = getServiceKey(appId);
    iap.reset();

    // if (receiptData.data) {
    //     receiptData.data = JSON.stringify(receiptData.data);
    // }

    ItemModel.findOne({alias: productId}).lean().exec((err, product) => {
        if (err) {
            return res.json({s: false, e: Error.ERROR_SERVER});
        }

        if (!product || !product.type) {
            return res.json({s: false, e: Error.ITEM_NOT_REGISTER});
        }

        if (product.type === Item.Type.SUBSCRIPTION) {
            config = Object.assign(config, IAP_CONFIG_SUBSCRIPTION);
        }

        iap.config(config);

        iap.setup((err) => {
            if (err) {
                return res.json({s: false, e: Error.ERROR_SERVER});
            }

            iap.validate(iap[serviceKey], receiptData, (err, response) => {
                if (err) {
                    return res.json({s: false, e: Error.ERROR_SERVER});
                }

                if (!iap.isValidated(response)) {
                    return res.json({s: false, e: Error.ITEM_BILL_INVALID});
                }

                let listPurchase = iap.getPurchaseData(response, {ignoreExpired: true});
                listPurchase.sort((a, b) => a.purchaseDate - b.purchaseDate);
                let lastPurchase = listPurchase[listPurchase.length - 1];
                lastPurchase.purchaseDate = parseInt(lastPurchase.purchaseDate);
                if (lastPurchase.expirationDate) {
                    lastPurchase.expirationDate = parseInt(lastPurchase.expirationDate);
                }

                let info = product;
                info.user_id = userId;
                info.tokenDevice = tokenDevice;
                info.source = market;
                info.purchase_date_ms = lastPurchase.purchaseDate;
                if (lastPurchase.expirationDate) {
                    info.expire_date_ms = lastPurchase.expirationDate;
                }

                let skip = product.type === Item.Type.SUBSCRIPTION;

                checkBillExist(lastPurchase.transactionId, skip)
                    .then(() => {
                        return recordIntoSaleLog(lastPurchase.transactionId, productId, userId, skip);
                    })
                    .then(() => {
                        if (!userId) {
                            return Promise.resolve();
                        }

                        let itemInstance;

                        switch (product.type) {
                            case Item.Type.ICON:
                                itemInstance = new ItemIcon(info);
                                break;
                            case Item.Type.PREMIUM:
                                itemInstance = new ItemPremium(info);
                                break;
                            case Item.Type.CREDIT:
                                itemInstance = new ItemCredit(info);
                                break;
                            case Item.Type.SUBSCRIPTION:
                                itemInstance = new ItemSubscription(info);
                                break;
                            default:
                                break;
                        }

                        if (!itemInstance) {
                            if (product.type === Item.Type.OTHER) {
                                return Promise.resolve();
                            }

                            return Promise.reject(Error.ITEM_NOT_REGISTER);
                        }

                        return itemInstance.purchase();
                    })
                    .then((data) => {
                        res.json({s: true, bill: lastPurchase, data: data});
                    })
                    .catch((err) => {
                        res.json(({s: false, e: err}));
                    });
            });
        });
    });
};

let appRefund = function(req, res){
    let userId = req.user_id;
    let tokenDevice = req.tokenDevice;
    let productId = req.body.product_id;

    if (!productId) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    refundItem(productId, userId, tokenDevice)
        .then(() => {
            res.json({s: true});
        })
        .catch(err => {
            res.json({s: false, e: err});
        });
};

module.exports = function(server, config){
    server.post('/items/credit/purchase', checkLogin, appCreditPurchase);
    server.post('/items/subscription/apple-validate', checkLogin, appSubAppleValidate);
    server.post('/items/purchase-with-bill', appBillPurchase);
    server.post('/items/purchase', checkLogin, appPurchase);
    server.post('/items/refund', checkLogin, appRefund);
    server.get('/items/clear-log', function(req, res){
        let passphase = req.query.passphase;

        if (!passphase || passphase !== '12369874') {
            res.json({s: false});
        }

        SaleLogModel.remove({}, err => {
            res.json({s: !err});
        });
    });
};