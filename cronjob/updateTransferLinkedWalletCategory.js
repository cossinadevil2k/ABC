'use strict'

const mongoose = require('mongoose');
let env = process.env.NODE_ENV || 'dev';
const config = require('../config/config')[env];
const CronJob = require('cron').CronJob;
const moment = require('moment');
const async = require('async');
const utils = require('../helper/utils');

require('../model/user');
require('../model/account');
require('../model/category');

// // Connect to MongoDB
// mongoose.Promise = require('bluebird');
// mongoose.connect(config.db_url);
// const db = mongoose.connection;

const debug = require('debug')('updateCate:debug');

// db.on('error', console.error.bind(console, ' Sync Database connection error:'));
// db.once('open', function callback() {
//     console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
// });

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};


process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});


const TYPE_INCOME = 1;
const TYPE_EXPENSE = 2;

let linkedDefault = [{
    name: 'Incoming Transfer',
    type: TYPE_INCOME,
    icon: 'icon_143',
    metadata: 'incoming_transfer0'
}, {
    name: 'Outgoing Transfer',
    type: TYPE_EXPENSE,
    icon: 'icon_142',
    metadata: 'outgoing_transfer0'
}];

const WalletModel = mongoose.model('Account');
const CategoryModel = mongoose.model('Category');
let Hourly = '0 0 * * * *';

let skip = 0;
let limit = 1000;
let wallets = 0;

function mainFunc(callback) {
    function findAccountLinkedWallet(done) {
        debug('findAccountLinkedWallet');
        WalletModel.findRemoteWallet(skip, limit, function (error, results) {
            done(error, results);
        });
    }

    function createCategoryForLinkedWallet(linkedWallet, done) {
        debug('linkedWallet length', linkedWallet.length);
        wallets = linkedWallet.length;
        async.eachSeries(linkedWallet, function (wallet, cb) {
            async.setImmediate(() => {

                function findCategory(next) {
                    let query = {
                        account: wallet._id,
                        "$or": [{
                            metadata: 'incoming_transfer0'
                        }, {
                            metadata: 'outgoing_transfer0'
                        }]
                    };

                    CategoryModel.find(query, next);
                }

                function createCate(data, next) {
                    debug('createCate ', data);
                    if (data.length < 1) {

                        let categoryInfo = [{
                            _id: utils.generateUUID(),
                            name: 'Incoming Transfer',
                            type: TYPE_INCOME,
                            icon: 'icon_143',
                            account: wallet._id,
                            metadata: 'incoming_transfer0'
                        }, {
                            _id: utils.generateUUID(),
                            name: 'Outgoing Transfer',
                            type: TYPE_EXPENSE,
                            icon: 'icon_142',
                            account: wallet._id,
                            metadata: 'outgoing_transfer0'
                        }];

                        async.eachSeries(categoryInfo, function (cateInfo, n) {
                            async.setImmediate(() => {
                                CategoryModel.checkDuplicateName(cateInfo.account, cateInfo.name, null, function (isExists) {
                                    if (!isExists) {
                                        debug('create cate ', cateInfo);
                                        CategoryModel.addNewCategory(cateInfo, function (error) {
                                            n();
                                        });
                                    } else {
                                        n();
                                    }
                                });
                            });
                        }, next);
                    } else {
                        next();
                    }
                }

                async.waterfall([
                    findCategory,
                    createCate
                ], cb);
            });
        }, done);
    }

    async.waterfall([
        findAccountLinkedWallet,
        createCategoryForLinkedWallet
    ], function () {
        skip += limit;
        callback();
    })
}

/* Connect DB */



function connectDB(callback) {
    // Connect to MongoDB
    debug('connectDB');
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
    callback();
}



function closeDB(callback) {
    debug('closeDB');
    mongoose.connection.close();
    callback();
}



let taskJob = new CronJob({
    cronTime: Hourly,
    onTick: function () {
        async.series([
            function (cb) { connectDB(cb); },
            function (cb) { mainFunc(cb); },
            function (cb) { closeDB(cb); }
        ], err => {
            console.log(wallets);
        });
    },
    start: true,
    timeZone: 'Asia/Ho_Chi_Minh'
});

taskJob.start();
