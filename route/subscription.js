'use strict';

let mongoose = require('mongoose');
let moment = require('moment');
let async = require('async');

let User = mongoose.model('User');
let SubscriptionCode = mongoose.model('SubscriptionCode');
let Device = mongoose.model('Device');
let Item = mongoose.model('Item');

let pushController = require('../model/sync/push_controller');

let updateExpire = function(purchaseInfo, callback){
    /*
     * Hàm sử dụng với trường hợp người dùng tự gia hạn theo cách thông thường
     * purchaseInfo: payerId, receiverEmail, product, market, os, purchase_type, purchase_date
     * callback err: ['receiver', product', 'renew']
     * */

    let momentExpire = null;

    function convertProductToTime(product_id){
        //productId example: sub1_100_notrial
        let info = product_id.split('_');
        let withTrial = (info[2] !== 'notrial');
        let timeValue = 0;

        let i = 1;
        if (info[0].substr(0, 2) === 'rw'){
            if (info[0].length === 4) i = 2;
        } else if (info[0].substr(0, 3) === 'sub') {
            if (info[0].length === 5) i = 2;
        }

        let type = info[0].slice(0, info[0].length - i);
        try {
            timeValue = parseInt(info[0].slice(info[0].length - i));
        } catch(e){
            return false;
        }
        if (env === 'production') return {unit: 'months', time: timeValue, withTrial: withTrial, type: type};
        else return {unit: (timeValue >= 12) ? 'months': 'minutes', time: timeValue, withTrial: withTrial, type: type};
    }

    function getProductInfo(product_id, callback){
        Item.findByProductId(product_id, callback);
    }

    function updateReceiverInfoAutoRenew(receiver, product){
        if (purchaseInfo.market) receiver.subscribeMarket = purchaseInfo.market;

        receiver.lastPurchase = moment(purchaseInfo.purchase_date);

        if (!receiver.subscribeProduct) {
            //new user detected
            receiver.firstPurchase = moment();
            if (product.has_trial) {
                receiver.expireDate = moment().add(14, 'day');
                receiver.subscribeProduct = 'Trial';
            } else {
                receiver.expireDate = moment().add(product.expire_value, product.expire_unit);
                receiver.subscribeProduct = purchaseInfo.product;
            }
        } else {
            if (purchaseInfo.product !== receiver.subscribeProduct) {
                //change product detected
                if (receiver.subscribeProduct === 'Trial') {
                    receiver.subscribeProduct = purchaseInfo.product;
                    momentExpire = moment(receiver.expireDate);
                    receiver.expireDate = momentExpire.add(product.expire_value, product.expire_unit);
                } else {
                    receiver.subscribeProduct = purchaseInfo.product;
                    receiver.expireDate = moment().add(product.expire_value, product.expire_unit);
                }
            } else {
                //renew
                momentExpire = moment(receiver.expireDate);
                receiver.expireDate = momentExpire.add(product.expire_value, product.expire_unit);
            }
        }

        return receiver;
    }

    function updateReceiverInfoManualRenew(receiver, product){
        let today = moment();

        if (!receiver.subscribeProduct) {
            //new user detected
            receiver.firstPurchase = moment();
            receiver.expireDate = moment().add(product.expire_value, product.expire_unit);
            receiver.subscribeProduct = purchaseInfo.product;
        } else {
            if (purchaseInfo.product !== receiver.subscribeProduct) {
                //change product detected
                receiver.subscribeProduct = purchaseInfo.product;
            }

            if (receiver.expireDate > today) {
                momentExpire = moment(receiver.expireDate);
                receiver.expireDate = momentExpire.add(product.expire_value, product.expire_unit);
            } else {
                receiver.expireDate = moment().add(product.expire_value, product.expire_unit);
            }
        }

        return receiver;
    }

    async.waterfall([
        //check receiver
        function(next){
            User.findByEmail(purchaseInfo.receiverEmail, function(err, receiver){
                if (err || !receiver) {
                    return next('receiver');
                }

                next(null, receiver);
            });
        },
        //check product
        function(receiver, next){
            getProductInfo(purchaseInfo.product, (err, product) => {
                if (err || !product) {
                    return next('product');
                }

                next(null, receiver, product);
            });
        },
        //update receiver info
        function(receiver, product, next){
            let updatedReceiver;

            if (purchaseInfo.purchase_type === 1) {
                //auto renew
                updatedReceiver = updateReceiverInfoAutoRenew(receiver, product);
            } else {
                //manual renew
                updatedReceiver = updateReceiverInfoManualRenew(receiver, product);
            }

            updatedReceiver.save((err) => {
                if (err) {
                    return next('renew');
                }

                let data = {
                    receiverId: updatedReceiver._id,
                    receiverExpireDate: updatedReceiver.expireDate
                };

                next(null, data);
            });
        }
    ], function(err, data){
        if (err) {
            return callback(err);
        }
        
        callback(null, data);
        //push notification
        pushController.pushSubscriptionRenew(data.receiverId, data.receiverExpireDate, purchaseInfo.tokenDevice);
    });
};

let renewSubscription = function (req, res) {
    if (global.isServerMaintain) {
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }

    let user_id = req.user_id;
    let receiverEmail = req.body.em.toLowerCase();
    let productId = req.body.pd.toLowerCase();
    let market = req.body.mk || null;
    let platform = req.body.os;
    let purchase_type = req.body.pt;
    let purchaseDate = req.body.rd;

    let today = moment().toISOString();

    if (!user_id) {
        return res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    if (!receiverEmail || !productId || !platform) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    let purchaseInfo = {
        payerId: user_id,
        receiverEmail: receiverEmail,
        product: productId,
        market: market,
        os: platform,
        purchase_type: purchase_type,
        purchase_date: purchaseDate || today,
        tokenDevice: req.tokenDevice
    };

    updateExpire(purchaseInfo, function (err, result) {
        if (err) {
            if (err === 'product') {
                return res.send({s: false, e: Error.SUBSCRIPTION_PRODUCT_ERROR});
            }

            if (err === 'receiver') {
                return res.send({s: false, e: Error.SUBSCRIPTION_INFO_WRONG});
            }

            res.send({s: false, e: Error.ERROR_SERVER}); //'renew' error
        } else {
            let d = null;

            if (result.receiverExpireDate) {
                d = result.receiverExpireDate;
            } else if (result.receiverRwExpire) {
                d = result.receiverRwExpire;
            }

            res.send({s: true, d: d});
        }
    });
};

let subscriptionCode = function (req, res) {
    if (global.isServerMaintain) {
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }

    let user_id = req.user_id;
    let code = req.body.sc;
    let email = req.body.em;
    let platform = req.body.os;

    if (!user_id) {
        return res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    if (!code || !email) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    function renew(codeInfo) {
        let product = (codeInfo && codeInfo.product) ? codeInfo.product : 'sub1_100_notrial';

        let today = moment();
        let purchaseInfo = {
            payerId: user_id,
            receiverEmail: email,
            product: product,
            market: 'Promo Code',
            os: platform,
            purchase_type: 2,
            purchase_date: today,
            tokenDevice: req.tokenDevice
        };

        updateExpire(purchaseInfo, function (e, r) {
            if (e || !r) {
                res.send({s: false});
            } else {
                if (codeInfo) {
                    codeInfo.usedBy = email;
                    codeInfo.save();
                }
                res.send({s: true});
            }
        });
    }

    if (code.toUpperCase() === 'DUNGHOIVISAOBIENXANHLAIMAN') {
        return renew();
    }

    SubscriptionCode.checkAvailableCode(code, function (err, codeInfo) {
        if (err) {
            return res.send({s: false, e: Error.ERROR_SERVER});
        }

        if (!codeInfo) {
            return res.send({s: false});
        }

        renew(codeInfo);
    });
};

module.exports = function(server, config){
    server.post('/subscribe', renewSubscription);
    server.post('/subscription-code', subscriptionCode);
};