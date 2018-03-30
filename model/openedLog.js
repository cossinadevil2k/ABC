/**
 * Created by cuongpham on 11/26/14.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var openedLogSchema = new Schema({
    device: {type:String, ref:'Device', required:true, trim:true, index:true},
    user: {type:String, ref:'User', trim:true, index:true},
    versionCode: {type: Number, trim:true},
    ip:{type:String, trim:true},
    time: {type:Date, default:Date.now, index: true}
});

openedLogSchema.pre('save', function(next){
    this.time = new Date();
    next();
});

openedLogSchema.statics = {
    addNew: function(deviceId, userId, versionCode, ip, callback){
        if(deviceId){
            var obj = {
                device: deviceId,
                ip: ip
            };

            if(userId) obj.user = userId;
            if(versionCode) obj.versionCode = versionCode;

            var op = new this(obj);
            op.save(function(err, result){
                callback(err, result);
            })
        } else {
            callback(true, null);
        }
    },

    getList: function(limit, skip, callback){
        this.find()
            .limit(limit)
            .skip(skip)
            .populate('device','_id name platform appId')
            .populate('user','_id email')
            .sort('-time')
            .lean()
            .exec(function(err, result){
                callback(err, result);
            });
    },

    clearLog: function(callback){
        this.remove(function(err, result){
            callback(err, result);
        });
    }
};

mongoose.model('OpenedLog', openedLogSchema);
