'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let SCALE_MODE = ['1-100', '100-1000', '1000+'];

let STATUS_MODE = {
    PENDING: 0,
    ACCEPTED: 1,
    DENIED: 2
};

let registerDevMLSchema = new Schema({
    partnerName: { type: String, required: true },
    email: { type: String, required: true },
    reason: { type: String, required: true },
    scale: { type: String, enum: SCALE_MODE, required: true },
    status: { type: Number, enum: STATUS_MODE, default: STATUS_MODE.PENDING },
    keys: {
        sandbox: {
            api: { type: String },
            secret: { type: String }
        },
        production: {
            api: { type: String },
            secret: { type: String }
        }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

registerDevMLSchema.index({ email: 1, isAccepted: 1 });

registerDevMLSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    next();
});

let create = function (item, callback) {
    let object = new this(item);

    object.save(callback);
}

let getAll = function (data, callback) {
    let limit = data.perPage;
    let offset = data.perPage * (data.page - 1);

    this.find()
        .skip(offset)
        .limit(limit)
        .sort({ "status": 1 })
        .exec(callback);
}

let countTotal = function (callback) {
    this.count(callback);
}

let updateRecord = function (condition, updateData, options, callback) {
    this.findByIdAndUpdate(condition, updateData, options, callback);
}

let findByStatus = function (condition, callback) {
    this.find(condition, callback);
}

let findByPartnerId = function (id, callback) {
    this.findOne({ _id: id }, callback);
}

let checkEmailExist = function (email, callback) {
    this.findOne({ email: email }, callback);
};

let deleteRecord = function (id, callback) {
    this.remove({ _id: id }, callback);
}

registerDevMLSchema.statics.create = create;
registerDevMLSchema.statics.getAll = getAll;
registerDevMLSchema.statics.countTotal = countTotal;
registerDevMLSchema.statics.updateRecord = updateRecord;
registerDevMLSchema.statics.findByStatus = findByStatus;
registerDevMLSchema.statics.findByPartnerId = findByPartnerId;
registerDevMLSchema.statics.checkEmailExist = checkEmailExist;
registerDevMLSchema.statics.deleteRecord = deleteRecord;

mongoose.model('registerDevML', registerDevMLSchema);
