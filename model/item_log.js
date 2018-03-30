'use strict';

let LogDB = require('./helper/mongodb_connect_logs');
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let UserModel = mongoose.model('User');

let moment = require('moment');

let itemLogSchema = new Schema({
    user: {type: String, trim: true, required: true, index: true},
    product: {type: String, trim: true, index: true},
    type: {type: Number, index: true},
    purchased_date: {type: Date, default: Date.now, index: true},
    source: {type: String, trim: true}
});

itemLogSchema.index({product: 1, purchased_date: 1});
itemLogSchema.index({user: 1, purchased_date: 1});
itemLogSchema.index({source: 1, purchased_date: 1});

/**
 * FUNCTIONS
 */

const populate_user = {
    path: 'user',
    select: 'email',
    model: UserModel
};

let findAll = function(query, skip, limit, callback) {
    this.find(query)
        .sort({purchased_date: -1})
        .skip(skip)
        .limit(limit)
        .populate(populate_user)
        .exec(callback);
};

let findByUser = function(user_id, skip, limit, callback) {
    this.find({user: user_id})
        .sort({purchased_date: -1})
        .skip(skip)
        .limit(limit)
        .populate(populate_user)
        .exec(callback);
};

let findByProduct = function(product_id, skip, limit, callback) {
    this.find({product: product_id})
        .sort({purchased_date: -1})
        .skip(skip)
        .limit(limit)
        .populate(populate_user)
        .exec(callback);
};

let findByDate = function (start_date, end_date, skip, limit, callback) {
    //start_date & end_date are timestamp

    let query = {
        purchased_date: {
            '$gte': moment(start_date),
            '$lte': moment(end_date)
        }
    };

    this.find(query)
        .sort({purchased_date: -1})
        .skip(skip)
        .limit(limit)
        .populate(populate_user)
        .exec(callback);
};

let findByProductAndDate = function (product_id, start_date, end_date, skip, limit, callback) {
    let query = {
        product: product_id,
        purchased_date: {
            '$gte': moment(start_date),
            '$lte': moment(end_date)
        }
    };

    this.find(query)
        .sort({purchased_date: -1})
        .skip(skip)
        .limit(limit)
        .populate(populate_user)
        .exec(callback);
};

let countByProduct = function (product_id, callback) {
    this.count({product: product_id}, callback);
};

let countByDate = function (start_date, end_date, callback) {
    let query = {
        purchased_date: {
            '$gte': moment(start_date),
            '$lte': moment(end_date)
        }
    };

    this.count(query, callback);
};

let countByUser = function (user_id, callback) {
    this.count({user: user_id}, callback);
};

let countByUserAndDate = function (user_id, start_date, end_date, callback) {
    let query = {
        user: user_id,
        purchased_date: {
            '$gte': moment(start_date),
            '$lte': moment(end_date)
        }
    };

    this.count(query, callback);
};

let countByProductAndDate = function (product_id, start_date, end_date, callback) {
    let query = {
        product: product_id,
        purchased_date: {
            '$gte': moment(start_date),
            '$lte': moment(end_date)
        }
    };

    this.count(query, callback);
};


let createLog = function (user_id, product_id, callback, options) {
    let item = new this({
        user: user_id,
        product: product_id
    });

    if (options) {
        if (options.source) {
            item.source = options.source;
        }

        if (options.type) {
            item.type = options.type;
        }

        if (options.purchaseDateMs) {
            item.purchased_date = new Date(options.purchaseDateMs);
        }
    }

    item.save(callback);
};

/**
 * EXPORTS
 */

itemLogSchema.statics.findAll = findAll;
itemLogSchema.statics.findByUser = findByUser;
itemLogSchema.statics.findByProduct = findByProduct;
itemLogSchema.statics.findByDate = findByDate;
itemLogSchema.statics.findByProductAndDate = findByProductAndDate;
itemLogSchema.statics.countByProduct = countByProduct;
itemLogSchema.statics.countByDate = countByDate;
itemLogSchema.statics.countByUser = countByUser;
itemLogSchema.statics.countByProductAndDate = countByProductAndDate;
itemLogSchema.statics.countByUserAndDate = countByUserAndDate;
itemLogSchema.statics.createLog = createLog;

LogDB.model('ItemLog', itemLogSchema);