'use strict';

let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let caolanAsync = require('async');


require('./model/finsify_category_edited_log');
require('./model/finsify_fetch_log');
require('./model/account');
require('./model/activity');
require('./model/category');
require('./model/campaign');
require('./model/transaction');
require('./model/device');
require('./model/user');

let env	= process.env.NODE_ENV;
let config	= require('./config/config')[env];

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

let UserModel = mongoose.model('User');
let LIMIT = 5000;

function getListUser(skip = 0, limit = LIMIT, callback) {
    UserModel.find().sort({createdDate: 1}).skip(skip).limit(limit).exec(callback);
}

function handleUser(user, callback) {
    caolanAsync.setImmediate(() => {
        if (!user) return callback();
        if (!user._id) return callback();
        if (user.verifyEmail) return callback();
        
        UserModel.findByIdAndUpdate(user._id, {verifyEmail: true}, callback);
    });
}

function migrate(skip = 0, callback) {
    console.log(`Skip: ${skip}`);
    getListUser(skip, LIMIT, (err, userList) => {
        if (err) return callback(err);
        
        caolanAsync.eachSeries(userList, handleUser, err => {
            if (err) return callback(err);
            
            if (userList.length < LIMIT) return callback();
            
            return migrate(skip + LIMIT, callback);
        });
    });
}

migrate(0, err => {
    if (err) console.log(err);
    else console.log('DONE');
});
