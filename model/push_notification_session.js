'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let utils = require('./helper/utils');

let PushNotificationLogSession = new Schema({
    _id: {type: String, trim: true, unique: true, required: true, index: true},
    notification: {type: String, ref: 'Message', required: true, index: true},
    searchQuery: {type: String, ref:'SearchQuery', index: true},
    pushDate: {type: Date, default: Date.now, index: true},
    pushBy: {type: String, ref: 'Administrator'},
    approvedBy: {type: String, ref: 'Administrator'},
    status: {type: String, enum: ['Pending', 'Accepted', 'Denied', 'Scheduled']},
    approvedDate: {type: Date, index: true},
    schedule_time: {type: String},
    email_list: {type: Schema.Types.Mixed}
});

const select_fields = '-email_list';

PushNotificationLogSession.statics = {
    addNew: function(info, callback){
        if (!info.notification) return callback(100); //error param_invalid

        let item = new this({
            _id: utils.uid(3),
            notification: info.notification,
            pushBy: info.pushBy
        });

        if (info.searchQuery) item.searchQuery = info.searchQuery;

        if (info.approvedBy) item.approvedBy = info.approvedBy;

        if (info.status) {
            item.status = info.status;
        } else if (info.schedule_time) {
            item.schedule_time = info.schedule_time;
            item.status = 'Pending';
        } else if (info.pushBy === info.approvedBy) {
            item.status = 'Accepted';
        } else {
            item.status = 'Pending';
        }

        if (info.approvedDate) item.approvedDate = info.approvedDate;
        else if (info.pushBy === info.approvedBy) item.approvedDate = Date.now();

        if (info.email_list) {
            item.email_list = info.email_list;
        }

        item.save(callback);
    },

    findByNotificationId: function(id, skip, limit, callback){
        this.find({notification: id})
            .select(select_fields)
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
            .select(select_fields)
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
            .select(select_fields)
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
            .select(select_fields)
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
            .select(select_fields)
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
        this.findById(sectionId, (err, session) => {
            if (err) {
                return callback(err);
            }

            let update = {
                approvedBy: byAdmin,
                approvedDate: Date.now(),
                status: 'Accepted'
            };

            if (session.schedule_time) {
                update.status = 'Scheduled';
            }

            this.findByIdAndUpdate(sectionId, update, callback);
        });
    },

    denySession: function(sectionId, byAdmin, callback){
        this.findByIdAndUpdate(sectionId, {
            approvedBy: byAdmin,
            approvedDate: Date.now(),
            status: 'Denied'
        }, callback);
    },

    changeStatus: function(sectionId, status, callback){
        this.findByIdAndUpdate(sectionId, {status: status}, callback);
    }
};

mongoose.model('PushNotificationSession', PushNotificationLogSession);
