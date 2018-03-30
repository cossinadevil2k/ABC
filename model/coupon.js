var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');

var couponSchema = new Schema({
    name: {type: String, trim: true, index: true},
    provider: {type: String, trim: true, index: true},
    code: {type: String, trim: true, index: true},
    description: {type: String, trim: true},
    condition: {type: String, trim: true},
    location: {type: String, trim: true, index: true},
    amount: {type: Number},
    startDate: {type: Date, index: true},
    endDate: {type: Date, index: true},
    creator: {type: String, trim: true, ref:'Administrator'},
    metadata: {type: Schema.Types.Mixed},
    createdDate: {type: Date, default: Date.now},
    updateAt: {type: Date, default: Date.now},
    enabled: {type: Boolean, default: false, index: true}
});

function validateInfo(info){
    if (!info.name) return false;
    if (!info.provider) return false;
    if (!info.description) return false;
    if (!info.location) return false;
    if (!info.amount) return false;
    if (!info.creator) return false;
    return true;
}

couponSchema.statics = {
    addNew: function(info, callback){
        var item = new this({
            name: info.name,
            provider: info.provider,
            description: info.description,
            location: info.location,
            amount: info.amount,
            creator: info.creator
        });

        if (info.code) item.code = info.code;
        if (info.startDate) item.startDate = info.startDate;
        if (info.endDate) item.endDate = info.endDate;
        if (info.metadata) item.metadata = info.metadata;
        if (info.enabled) item.enabled = info.enabled;

        item.save(callback);
    },
    getAll: function(skip, limit, callback){

    },
    getAllForBackend: function(option, skip, limit, callback){
        var query = {};
        if (option.enabled != null || option.enabled != undefined) query.enabled = option.enabled;

        this.find(query)
            .sort('-createdDate')
            .skip(skip)
            .limit(limit)
            .populate('creator', 'username')
            .exec(callback);
    },
    getAvailable: function(skip, limit, callback){
        var today = moment().toISOString();
        var query = {
            enabled: true,
            $or: [
                {startDate: {$exists: false}},
                {startDate: {$exists: true, $lte: today}},
                {endDate: {$exists: false}},
                {endDate: {$exists: true, $gte: today}}
            ],
            amount: {$gt: 0}
        };
        var select = 'name provider amount startDate endDate location';

        this.find(query)
            .select(select)
            .sort('endDate')
            .skip(skip)
            .limit(limit)
            .exec(callback);

    },
    getCouponInfo: function(coupon_id, callback){
        this.findById(coupon_id, '-enabled -creator -updateAt', callback)
    },
    edit: function(info, callback){
        var id = info._id;
        delete info["_id"];
        this.findByIdAndUpdate(id, info, callback);
    },
    pickCoupon: function(coupon_id, callback){
        this.update({_id: coupon_id},{ $inc: {amount: -1} }, callback);
    },
    deleteCoupon: function(coupon_id, callback){
        this.findByIdAndRemove(coupon_id, callback);
    }
};

mongoose.model('Coupon', couponSchema);