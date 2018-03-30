var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var activitySchema = new Schema({
    user: {type: String, trim: true, ref:'User', required: true, index: true},
    content: {type: String, trim: true, required: true},
    createdAt: {type: Date, default: Date.now, index: true}
});

activitySchema.statics = {
    addNew: function(info, callback){
        if (!info.user || !info.content) return callback("Info invalid", null);

        var activity = new this({
            user: info.user,
            content: info.content
        });

        activity.save(callback);
    },
    remove: function(activity_id, callback){
        this.findByIdAndRemove(activity_id, callback);
    },

    findByUser: function(userId, callback){
        this.find({user: userId})
            .select('-__v -user')
            .sort({createdAt: -1})
            .lean()
            .exec(callback);
    }
};

mongoose.model('Activity', activitySchema);