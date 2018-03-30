var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = mongoose.model('User');

var DeviceNotificationSchema = new Schema({
    session: {type: String, trim: true, ref:'PushNotificationSession', required: true, index: true},
    device:{type: String, trim: true, ref: 'Device', required: true, index: true},
    user: {type: String, trim: true, ref: 'User', index: true},
    notification: {type: String, trim: true, ref: 'Message', index: true},
    state: {type: String, trim: true, enum: ["read", "sent", "error"]},
    sentDate: {type: Date, default: Date.now},
    openDate: {type: Date}
});

function countUser(schema, query, callback){
    //callback(error, amount)
    schema.aggregate(
        {
            $match: query
        },
        {
            $group: {
                _id: "$user",
                totalDevices: {
                    $sum: 1
                },
                counted: {
                    $sum: 0
                }
            }
        },
        {
            $group: {
                _id: "$counted",
                total: {
                    $sum: 1
                }
            }
        },function(err, result){
            if (err) callback(err);
            else {
                if (result.length === 0) callback(null, 0);
                else callback(null, result[0].total);
            }
        }
    );
}

function findUser(schema, query, skip, limit, callback){
    //callback(error, Array[<user_id>]
    schema.aggregate(
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $match: query
        },
        {
            $group: {
                _id: "$user",
                counted: {
                    $sum: 0
                }
            }
        },
        {
            $group: {
                _id: "$counted",
                userList: {
                    $push: "$_id"
                }
            }
        },
        function(err, result){
            if (err) callback(err);
            else {
                if (result.length === 0) callback(null, []);
                else callback(null, result[0].userList);
            }
        }
    );
}

function findNotification(schema, query, skip, limit, callback){
    //callback(error, Array[<notification_id>]
    schema.aggregate(
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $match: query
        },
        {
            $group: {
                _id: "$notification",
                counted: {
                    $sum: 0
                }
            }
        },
        {
            $group: {
                _id: "$counted",
                notificationList: {
                    $push: "$_id"
                }
            }
        },
        function(err, result){
            if (err) callback(err);
            else {
                if (result.length === 0) callback(null, []);
                else callback(null, result[0].notificationList);
            }
        }
    );
}

DeviceNotificationSchema.statics = {
    addNew: function(info, callback){
        if (!info.device || !info.session) return callback(100);
        var self = this;
        //check exists
        this.find({device: info.device, session: info.session, state: {$ne: 'read'}}, function(err, userNoti){
            if (err) callback(err);
            else if (userNoti.length > 0) callback(err, userNoti);
            else {
                var item = new self({
                    session: info.session,
                    device: info.device,
                    state: info.state || 'sent'
                });
                if (info.notification) item.notification = info.notification;
                if (info.user) item.user = info.user;
                item.save(callback);
            }
        });
    },

    notificationOpened: function(info, callback) {
        if (!info.device || !info.session) return callback(100);
        var self = this;
        this.findOne({device: info.device, session: info.session}, function(err, result){
            if (err || !result) callback(err);
            else {
                if (result.state !== "read") {
                    var changes = {
                        state: "read",
                        openDate: Date.now()
                    };
                    self.findByIdAndUpdate(result._id, changes, callback);
                } else callback(null, result);
            }
        });
    },

    countOpenedDeviceBySession: function(sessionId, callback){
        var query = {session: sessionId, state: "read"};
        this.count(query, callback);
    },

    countTotalBySession: function(sessionId, callback){
        this.count({session: sessionId}, callback);
    },

    countSentUserBySession: function(sessionId, callback){
        var query = {session: sessionId, state: 'sent'};
        countUser(this, query, callback);
    },

    countSentDeviceBySession: function(sessionId, callback){
        var query = {session: sessionId, state: {$in:['sent','read']}};
        this.count(query, callback);
    },

    countErrorUserBySession: function(sessionId, callback){
        var query = {session: sessionId, state: 'error'};
        countUser(this, query, callback);
    },

    countErrorDeviceBySession: function(sessionId, callback){
        var query = {session: sessionId, state: 'error'};
        this.count(query, callback);
    },

    findOpenedUsersBySession: function(sessionId, skip, limit, callback){
        var query = {session: sessionId, state: 'read'};
        findUser(this, query, skip, limit, callback);
    },

    findSentUserBySession: function(sessionId, skip, limit, callback){
        var query = {session: sessionId, state: 'sent'};
        findUser(this, query, skip, limit, callback);
    },

    findErrorUsersBySession: function(sessionId, skip, limit, callback){
        var query = {session: sessionId, state: 'error'};
        findUser(this, query, skip, limit, callback);
    },

    findSentNotificationByUser: function(userId, skip, limit, callback){
        var query = {user: userId, state: 'read'};
        findNotification(this, query, skip, limit, callback)
    },

    findSentDeviceBySession: function(sessionId, skip, limit, callback){
        var query = {session: sessionId, state: {$in:['sent','read']}};
        this.find(query)
            .sort('-sentDate')
            .skip(skip)
            .limit(limit)
            .populate('device')
            .populate('user email')
            .exec(function(err, result){
                if (err) callback(err);
                else {
                    User.populate(result, {
                        path: 'device.owner',
                        select: 'email'
                    }, callback);
                }
            });
    },

    findReadDeviceBySession: function(sessionId, skip, limit, callback){
        var query = {session: sessionId, state: 'read'};
        this.find(query)
            .sort('-sentDate')
            .skip(skip)
            .limit(limit)
            .populate('device')
            .populate('user email')
            .exec(function(err, result){
                if (err) callback(err);
                else {
                    User.populate(result, {
                        path: 'device.owner',
                        select: 'email'
                    }, callback);
                }
            });
    },

    findErrorDeviceBySession: function(sessionId, skip, limit, callback){
        var query = {session: sessionId, state: 'error'};
        this.find(query)
            .sort('-sentDate')
            .skip(skip)
            .limit(limit)
            .populate('device')
            .populate('user email')
            .exec(function(err, result){
                if (err) callback(err);
                else {
                    User.populate(result, {
                        path: 'device.owner',
                        select: 'email'
                    }, callback);
                }
            });
    }
};

mongoose.model('DeviceNotification', DeviceNotificationSchema);
