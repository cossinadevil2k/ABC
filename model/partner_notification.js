'use strict';

var mongoose = require('mongoose');
var PartnerDB = require('./helper/mongodb_connect_partner');
var Schema = mongoose.Schema;
var async = require('async');

var notificationSchema = new Schema({
    partner: {type: String, trim: true, ref:'Partner', required: true, index: true},
    unread: {type: Boolean, default: true},
    type: {type: String},
    content: {type: String, trim: true, required: true},
    url: {type: String, trim: true},
    createAt: {type: Date, default: Date.now, index: true}
});

notificationSchema.index({partner: 1, unread: 1});

var createNew = function(info, callback){
    let item = new this(info);

    item.save(callback);
};

var getAll = function(partnerId, skip, limit, callback){
    this.find({partner: partnerId})
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
};

var markRead = function(notificationId, callback){
    this.findByIdAndUpdate(notificationId, {unread: false}, callback);
};

var markAllRead = function(partnerId, callback){
    let self = this;

    this.find({partner: partnerId}, function(err, notificationList){
        if (err) {
            return callback(err);
        }

        async.each(notificationList, function(notification, cb){
            self.markRead(notification._id, cb);
        }, callback)
    });
};

var deleteNotification = function(notificationId, callback){
    this.findByIdAndRemove(notificationId, callback);
};

var deleteAllNotification = function(partnerId, callback){
    this.remove({partner: partnerId}, callback);
};

var countNew = function(partnerId, callback){
    this.count({partner: partnerId, unread: true}, callback);
};

/**
 * EXPORTS
 */

notificationSchema.statics.createNew = createNew;
notificationSchema.statics.getAll = getAll;
notificationSchema.statics.markRead = markRead;
notificationSchema.statics.markAllRead = markAllRead;
notificationSchema.statics.deleteNotification = deleteNotification;
notificationSchema.statics.deleteAllNotification = deleteAllNotification;
notificationSchema.statics.countNew = countNew;

PartnerDB.model('PartnerNotification', notificationSchema);