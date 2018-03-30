'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TYPE = {
    ICON: 1,
    SUBSCRIPTION: 2,
    USE_CREDIT: 3,
    PREMIUM: 5,
    SEMI_PREMIUM: 6,
    OTHER: 99
};

let itemSchema = new Schema({
    name: { type: String, required: true },
    product_id: { type: String, required: true, index: true },
    owner: { type: String },
    preview: { type: String },
    thumb: { type: String },
    link: { type: String },
    isFeature: { type: Boolean, default: false, index: true },
    isTopDownload: { type: Boolean, default: false, index: true },
    isFree: { type: Boolean, default: false, index: true },
    canShare: { type: Boolean, default: false },
    canBuy: { type: Boolean, default: false },
    isNewItem: { type: Boolean, default: true, index: true },
    isPublic: { type: Boolean, default: false, index: true },
    isHide: { type: Boolean, default: false },
    price_vn: { type: Number },
    price_gl: { type: Number },
    price_credit : {type : Number},
    type: { type: Number, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expire_unit: { type: String, enum: ['days', 'months', 'years', 'weeks'] },
    expire_value: { type: Number },
    has_trial: { type: Boolean, default: false },
    alias: [{ type: String, trim: true, index: true }],
    discount: { type: Number },
    metadata: { type: Schema.Types.Mixed },
    markAsGift: { type: Boolean, default: false }
});

itemSchema.index({ isPublic: 1, isHide: 1 });
itemSchema.index({ isPublic: 1, isHide: 1, type: 1 });
itemSchema.index({ type: 1, markAsGift: 1 });

itemSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    next();
});

let createItem = function (info, callback) {
    let item = new this(info);

    if (!item.alias) {
        item.alias = item.product_id;
    } else {
        if (item.alias.indexOf(item.product_id) === -1) {
            item.alias.push(item.product_id);
        }
    }

    item.save(callback);
};

let editItemById = function (id, update, callback) {
    if (!update.alias) {
        update.alias = update.product_id;
    } else {
        if (update.alias.indexOf(update.product_id) === -1) {
            update.alias.push(update.product_id);
        }
    }

    update.updatedAt = Date.now();

    this.findByIdAndUpdate(id, update, callback);
};

let removeItemById = function (id, callback) {
    this.findByIdAndRemove(id, callback);
};

let findAll = function (query, skip, limit, callback) {
    this.find(query)
        .sort({ isNewItem: -1, isFree: -1, isFeature: -1, isTopDownload: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
};

let findByProductId = function (product_id, callback) {
    this.findOne({ alias: product_id })
        .exec((err, product) => {
            if (err) {
                return callback(err);
            }

            if (product) {
                return callback(null, product);
            }

            this.findOne({ product_id: product_id }, callback);
        });
};

let findByListProductId = function (list_product_id, callback) {
    this.find({ product_id: { $in: list_product_id } })
        .lean()
        .exec(callback);
};

let getIconDataForCache = function (callback) {
    let query = { isPublic: true, type: 1 };
    let selectField = '-__v -_id -type -updatedAt -createdAt';

    this.find(query)
        .select(selectField)
        .lean()
        .exec(callback);
};

let getSubscriptionDataForCache = function (callback) {
    let query = { isPublic: true, type: 2 };

    let selectField = '-_id product_id alias name price_vn price_gl has_trial expire_unit expire_value metadata';

    this.find(query)
        .select(selectField)
        .lean()
        .exec(callback);
};

let changePublicStatusById = function (id, status, callback) {
    this.findByIdAndUpdate(id, { isPublic: status }, callback);
};

let changeNewStatusById = function (id, status, callback) {
    this.findByIdAndUpdate(id, { isNewItem: status }, callback);
};

let changeFreeStatusById = function (id, status, callback) {
    this.findByIdAndUpdate(id, { isFree: status }, callback);
};

let changeFeatureStatusById = function (id, status, callback) {
    this.findByIdAndUpdate(id, { isFeature: status }, callback);
};

let changeTopDownloadStatusById = function (id, status, callback) {
    this.findByIdAndUpdate(id, { isTopDownload: status }, callback);
};

let changeHideStatusById = function (id, status, callback) {
    this.findByIdAndUpdate(id, { isHide: status }, callback);
};

itemSchema.statics.createItem = createItem;
itemSchema.statics.editItemById = editItemById;
itemSchema.statics.removeItemById = removeItemById;
itemSchema.statics.findAll = findAll;
itemSchema.statics.findByProductId = findByProductId;
itemSchema.statics.findByListProductId = findByListProductId;
itemSchema.statics.getIconDataForCache = getIconDataForCache;
itemSchema.statics.getSubscriptionDataForCache = getSubscriptionDataForCache;
itemSchema.statics.changePublicStatusById = changePublicStatusById;
itemSchema.statics.changeNewStatusById = changeNewStatusById;
itemSchema.statics.changeFreeStatusById = changeFreeStatusById;
itemSchema.statics.changeFeatureStatusById = changeFeatureStatusById;
itemSchema.statics.changeTopDownloadStatusById = changeTopDownloadStatusById;
itemSchema.statics.changeHideStatusById = changeHideStatusById;

mongoose.model('Item', itemSchema);
