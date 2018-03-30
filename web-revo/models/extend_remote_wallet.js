var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rwlrSchema = new Schema({
    user: {type: String, ref: 'User', index: true, required: true},
    requested_date: {type: Date, default: Date.now, index: true},
    accepted: {type: Boolean, index: true, default: false},
    limit: {type: Number}
});

rwlrSchema.statics = {
    addNew: function(info, callback){
        var item = new this({
            user: info.userId
        });
        if (info.limit) item.limit = info.limit;
        if (info.accepted) item.accepted = info.accepted;

        item.save(callback);
    },

    accept: function(id, callback){
        this.findByIdAndUpdate(id, {accepted: true}, callback);
    },

    delete: function(id, callback){
        this.findByIdAndRemove(id, callback);
    },

    findByUser: function(id, skip, limit, callback){
        this.find({user: id})
            .sort('-requested_date')
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    },

    findAll: function(skip, limit, callback){
        this.find()
            .sort({accepted: 1, requested_date: 1})
            .skip(skip)
            .limit(limit)
            .populate('user')
            .lean()
            .exec(callback);
    }
};

mongoose.model('ExtendRemoteWallet', rwlrSchema);