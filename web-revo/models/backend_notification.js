var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');
var env	= process.env.NODE_ENV;
var config = require('../config/config')[env];
var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
var room = '/backend/notification/admin/';

var notificationSchema = new Schema({
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
        var noti = new this();
        noti.user = user_id;
        noti.unread = true;
        noti.type = type;
        noti.content = content;
        noti.url = url;

        noti.save(callback);
    },

    markAllAsRead: function(user_id, callback){
        var query = {
            user: user_id,
            unread: true
        };

        this.find(query, function(err, listNotification){
            if(err) throw err;
            else {
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
                } else callback(null);
            }
        });
    },

    deleteOne: function(id, callback){
        this.findByIdAndRemove(id, callback);
    },

    deleteAll: function(user_id, callback){
        var query = {user: user_id};
        this.remove(query, callback);
    },

    pushNotification: function(id, callback){
        //callback(error)
        this.findById(id, function(err, noti){
            if (!err || noti) {
                var content = {
                    type: noti.type
                };
                if (noti.url) content.url = noti.url;
                if (noti.content) content.content = noti.content;

                io.emit(room + noti.user, JSON.stringify(content));
                callback();
            } else callback(true);
        });

    }
};

mongoose.model('BackendNotification', notificationSchema);