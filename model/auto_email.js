'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

const MODE = ['daily', 'monthly'];

let autoSchema = new Schema({
    name: { type: String, required: true },
    searchQuery: { type: String, required: true, ref: 'SearchQuery' },
    metadata: { type: Schema.Types.Mixed, required: true },
    mode: { type: String, enum: MODE, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastRun: { type: Date },
    nextRun: { type: Date },
    isEnabled: { type: Boolean },
    tracking: { type: String },
    type: { type: Number, enum: [1, 2], required: true } // 1 : email , 2 : push
});

autoSchema.index({ isEnabled: 1, type: 1, nextRun: 1 });

autoSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    next();
});

let updateLastRun = function (id, callback) {
    this.findByIdAndUpdate(id, { $set: { lastRun: Date.now() } }, callback);
};

autoSchema.statics.updateLastRun = updateLastRun;

mongoose.model('EmailAutomationPush', autoSchema);
