/**
 * Created by cuongpham on 9/29/16.
 */

'use strict';

let LogDb = require('./helper/mongodb_connect_logs');
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let moment = require('moment');

let SaleLogSchema = new Schema({
    product_id: {type: String, index: true},
    price: {type: Number},
    sale_date: {type: Date, default: Date.now, index: true},
    bill_id: {type: String, required: true, unique: true, index: true},
    user: {type: String}
});

let findByProductId = function(productId, callback){
    this.find({product_id: productId}, callback);
};

let findByBillId = function(billId, callback){
    this.findOne({bill_id: billId}, callback);
};

let findByDate = function(date, callback){
    //input date format YYYY-MM-DD
    let startTime = moment(date, 'YYYY-MM-DD').startOf('day').format();
    let endTime = moment(date, 'YYYY-MM-DD').endOf('day').format();
    let query = {
        sale_date: {
            $gte: startTime,
            $lte: endTime
        }
    };

    this.find(query, callback);
};

let findByDateRange = function(startDate, endDate, callback){
    let startTime = moment(startDate, 'YYYY-MM-DD').startOf('day').format();
    let endTime = moment(endDate, 'YYYY-MM-DD').endOf('day').format();
    let query = {
        sale_date: {
            $gte: startTime,
            $lte: endTime
        }
    };

    this.find(query, callback);
};

SaleLogSchema.statics.findByProductId = findByProductId;
SaleLogSchema.statics.findByBillId = findByBillId;
SaleLogSchema.statics.findByDate = findByDate;
SaleLogSchema.statics.findByDateRange = findByDateRange;

LogDb.model('SaleLog', SaleLogSchema);