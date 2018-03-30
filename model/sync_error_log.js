let LogDb = require('./helper/mongodb_connect_logs');
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let syncErrorLogSchema = new Schema({
    userId: {type: String, required: true, index: true},
    postData: {type: String},
    errorCode: {type: Number, required: true},
    errorMessage: {type: String, required: true},
    errorDetail: {type: String},
    platform: {type: Number, index: true},
    tokenDevice: {type: String},
    url: {type: String, index: true},
    errorDate: {type: Date, default: Date.now, index: true}
});

LogDb.model('SyncErrorLog', syncErrorLogSchema);
