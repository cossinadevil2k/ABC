'use strict';

let env = process.env.NODE_ENV;
let config = require('./config/config')[env];
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
db.once('open', function callback() {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

let UserModel = mongoose.model('User');

let query = {
    purchased: true,
    subscribeProduct: null
};

function findUser() {
    UserModel.find(query, function (error, results) {
        if (error) {
            console.log(error);
        } else {
            console.log(results.length);
            async.eachSeries(results, function (user, next) {
                async.setImmediate(function () {
                    let userId = user._id;
                    UserModel.update({
                        _id: userId
                    }, {
                            subscribeProduct: "premium_sub_year_1",
                            "$addToSet": { "tags": "purchase:premium" }
                        }, next);
                });
            }, function (err) {
                console.log('fix purchase done');
                mongoose.connection.close();
            });
        }
    })
}

findUser();
