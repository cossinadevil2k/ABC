'use strict';

const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;
const LogDb = require('./helper/mongodb_connect_logs');

let logSubRenewSchema = new Schema({
    createdAt: { type: Date, default: Date.now, index: true },
    product_id: { type: String, index: true, required: true },
    user: { type: String, index: true, required: true },
    expire: { type: Date, index: true },
    bill_id: { type: String, index: true, required: true },
    platform: { type: String, enum: ["android", "ios", "windows"] }
});


function addNew(data, callback) {
    if (!data.product_id || !data.user || !data.bill_id) {
        return callback('missing param');
    }

    let dataObject = new this(data);
    dataObject.save(callback);
}


function getLog(skip, limit, callback) {
    this.find()
        .skip(skip)
        .limit(limit)
        .sort({"createdAt" : -1})
        .lean()
        .exec(callback);
}


logSubRenewSchema.statics.addNew = addNew;
logSubRenewSchema.statics.getLog = getLog;

LogDb.model('SubscriptionRenewLog', logSubRenewSchema);
