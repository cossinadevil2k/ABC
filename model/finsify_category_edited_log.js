'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const LogDb = require('./helper/mongodb_connect_logs');

let logSchema = new Schema({
    transaction: {type: String, trim: true},
    old_category: {type: String, trim: true},
    new_category: {type: String, trim: true},
    metadata: {type: Schema.Types.Mixed},
    changed_date: {type: Date, default: Date.now, index: true}
});

logSchema.index({transaction: 1, old_category: 1, new_category: 1});

/**
 * UTILITIES
 */

/**
 * FUNCTIONS
 */

let createLog = function(transaction_id, old_category_metadata, new_category_metadata, metadata, callback){
    let check_exist_query = {
        transaction: transaction_id,
        old_category: old_category_metadata,
        new_category: new_category_metadata
    };

    this.findOne(check_exist_query, (err, log) => {
        if (err) return callback(err);

        if (log) return callback();

        let item = new this({
            transaction: transaction_id,
            old_category: old_category_metadata,
            new_category: new_category_metadata
        });

        if (metadata) {
            item.metadata = metadata;
        }

        item.save(callback);
    });
};

let findAll = function(skip, limit, callback) {
    this.find()
        .sort('-changed_date')
        .skip(skip)
        .limit(limit)
        .exec(callback)
};

/**
 * EXPORTS
 */
logSchema.statics.createLog = createLog;
logSchema.statics.findAll = findAll;

LogDb.model('FinsifyCategoryChangelog', logSchema);