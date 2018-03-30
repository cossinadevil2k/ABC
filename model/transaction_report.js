'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    transaction: {type: String, required: true, unique: true, trim: true, ref: 'Transaction', index: true},
    user: {type: String, required: true, trim: true, ref: 'User', index: true},
    report_date: {type: Date, default: Date.now, index: true},
    report_type: {type: String, required: true, enum: ['hidden_fee', 'double_charge', 'fraud']},
    forwarded: {type: Boolean, default: false, index: true},
    forwarded_date: {type: Date},
    isDeleted: false
});


/**
 * Statics functions
 */

let markForwarded = function () {
    this.forwarded = true;
    this.forwarded_date = Date.now();
    this.save();
};

let createReport = function(transaction_id, user_id, type, callback){
    //check exists
    this.findByTransactionId(transaction_id, (err, report) => {
        if (err) return callback(err);

        if (report) {
            report.user = user_id;
            report.report_type = type;
            report.forwarded = false;

            if (report.isDeleted) {
                report.isDeleted = false;
            }

            report.save(callback);
        } else {
            let item = new this({
                transaction: transaction_id,
                user: user_id,
                report_type: type
            });

            item.save(callback);
        }
    });
};

let removeByReportId = function(report_id, callback){
    this.findByIdAndRemove(report_id, callback);
};

let removeByUserId = function(user_id, callback){
    this.remove({user: user_id}, callback);
};

let removeByTransactionId = function(transaction_id, callback){
    this.remove({transaction: transaction_id}, callback);
};

let findByTransactionId = function(transaction_id, callback){
    this.findOne({transaction: transaction_id}, callback);
};

let findByUserId = function(user_id, callback){
    this.find({user: user_id}, callback);
};

let findByForwardStatus = function(status, limit, callback) {
    this.find({forwarded: status})
        .sort('report_date')
        .limit(limit)
        .exec(callback);
};

let undoReport = function(transaction_id, callback) {
    this.findOne({transaction: transaction_id}, (err, transaction) => {
        if (err) {
            return callback(err);
        }

        if (!transaction) {
            return callback();
        }

        if (transaction.isDeleted) {
            return callback();
        }

        transaction.isDeleted = true;

        transaction.save(callback);
    });
};

/**
 * Exports
 */

reportSchema.pre('save', function(next){
    this.report_date = Date.now();

    next();
});

reportSchema.methods.markForwarded = markForwarded;

reportSchema.statics.createReport = createReport;
reportSchema.statics.removeByReportId = removeByReportId;
reportSchema.statics.removeByUserId = removeByUserId;
reportSchema.statics.removeByTransactionId = removeByTransactionId;
reportSchema.statics.findByTransactionId = findByTransactionId;
reportSchema.statics.findByUserId = findByUserId;
reportSchema.statics.findByForwardStatus = findByForwardStatus;
reportSchema.statics.undoReport = undoReport;

mongoose.model('TransactionReport', reportSchema);