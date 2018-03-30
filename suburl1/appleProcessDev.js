


const async = require('async');
const env = process.env.NODE_ENV || 'local';
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config')[env];
const Rabbit = require(path.join(__dirname, '/rabbitmq/lib/rabbit.js'));

const WORKER = 'queue_worker_asun'
const EVENT = 'hook.ready.raw-apple-status';

const RawDataProcessWorker = new Rabbit.default({
    tag: 'white-house-worker-apple',
    exchanges: [Rabbit.JOB_EXCHANGE],
    queues: [{
        name: WORKER,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }]
});

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});

require('../model/user');
require('../model/sale_log');


let connectOptions = {
    server: {
        auto_reconnect: true
    }
};
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

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    db.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

const LogDb = require('../model/helper/mongodb_connect_logs');

const UserModel = mongoose.model('User');
const SaleLogModel = LogDb.model('SaleLog');



RawDataProcessWorker.listen(EVENT, WORKER, function (info, next) {
    // console.log('I have a pen');
    if (typeof info != 'object') {
        info = JSON.parse(info);
    }
    let transactionId = info.latest_receipt_info.original_transaction_id;
    // console.log(info);

    if (info.original_transaction_id) {
        transactionId = info.original_transaction_id;
    }

    if (info.auto_renew_status && info.notification_type == 'INTERACTIVE_RENEWAL' || info.notification_type == 'RENEWAL') {
        // update expire user and notification for this user


    }

    if (info.notification_type == 'CANCEL') {
        // notification for cancel sub
    }
});

function renewable(transactionId) {
    
}