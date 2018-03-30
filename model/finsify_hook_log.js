'use strict';

const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;
const LogDb = require('./helper/mongodb_connect_logs');

let logHookSchema = new Schema({
    createdAt: { type: Date, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed }
});

function addNew(data, callback) {
    if (!data.metadata) {
        return callback('missing param');
    }

    let dataObject = new this(data);
    dataObject.save(callback);
}

function getLog(skip, limit, callback) {
    this.find()
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
}


logHookSchema.statics.addNew = addNew;
logHookSchema.statics.getLog = getLog;
// logHookSchema.statics.getLogByDate = getLogByDate;

LogDb.model('FinsifyHookLog', logHookSchema);