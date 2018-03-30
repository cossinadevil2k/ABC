'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let async = require('async');

let notificationSchema = new Schema({
    user: {type: String, trim: true, ref:'Administrator', required: true, index: true},
    unread: {type: Boolean, default: true, index: true},
    type: {type: String},
    content: {type: String, trim: true},
    url: {type: String, trim: true, index: true},
    createAt: {type: Date, default: Date.now, index: true}
});

notificationSchema.statics = {
    get: function(user_id, skip, limit, callback){
        this.find({user: user_id})
            .sort({createAt: -1})
            .skip(skip)
            .limit(limit)
            .exec(callback)
    },

    countNew: function(user_id, callback) {
        this.count({user: user_id, unread: true}, callback);
    },

    addNew: function(user_id, type, content, url, callback){
        let item = new this({
            user: user_id,
            unread: true,
            type: type,
            content: content,
            url: url
        });

        item.save(callback);
    },

    markAllAsRead: function(user_id, callback){
        let query = {
            user: user_id,
            unread: true
        };

        this.find(query, function(err, listNotification){
            if (err) {
                return callback(err);
            }

            if (listNotification.length > 0){
                async.eachSeries(listNotification, function(notification, next){
                    notification.unread = false;
                    notification.save(function(error, result){
                        if (error) next(error);
                        else next();
                    })
                }, function(e){
                    if (e) callback(true);
                    else callback(null);
                })
            } else {
                callback(null);
            }
        });
    },

    deleteOne: function(id, callback){
        this.findByIdAndRemove(id, callback);
    },

    deleteAll: function(user_id, callback){
        let query = {user: user_id};
        this.remove(query, callback);
    }
};

mongoose.model('BackendNotification', notificationSchema);
