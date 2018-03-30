'use strict';

let mongoose = require('mongoose');
let UserModel = mongoose.model('User');
let WalletModel = mongoose.model('Account');
let FinsifyServiceModel = mongoose.model('Provider');

let Error = require('../config/error');
let FinsifyController = require('../helper/finsify-controller');

function checkLogin(req, res, next){
    if (!req.user_id) {
        return res.json({s: false, e: Error.USER_NOT_LOGIN});
    }

    next();
}

function checkFinsifyIdExist(userId){
    return new Promise((resolve, reject) => {
        UserModel.findById(userId, (err, user) => {
            if (err || !user) {
                return reject(Error.ERROR_SERVER);
            }

            if (user.finsify_id) {
                return reject(Error.FINSIFY_ID_EXISTS);
            }

            resolve();
        });
    });
}

function setFinsifyId(userId, finsifyId){
    return new Promise((resolve, reject) => {
        UserModel.setFinsifyCustomerId(userId, finsifyId, (err) => {
            return err ? reject(Error.ERROR_SERVER) : resolve();
        });
    });
}

function checkAvailableFinsifyWallet(userId){
    return new Promise((resolve, reject) => {
        WalletModel.count({owner: userId, isDelete: false, account_type: {$gt: 0}}, (err, count) => {
            if (err) {
                return reject(Error.ERROR_SERVER);
            }

            if (count) {
                return resolve(false);
            }

            resolve(true);
        })
    });
}

function providerCacheConverter(provider){
    return {
        id: provider.realId,
        name: provider.name,
        code: provider.code,
        icon: provider.icon,
        primary_color: provider.primary_color,
        type: provider.type,
        country_code: provider.country_code,
        has_balance: provider.hasBalance,
        meta_search: provider.meta_search,
        is_free: provider.is_free,
        is_debug: provider.is_debug
    };
}

let appCustomerIdPull = function(req, res){
    let user_id = req.user_id;

    UserModel.getFinsifyCustomerId(user_id, (err, finsify_id) => {
        if (err) {
            return res.json({s: false, e: Error.ERROR_SERVER});
        }
        
        res.json({s: true, finsify_id: finsify_id});
    });
};

let appCustomerIdPush = function(req, res){
    let finsifyId = req.body.finsify_id;
    let userId = req.user_id;

    checkFinsifyIdExist(userId)
        .then(() => {
            return setFinsifyId(userId, finsifyId);
        })
        .then(() => {
            res.json({s: true});
        })
        .catch(err => {
            res.json({s: false, e: err});
        });
};

let appRefresh = function(req, res){
    let loginId = req.body.login_id;
    let timestamp = req.body.timestamp || 0;

    if (!loginId) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    FinsifyController.fetchTransaction(loginId, timestamp)
        .then(() => {
            res.json({s: true});
        })
        .catch(err => {
            console.log(err);
            let response = {s: false, e: Error.ERROR_SERVER};

            if (err.error && err.error === 'LoginNotFound') {
                response.e = Error.FINSIFY_LOGIN_INVALID;
            }

            res.json(response);
        });
};

let appCancelLogin = function(req, res){
    let userId = req.user_id;
    let secret = req.body.secret;

    if (!secret) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    UserModel.getFinsifyCustomerId(userId, (err, finsifyId) => {
        if (err) {
            return res.json({s: false, e: Error.ERROR_SERVER});
        }

        if (!finsifyId) {
            return res.json({s: false, e: Error.FINSIFY_LOGIN_INVALID});
        }

        checkAvailableFinsifyWallet(userId)
            .then((status) => {
                if (status) {
                    return FinsifyController.unlinkRemoteWallet(secret, finsifyId);
                }
            })
            .then(() => {
                res.json({s: true});
            })
            .catch(err => {
                res.json({s: false, e: Error.ERROR_SERVER});
            });
    })
};

let appFinsifyService = function (req, res) {
    let serviceId = req.body.service_id;

    if (!serviceId) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    FinsifyServiceModel.findOne({realId: serviceId}, (err, data) => {
        if (err) {
            return res.json({s: false, e: Error.ERROR_SERVER});
        }

        if (!data) {
            return res.json({s: false, e: Error.FINSIFY_SERVICE_NOT_FOUND});
        }

        res.json({s: true, data: providerCacheConverter(data)});
    });
};

let appLoginRefresh = function(req, res){
    let loginSecret = req.body.secret;

    if (!loginSecret) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    FinsifyController.refreshLogin(loginSecret)
        .then(data => {
            res.json({
                s: true,
                id: data.id,
                refreshed: data.refreshed,
                last_refresh_at: data.last_refresh_at,
                next_refresh_possible_at: data.next_refresh_possible_at
            });
        })
        .catch(err => {
            res.json({s: false, e: Error.ERROR_SERVER});
        });
};

module.exports = function (server, config) {
    server.post('/finsify/id/pull', checkLogin, appCustomerIdPull);
    server.post('/finsify/id/push', checkLogin, appCustomerIdPush);
    server.post('/finsify/data-refresh', checkLogin, appRefresh);
    server.post('/finsify/logout', checkLogin, appCancelLogin);
    server.post('/finsify/service', checkLogin, appFinsifyService);
    server.post('/finsify/login-refresh', checkLogin, appLoginRefresh);
};