'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let receiptSchema = new Schema({
    user: {type: String, trim: true, required: true, ref: 'User', index: true},
    image_id: {type: String, trim: true, required: true, unique: true, index: true},
    category: {type: String, trim: true, ref: 'Category'},
    wallet: {type: String, trim: true, ref: 'Account'},
    status: {type: String, enum: ['open', 'draft', 'rejected', 'done'], default: 'open', index: true},
    data: {type: Schema.Types.Mixed},
    admin: {type: String, trim: true, ref: 'Administrator', index: true},
    created_at: {type: Date, default: Date.now, index: true},
    updated_at: {type: Date, default: Date.now, index: true},
    metadata: {type: Schema.Types.Mixed}
});

receiptSchema.index({user: 1, status: 1});
receiptSchema.index({admin: 1, status: 1});
receiptSchema.index({admin: 1, status: 1, updated_at: 1});

/**
 * FUNCTIONS
 */

function findCustom(context, query, skip, limit, options, callback){
    let sort = {
        created_at: -1
    };

    if (options) {
        if (options.sort) {
            if (options.sort == 'asc') {
                sort['created_at'] = 1;
            } else {
                //desc
                sort['created_at'] = -1;
            }
        }
    }

    context.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'email')
        .populate('admin', 'username')
        .populate('category', 'name account type')
        .populate('wallet', 'name currency_id')
        .exec(callback);
}

let create = function (user_id, image_id, category, wallet, callback) {
    let item = new this({
        user: user_id,
        image_id: image_id
    });

    if (category) {
        item.category = category;
    }

    if (wallet) {
        item.wallet = wallet;
    }

    item.save(callback);
};

let findByUserId = function (user_id, callback) {
    this.find({user: user_id})
        .sort({created_at: -1})
        .exec(callback);
};

let edit = function (id, update, callback){
    this.findByIdAndUpdate(id, update, callback);
};

let markDone = function(id, callback) {
    this.findByIdAndUpdate(id, {$set: {done_status: true}}, callback);
};

let findByReceiptId = function(id, callback) {
    this.findById(id)
        .populate('user', 'email')
        .populate('admin', 'username')
        .populate('category', 'name account type')
        .populate('wallet', 'name currency_id')
        .exec(callback);
};

let findByStatus = function(status, skip, limit, callback, options) {
    let query;

    if (status === 'new') {
        query = {admin: null};
    } else {
        query = {status: status};
    }

    findCustom(this, query, skip, limit, options, callback);
};

let findByAdmin = function(admin_id, skip, limit, callback, options) {
    findCustom(this, {admin: admin_id}, skip, limit, options, callback);
};

let findByAdminAndStatus = function(admin_id, status, skip, limit, callback, options) {
    findCustom(this, {admin: admin_id, status: status}, skip, limit, options, callback);
};

let findByUser = function(user_id, skip, limit, callback, options){
    findCustom(this, {user: user_id}, skip, limit, options, callback);
};

let findByUserAndStatus = function(admin_id, status, skip, limit, callback, options) {
    findCustom(this, {admin: admin_id, status: status}, skip, limit, options, callback);
};

let findAll = function(skip, limit, callback, options) {
    findCustom(this, {}, skip, limit, options, callback);
};

/**
 * EXPORTS
 */

receiptSchema.statics.createNew = create;
receiptSchema.statics.findByUserId = findByUserId;
receiptSchema.statics.edit = edit;
receiptSchema.statics.markDone = markDone;
receiptSchema.statics.findByReceiptId = findByReceiptId;
receiptSchema.statics.findByStatus = findByStatus;
receiptSchema.statics.findByAdmin = findByAdmin;
receiptSchema.statics.findByAdminAndStatus = findByAdminAndStatus;
receiptSchema.statics.findByUser = findByUser;
receiptSchema.statics.findByUserAndStatus = findByUserAndStatus;
receiptSchema.statics.findAll = findAll;

mongoose.model('Receipt', receiptSchema);