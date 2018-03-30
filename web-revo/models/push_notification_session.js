var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var utils = require('../helper/utils');

var PushNotificationLogSession = new Schema({
    _id: {type: String, trim: true, unique: true, required: true, index: true},
    notification: {type: String, ref: 'Message', required: true, index: true},
    searchQuery: {type: String, ref:'SearchQuery', index: true},
    pushDate: {type: Date, default: Date.now, index: true},
    pushBy: {type: String, ref: 'Administrator'},
    approvedBy: {type: String, ref: 'Administrator'},
    status: {type: String, enum: ['Pending', 'Accepted', 'Denied']},
    approvedDate: {type: Date, index: true}
});

PushNotificationLogSession.statics = {
    addNew: function(info, callback){
        if (!info.notification) return callback(100); //error param_invalid

        var item = new this({
            _id: utils.uid(3),
            notification: info.notification,
            pushBy: info.pushBy
        });

        if (info.searchQuery) item.searchQuery = info.searchQuery;

        if (info.approvedBy) item.approvedBy = info.approvedBy;

        if (info.status) item.status = info.status;
        else if (info.pushBy === info.approvedBy) item.status = 'Accepted';
        else item.status = 'Pending';

        if (info.approvedDate) item.approvedDate = info.approvedDate;
        else if (info.pushBy === info.approvedBy) item.approvedDate = Date.now();

        item.save(callback);
    },

    findByNotificationId: function(id, skip, limit, callback){
        this.find({notification: id})
            .sort('-pushDate')
            .skip(skip)
            .limit(limit)
            .populate('searchQuery')
            .populate('pushBy', 'username')
            .populate('approvedBy', 'username')
            .lean()
            .exec(callback);
    },

    findAll: function(skip, limit, callback){
        this.find()
            .sort('-pushDate')
            .skip(skip)
            .limit(limit)
            .populate('notification')
            .populate('searchQuery')
            .populate('pushBy', 'username')
            .populate('approvedBy', 'username')
            .lean()
            .exec(callback);
    },

    findPending: function(skip, limit, callback){
        this.find({status: 'Pending'})
            .sort('-pushDate')
            .skip(skip)
            .limit(limit)
            .populate('notification')
            .populate('searchQuery')
            .populate('pushBy', 'username')
            .populate('approvedBy', 'username')
            .lean()
            .exec(callback);
    },

    findDenied: function(skip, limit, callback){
        this.find({status: 'Denied'})
            .sort('-pushDate')
            .skip(skip)
            .limit(limit)
            .populate('notification')
            .populate('searchQuery')
            .populate('pushBy', 'username')
            .populate('approvedBy', 'username')
            .lean()
            .exec(callback);
    },

    findAccepted: function(skip, limit, callback){
        this.find({status: 'Accepted'})
            .sort('-pushDate')
            .skip(skip)
            .limit(limit)
            .populate('notification')
            .populate('searchQuery')
            .populate('pushBy', 'username')
            .populate('approvedBy', 'username')
            .lean()
            .exec(callback);
    },

    acceptSession: function(sectionId, byAdmin, callback){
        this.findByIdAndUpdate(sectionId, {
            approvedBy: byAdmin,
            approvedDate: Date.now(),
            status: 'Accepted'
        }, callback);
    },

    denySession: function(sectionId, byAdmin, callback){
        this.findByIdAndUpdate(sectionId, {
            approvedBy: byAdmin,
            approvedDate: Date.now(),
            status: 'Denied'
        }, callback);
    }
};

mongoose.model('PushNotificationSession', PushNotificationLogSession);