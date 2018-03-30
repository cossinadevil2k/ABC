'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const discountTrackingSchema = new Schema({
    user: { type: String, required: true, trim: true, ref: 'User', index: true },
    discount_type: { type: String, required: true, trim: true, enum: ['20', '40', '60', '80'] },
    campaign: { type: String, trim: true, index: true },
    product: { type: String, required: true, ref: 'Item', index: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

mongoose.model('DiscountTracking', discountTrackingSchema);