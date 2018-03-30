/**
 * Created by cuongpham on 11/5/14.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var premiumLogSchema = new Schema({
    email: {type: String, trim:true, index:true},
    admin: {type: String, trim:true, required:true},
    action: {type: String, trim:true, required: true},
    updateAt: {type: Date, default:Date.now}
});

premiumLogSchema.statics = {
    addNew: function(email, admin, action, callback){
        var obj = {
            email: email,
            admin: admin,
            action: action
        };

        var pl = new this(obj);
        pl.save(function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        });
    },

    getList: function(limit, skip, callback){
        this.find()
            .limit(limit)
            .skip(skip)
            .sort('-updateAt')
            .exec(function(err, result){
                callback(err, result);
            });
    },

    clearLog: function(callback){
        this.remove(function(err, result){
            callback(err, result);
        });
    },

    searchByAdmin: function(admin, callback){
        this.find({admin: admin}, function(err, result){
            callback(err, result);
        });
    },

    searchByEmail: function(email, callback){
        this.find({email: email}, function(err, result){
            callback(err, result);
        });
    }
};

mongoose.model('PremiumLog', premiumLogSchema);
