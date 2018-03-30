
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Subscriber = new Schema({
    phone: {type:String, trim:true},
    email: {type:String, trim: true},
    sponsoredId: {type: String, trim:true, ref: 'Sponsor'},
    subscribed: {type: Boolean, default: true}
});

Subscriber.statics = {
    addNew: function(sponsoredId, type, value, callback){
        var obj = {
            sponsoredId: sponsoredId
        };

        if(type==='phone'){
            obj.phone = value;
        } else {
            //type==='email'
            obj.email = value;
        }

        var s = new this(obj);
        s.save(function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        });
    },

    countBySponsored: function(sponsoredId, callback){
        this.count({sponsoredId: sponsoredId, subscribed: true}, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        });
    },

    findBySponsored: function(sponsoredId, callback){
        this.find({sponsoredId: sponsoredId, subscribed:true}, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        });
    },

    findByPhone: function(phone, callback){
        this.find({phone: phone, subscribed:true}, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        })
    },

    findByEmail: function(email, callback){
        this.find({email: email, subscribed:true}, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result)
            }
        });
    },

    unsubscribe: function(sponsoredId, type, value, callback){
        var query = {sponsoredId: sponsoredId};
        if(type==='phone'){
            query.phone = value;
        } else {
            //type==='email'
            query.email = value;
        }

        this.findOneAndUpdate(query, {subscribed: false}, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        });
    }
};

mongoose.model('SponsoredSubscribe', Subscriber);