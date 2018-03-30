'use strict';

const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;
const LogDb = require('./helper/mongodb_connect_logs');

const LOG_TYPES = {
    WRONG_CATEGORY: 1
};

let logSchema = new Schema({
    createdAt: {type: Date, required: true, index: true},
    wrong_category_account: [{type: String}],
    log_type: {type: Number, required: true}
});

/**
 * FUNCTIONS
 */

let recordWrongCategoryAccount = function(account_list, callback) {
    if (!account_list || account_list.length === 0) return callback('param invalid');

    let today = moment().startOf('day');

    let query = {
        log_type: LOG_TYPES.WRONG_CATEGORY,
        createdAt: today
    };

    this.findOne(query, (err, log) => {
        if (err) return callback(err);

        if (!log) {
            let item = new this({
                createdAt: today,
                log_type: LOG_TYPES.WRONG_CATEGORY,
                wrong_category_account: account_list
            });

            item.save(callback);
        } else {
            this.findByIdAndUpdate(log._id, {$addToSet: {wrong_category_account: {$each: account_list}}}, callback);
        }
    });
};

let getLogByTime = function (start_time, end_time, callback) {
    let startTime;
    let endTime;
    let query = {};

    if (start_time || end_time) {
        query.createdAt = {};
    }

    if (start_time) {
        startTime = moment(start_time);
        query.createdAt['$gte'] = startTime;
    }

    if (end_time) {
        endTime = moment(end_time);
        query.createdAt['$lte'] = endTime;
    }

    this.find(query)
        .select('-_id createdAt wrong_category_account')
        .sort({createdAt: -1})
        .exec(callback);
};

/**
 * EXPORTS
 */

logSchema.statics.recordWrongCategoryAccount = recordWrongCategoryAccount;
logSchema.statics.getLogByTime = getLogByTime;

LogDb.model('FinsifyFetchLog', logSchema);