/**
 * Created by cuongpham on 10/24/16.
 */

'use strict';

let kue = require('kue');
const FinsifyController = require('../helper/finsify-controller');

//create kue
let queue = kue.createQueue({
    prefix:'q',
    redis:{
        host: global.CONFIG.redis.host,
        port: global.CONFIG.redis.port,
        db: global.CONFIG.redis.kueDb,
        options:{}
    }
});

const EVENT = 'linked-wallet';

queue.on('error', console.log);

queue.process(EVENT, (job, done) => {
    let loginId = job.data.loginId;
    let timestamp = job.data.timestamp;

    FinsifyController.fetchTransaction(loginId, timestamp)
        .then(() => {
            done();
        })
        .catch(error => {
            done();
        });
});