var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userCoupon = new Schema({
    user: {type: String, trim: true, ref:'User', required: true, index: true},
    coupon: {type: String, trim: true, ref:'Coupon', index: true},
    pickedDate: {type: Date, default: Date.now, index: true},
    source: {type: String, trim: true, index: true}
});

userCoupon.statics = {
    pickCoupon: function(info, callback){
        if (!info.user || !info.coupon || !info.from) return callback('invalid params');

        var item = new this({
            user: info.user,
            coupon: info.coupon,
            from: info.from
        });

        item.save(callback);
    },

    findByUser: function(userId, skip, limit, callback){
        this.find({user: userId})
            .select('coupon pickedDate source')
            .sort('-pickedDate')
            .skip(skip)
            .limit(limit)
            .populate('coupon','name provider amount startDate endDate location')
            .exec(callback);
    },

    findByCoupon: function(coupon, skip, limit, callback){
        this.find({coupon: coupon})
            .select('user pickedDate source')
            .sort('-pickedDate')
            .skip(skip)
            .limit(limit)
            .populate('user','email')
            .exec(callback);
    },

    countByUser: function(userId, callback){
        this.count({user: userId}, callback);
    },

    countByCoupon: function(coupon, callback){
        this.count({coupon: coupon}, callback);
    }
};

mongoose.model('UserCoupon', userCoupon);