var mongoose = require('mongoose');
var Device = mongoose.model('Device');
var Schema = mongoose.Schema;

var logSchema = new Schema({
    user: {type: String, trim: true, ref:'User', required: true, index: true},
    token: {type: String, trim: true, required: true, index: true},
    content: {type: String, trim: true, required: true},
    flag: {type: Number, enum:[1,2,3], index: true},
    itemType: {type: String, trim: true, enum:["wl","ct","cp","bg","tr"], index: true},
    error: {type: Number, index: true},
    createdAt: {type: Date, default: Date.now, index: true},
    exception: {type: String, trim: true},
    platform: {type: Number, index: true, required: true}
});

logSchema.statics = {
    createLog: function(info, callback){
        var log = new this({
            user: info.user,
            token: info.token,
            content: info.content,
            flag: info.flag,
            itemType: info.itemType,
            platform: info.platform
        });

        if (info.error) log.error = info.error;
        if (info.exception) log.exception = info.exception;
        log.save(callback);
    },

    findByUser: function(user, skip, limit, callback){
        this.find({user: user})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    },

    findByEmail: function(email, skip, limit, callback){
        var User = mongoose.model('User');
        var self = this;
        User.findByEmail(email, function(error, user){
            if (error) callback(error);
            else if (!user) callback('no_user_found');
            else {
                self.find({user: user._id})
                    .sort('-createdAt')
                    .skip(skip)
                    .limit(limit)
                    .populate('user')
                    .lean()
                    .exec(callback);
            }
        });
    },

    findByToken: function(token, skip, limit, callback){
        this.find({token: token})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    },

    findByFlag: function(flag, skip, limit, callback){
        this.find({flag: flag})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    },

    findByItemType: function(type, skip, limit, callback){
        this.find({itemType: type})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    },

    findByError: function(error_code, skip, limit, callback){
        this.find({error: error_code})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    },

    findByDate: function(startDate, endDate, skip, limit, callback){
        this.find({createdAt: {$gt: startDate, $lt: endDate}})
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    }
};

mongoose.model('LogSync', logSchema);