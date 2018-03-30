
let env = process.env.NODE_ENV;
const mongoose = require('mongoose');
const config = require('../config/config')[env];
const fs = require('fs');
const async = require('async');

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});

require('../model/user');
require('../model/sale_log');
require('../model/account');
require('../model/campaign');
require('../model/category');
require('../model/transaction');

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});


const LogDb = require('../model/helper/mongodb_connect_logs');

const UserModel = mongoose.model('User');

function getTest() {
    async.series({
        connectDB: function (cb) {
            // Connect to MongoDB
            mongoose.connect(config.db_url, connectOptions);
            const db = mongoose.connection;

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

            cb();

        },
        testGetModel: function (cb) {
            UserModel.find()
                .limit(100)
                .lean(true)
                .exec(function (error, result) {
                    console.log(result);
                });
        }
    }, function () {
        mongoose.connection.close();
    });
}

getTest();


