'use strict';

let mongoose = require('mongoose');
let async = require('async');
let _ = require('underscore');
let sprintf	= require("sprintf-js").sprintf;
let TagConstant = require('./config/tag_constant');

require('./model/account');
require('./model/campaign');
require('./model/category');
require('./model/transaction');
require('./model/user');
require('./model/device');
require('./model/provider');


let env	= process.env.NODE_ENV;
let config	= require('./config/config')[env];
let utils = require('./helper/utils');

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});


let UserModel = mongoose.model('User');
let DeviceModel = mongoose.model('Device');

function findEmptyLocationUser(callback) {
    let search = '!country:*';
    let query = utils.createUserQuery(search);
    let skip = 0;
    let limit = parseInt(process.env.LIMIT);

    let options = {
        hydrate: true,
        sort: {
            createdDate: {order: "desc"}
        },
        from: skip,
        size: limit
    };

    UserModel.search(query, options, function(err, result){
        if (err) return callback(err);

        callback(null, {data: result.hits.hits, total: result.hits.total});
    });
}

function detectUserCountry(user, callback) {
    if (!user) return callback();
    if (!user.ipRegistered) {
        return callback();
    }

    let location = utils.detectLocationByIp(user.ipRegistered);
    if (!location) return callback();

    user.tags.push('country:' + location.country.toLowerCase());
    // user.tags.push('country:vietnam');

    UserModel.updateTags(user._id, user.tags, callback);
}

findEmptyLocationUser((err, result) => {
    if (err) return console.log(err);
    if (!result || !result.data || result.data.length === 0) return console.log('Done');

    console.log(`Total: ${result.total}`);
    let count = 0;

    async.eachSeries(result.data, (user, done) => {
        async.setImmediate(() => {
            detectUserCountry(user, err => {
                if (err) return done(err);
                count++;
                console.log(`Done: ${count}`);
                done();
            });
        });
    }, err => {
        return err ? console.log(err) : console.log('DONE');
    });
    // console.log(err, result);
});