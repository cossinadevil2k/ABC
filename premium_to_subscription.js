'use strict';

let env	= process.env.NODE_ENV;
let config	= require('./config/config')[env];
let mongoose = require('mongoose');
let moment = require('moment');
let async = require('async');

require('./model/admin');
require('./model/account');
require('./model/campaign');
require('./model/category');
require('./model/transaction');
require('./model/user');
require('./model/device');
require('./model/provider');
require('./model/budget');
require('./model/backend_notification');
require('./model/helpdesk_performance');
require('./model/helpdesk_issue_stat');
require('./model/helpdesk_issue');

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

let UserModel = mongoose.model('User');

let query = {
    purchased: true,
    expireDate: null
};

let limit = 1000;

let expireUnit = config.subscriptionExpire.premium.unit;
let expireValue = config.subscriptionExpire.premium.value;

function findPremiumUserWithNoSub(callback){
    UserModel.find(query).limit(limit).exec(callback);
}

function handleUserList(userList, callback){
    let count = 0;
    async.eachSeries(userList, (user, cb) => {
        user.subscribeProduct = 'premium_sub_year_1';
        user.subscribeMarket = "Other";

        if (user.premium_at) {
            user.lastPurchase = user.premium_at;
            user.expireDate = moment(user.premium_at).add(expireValue, expireUnit);
        } else {
            user.lastPurchase = user.createdDate;
            user.expireDate = moment(user.createdDate).add(expireValue, expireUnit);
        }

        if (!user.firstPurchase) {
            user.firstPurchase = user.lastPurchase;
        }


        user.save(err => {
            if (err) {
                return cb(err);
            }

            count++;
            console.log(count);
            cb();
        });
    }, callback);
}

function startMigrate(callback){
    findPremiumUserWithNoSub((err, userList) => {
        if (err) {
            return callback(err);
        }

        if (!userList || userList.length === 0) {
            return callback(null, 0);
        }

        handleUserList(userList, err => {
            if (err) {
                return callback(err);
            }

            if (userList.length === limit) {
                return startMigrate(callback);
            }

            callback();
        });
    });
}

startMigrate(err => {
    return err ? console.log(err) : console.log('DOne');
});

