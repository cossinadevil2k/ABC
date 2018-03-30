var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Mixed = Schema.Types.Mixed,
    Device = mongoose.model('Device');

var failedSyncItemSchema = new Schema({
    user: {type: String, trim:true, ref:'User', index: true},
    platform: {type: Number, index: true},
    item: {type: Mixed},
    flag: {type: Number},
    error: {type: String, index:true},
    errorDate: {type: Date, default: Date.now, index:true}
});

failedSyncItemSchema.statics = {
    addNew: function(userId, platform, item, flag, error, callback){
        var data = new this({
            user: userId,
            platform: platform,
            item: item,
            flag: flag,
            error: error
        });

        data.save(function(err, result){
            if(err || !result) callback(false);
            else callback(true);
        });
    }
};

mongoose.model('FailedSyncItem', failedSyncItemSchema);