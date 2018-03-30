

const Rabbit = require('../../helper/rabbitmq/lib/rabbit');
const async = require('async');
const env = process.env.NODE_ENV || 'local';
const path = require('path');
const mongoose = require('mongoose');
const config = require('../../config/config')[env];

const WORKER = 'queue_worker_creditupdate'
const EVENT = 'hook.ready.rawcredit';


const RawDataProcessWorker = new Rabbit.default({
    tag: 'white-house-worker-credit',
    exchanges: [Rabbit.JOB_EXCHANGE],
    queues: [{
        name: WORKER,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }]
});

const numberIncrease = 1000;

process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});

require('../../model/user');
require('../../model/use_credit');


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

const UserModel = mongoose.model('User');
let UserCreditModel = mongoose.model('UseCredit');


function updateUserCredit(userId, callback) {
    UserCreditModel.findOne({ user: userId }, function (error, result) {
        if (error) {
            return callback(error, null);
        } else {
            if (result) {
                let credit = result.turns['receipt'] * numberIncrease;
                result.markModified('turns');
                result.turns['receipt'] = credit;

                result.save(function (err, doc) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, null);
                    }
                });
            } else {
                return callback(null, null);
            }
        }
    });
}


RawDataProcessWorker.listen(EVENT, WORKER, function (userId, next) {
    updateUserCredit(userId, next);
});