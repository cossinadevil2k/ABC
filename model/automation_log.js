'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let autoLogSchema = new Schema({
    autoId: { type: Schema.Types.ObjectId, required: true, ref: 'EmailAutomationPush' },
    createdAt: { type: Date, default: Date.now },
    startRun: { type: Date },
    finishRun: { type: Date },
    status: { type: String, enum: ['perfect', 'fail', 'delay'] }
});

autoLogSchema.index({ startRun: 1, finishRun: 1 });

function checkDelayPermission(startRunTime, finishRunTime) {
    if (Math.abs(finishRunTime.getTime() - startRunTime.getTime()) <= 300000) { // delay permission is 5 minutes
        return true;
    } else {
        return false;
    }
}

function addNew(dataParams, callback) {
    if (dataParams.status === 'failed') {
        dataParams.status = 'fail';
    } else {
        let startRunTime = new Date(dataParams.startRun);
        let finishRunTime = new Date(dataParams.finishRun);

        if (startRunTime.getTime() == finishRunTime.getTime() || checkDelayPermission(startRunTime, finishRunTime)) {
            dataParams.status = 'perfect';
        } else {
            dataParams.status = 'delay';
        }
    }
    let obj = new this(dataParams);
    obj.save(callback);
};

function getAll(dataParams, callback) {
    let query = this.find();

    if (dataParams.limit) {
        query.limit(dataParams.limit);
    }

    if (dataParams.offset) {
        query.skip(dataParams.offset);
    }
    query.sort({ createdAt: -1 });
    query.populate('autoId');
    query.exec(callback);
}

function clearData(callback) {
    this.remove(callback);
}

autoLogSchema.statics.addNew = addNew;
autoLogSchema.statics.getAll = getAll;
autoLogSchema.statics.clearData = clearData;
// autoLogSchema.statics.analysisStatus = analysisStatus;

mongoose.model('Automation_Log', autoLogSchema);
