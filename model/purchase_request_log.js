let LogDb = require('./helper/mongodb_connect_logs');
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let purchaseRequestLogSchema = new Schema({
    userId: { type: String, required: true, index: true },
    statusCode: { type: Number, default: 200 },
    platform: { type: Number, required: true, index: true },
    url: { type: String, required: true, index: true },
    logAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

function addNew(data, callback) {
    if (!data.userId || !data.platform || !data.logAt || !data.url) {
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


purchaseRequestLogSchema.statics.addNew = addNew;
purchaseRequestLogSchema.statics.getLog = getLog;

LogDb.model('PurchaseRequestLog', purchaseRequestLogSchema);
