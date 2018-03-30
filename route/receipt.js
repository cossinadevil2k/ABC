'use strict';

require('../model/use_credit');
require('../model/receipt');

let env = process.env.NODE_ENV;

let mongoose = require('mongoose');
let UseTurnModel = mongoose.model('UseCredit');
let CategoryModel = mongoose.model('Category');
let WalletModel = mongoose.model('Account');
let ReceiptModel = mongoose.model('Receipt');
let UserModel = mongoose.model('User');

let async = require('async');
let Slackbot = require('slackbot');

let Error = require('../config/error');

const USE_TURN_TYPE = 'receipt';
let slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');

const URL_ADMINCP = {
    dev: 'https://admincp.moneylover.me/receipt/details/',
    production: 'https://nsfw.moneylover.me/receipt/details/'
};

function pushToSlack(receipt_id, user_id){
    UserModel.findById(user_id)
        .select('email')
        .exec((err, user) => {
            if (err) {
                return console.log(err);
            }

            if (user) {
                let url = URL_ADMINCP[env] + receipt_id;
                let message = `[${env}] ${user.email} has just upload new receipt ${url}`;

                slackbot.send("#receipt-scan", message, (err, response, body) => {

                });
            }
        });
}

let appUpload = function(req, res) {
    let user_id = req.user_id;
    let image_id = req.body.im;
    let category = req.body.ct;
    let wallet = req.body.wl;

    if (!image_id || (category && !wallet)) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    async.waterfall([
        function (cb) {
            checkTurn(user_id, USE_TURN_TYPE, cb);
        },
        function (cb) {
            checkImageExists(image_id, cb);
        },
        function (cb) {
            checkCategoryAndWalletAvailable(category, wallet, cb);
        },
        function (cb) {
            ReceiptModel.createNew(user_id, image_id, category, wallet, (err, receipt) => {
                if (err) {
                    return cb(Error.ERROR_SERVER);
                }

                cb(null, receipt);
            });
        }
    ], (error, receipt) => {
        if (error) {
            return res.send({s: false, e: error});
        }

        useTurnDecrease(user_id, USE_TURN_TYPE, (err, credit) => {
            pushToSlack(receipt._id, user_id);
            res.send({s: true});
        });
    });

    function checkTurn(user_id, use_turn_type, callback){
        UseTurnModel.getUseCreditByItem(user_id, use_turn_type, (err, turn_number) => {
            if (err) {
                return callback(Error.ERROR_SERVER);
            }

            if (turn_number <= 0) {
                return callback(Error.OUT_OF_USE_CREDIT);
            }

            callback();
        });
    }

    function useTurnDecrease(user_id, use_turn_type, callback){
        UseTurnModel.increaseUseCredit(user_id, use_turn_type, -1, (err) => {
            if (err) {
                return callback(Error.ERROR_SERVER);
            }

            callback();
        });
    }
    
    function checkImageExists(image_id, callback){
        ReceiptModel.findOne({image_id: image_id}, (err, receipt) => {
            if (err) {
                return callback(Error.ERROR_SERVER);
            }

            if (receipt) {
                return callback(Error.RECEIPT_IMAGE_EXISTS);
            }

            callback();
        });
    }

    function checkWalletAvailable(wallet_id, callback){
        WalletModel.find({isDelete: false, _id: wallet_id}, (err, wallet) => {
            if (err) {
                return callback(Error.ERROR_SERVER);
            }

            if (!wallet) {
                return callback(Error.PARAM_INVALID);
            }

            callback();
        });
    }

    function checkCategoryAvailable(category_id, wallet_id, callback) {
        CategoryModel.findOne({_id: category_id, account: wallet_id, isDelete: false})
            .select('account parent')
            .populate('account', 'isDelete')
            .populate('parent', 'isDelete')
            .exec((err, category) => {
                if (err) {
                    return callback(Error.ERROR_SERVER);
                }

                if (!category) {
                    return callback(Error.PARAM_INVALID);
                }

                if (!category.account) {
                    return callback(Error.PARAM_INVALID);
                }

                if (category.account.isDelete) {
                    return callback(Error.PARAM_INVALID);
                }

                if (category.parent) {
                    if (category.parent.isDelete) {
                        return callback(Error.PARAM_INVALID);
                    }
                }

                callback();
            });
    }

    function checkCategoryAndWalletAvailable(category_id, wallet_id, callback){
        if (!category_id && !wallet_id) {
            return callback();
        }

        if (wallet_id && !category_id) {
            return checkWalletAvailable(wallet_id, callback);
        }

        checkCategoryAvailable(category_id, wallet_id, callback);
    }
};

/**
 * MIDDLEWARE
 */

function checkLogin(req, res, next) {
    if (!req.user_id) {
        return res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    next();
}

module.exports = function(server, config) {
    server.post('/receipt/upload', checkLogin, appUpload);
};