'use strict';

let mongoose = require('mongoose'); 
mongoose.Promise = global.Promise;
// let OAuthDb = require('./model/helper/mongodb_connect_oauth');
// let LogDb = require('./model/helper/mongodb_connect_logs');
// let async = require('async');
// let _ = require('underscore');
// let moment = require('moment');
// let Permission	= require('./model/permission');
// let redisClient	= require('./config/database').redisClient;
// let Big = require('big.js');
// let countryMap = require('./helper/country_code_map.json');
// let utils = require('./helper/utils');
// let debug = require('debug')('test');
//
require('./model/finsify_category_edited_log');
require('./model/finsify_fetch_log');
require('./model/account');
require('./model/activity');
require('./model/category');
require('./model/campaign');
require('./model/transaction');
require('./model/device');
require('./model/user');
//
let env	= process.env.NODE_ENV;
let config	= require('./config/config')[env];

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

// let statDaily = require('./cronjob/statDaily');
//
// statDaily.loyalUser(err => {
//     console.log(err || 'DONE');
// });

let FinsifyController = require('./helper/finsify-controller-debug');

FinsifyController.fetchTransaction('70616', 1494903013000)
    .then(data => {
        console.log(data)
    })
    .catch(console.log);
