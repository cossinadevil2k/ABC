/**
 * Created by cuongpham on 9/11/14.
 */

'use strict';

const env = process.env.NODE_ENV;
let mongoose = require('mongoose');
let Device = mongoose.model('Device');
let Permission = require('../../model/permission');
let User = mongoose.model('User');
let async = require('async');
let iap = require('in-app-purchase');
let _ = require('underscore');
let Error = require('../../config/error');

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


/******************/

function getServiceKey(appId){
    if (appId === 1) return 'GOOGLE';
    if (appId === 2 || appId === 3) return 'APPLE';
    if (appId === 4 || appId === 5) return 'WINDOWS';
}

/*****************/

let appChangeDevModeDevice = function(req, res){
    let id = req.body.id;
    let devMode = req.body.devMode;

    Device.findByIdAndUpdate(id, {$set: {isDev: devMode}} ,function(err, data){
        if(!err || data) {
            res.send({error: 0, msg:"Change isDev success"});
        }
    });

};

let appCheckWalletPermission = function(req,res){
    let walletId = req.body.walletId;
    let email = req.body.email;
    let tokenDevice = req.body.tokenDevice;

    if (!email && !tokenDevice) return res.send({s: false});

    async.waterfall([
        function(callback){
            if (email) {
                User.findByEmail(email, function (err, data) {
                    if (!err) {
                        if (!data) callback(null, null);
                        else callback(null, data._id);
                    } else callback(null, null);
                });
            } else {
                //tokenDevice
                Device.findByTokenDevice(tokenDevice, function(err, device){
                    if (!err) {
                        if (!device) callback(null, null);
                        else if (!device.owner) callback(null, null);
                        else callback(null, device.owner);
                    } else callback(null, null);
                });
            }
        },
        function(userid, callback){
            if(userid) {
                Permission.checkReadPermission(userid, walletId, function (errCheck, reply) {
                    callback(null, userid, reply);
                });
            } else callback(null, false, false);
        },
        function(userid, readPermission, callback){
            if(userid) {
                Permission.checkWritePermission(userid, walletId, function (errCheck, reply) {
                    callback(null, {readPermission: readPermission, writePermission: reply});
                });
            } else callback(null, false)
        }
    ], function(err, result){
        if(!result) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

let appCheckPurchaseBill = function(req, res) {
    let receiptData = req.body.receipt_data;
    let appId = 1;
    let config = _.clone(IAP_CONFIG_ORIGIN);

    if (!receiptData) {
        return res.json({s: false});
    }

    let serviceKey = getServiceKey(appId);

    let data = JSON.parse(receiptData.data);
    if (data.productId.indexOf('sub') !== -1) {
        config = Object.assign(config, IAP_CONFIG_SUBSCRIPTION);
    }

    iap.reset();
    iap.config(config);

    iap.setup((err) => {
        if (err) {
            return res.json({s: false, e: Error.ERROR_SERVER});
        }

        iap.validate(iap[serviceKey], receiptData, (err, response) => {
            if (err) {
                return res.json({s: false, e: err.toString()});
            }

            if (!iap.isValidated(response)) {
                return res.json({s: false, e: Error.ITEM_BILL_INVALID});
            }

            let listPurchase = iap.getPurchaseData(response, {ignoreExpired: true});
            listPurchase.sort((a, b) => a.purchaseDate - b.purchaseDate);
            let lastPurchase = listPurchase[listPurchase.length - 1];

            res.json({s: true, d: lastPurchase});
        });
    });
};

module.exports = function(app, config){
    app.get('/bonus', staticsMain);
    app.get('/check-purchase-bill', staticsMain);
    app.post('/bonus/change-dev-mode-device', appChangeDevModeDevice);
    app.post('/bonus/check-wallet-permission', appCheckWalletPermission);
    app.post('/check-purchase-bill', appCheckPurchaseBill);
};