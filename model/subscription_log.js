
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var moment = require('moment');

var log = new Schema({
    payer: {type: String, trim: true, ref:'User', index: true, required: true},
    receiver: {type: String, trim: true, ref: 'User', index: true, required: true},
    purchaseDate: {type: Date, default: Date.now, index: true},
    product: {type: String, trim: true, required: true},
    market: {type: String},
    platform: {type: String, enum:["android","ios","windowsphone","windows","mac","web","linux"], required: true, index: true},
    type: {type: Number, index: true}
});

log.statics = {
    newLog: function(info, callback){
        var purchaseLog = new this({
            payer: info.payer,
            receiver: info.receiver,
            product: info.product,
            market: info.market,
            platform: info.os
        });
        if (info.type) purchaseLog.type = info.type;

        purchaseLog.save(function(err, result){
            if (err) callback(err);
            else if (!result) callback(true);
            else callback(null);
        });
    },

    getAll: function(skip, limit, callback){
        this.find()
            .sort('-purchaseDate')
            .skip(skip)
            .limit(limit)
            .populate('payer','email')
            .populate('receiver','email')
            .exec(callback)
    },

    getByPayer: function(userId, skip, limit, callback){
        this.find({payer: userId})
            .sort('-purchaseDate')
            .skip(skip)
            .limit(limit)
            .populate('payer','email')
            .populate('receiver','email')
            .exec(callback);
    },

    getByProduct: function(productId, skip, limit, callback){
        this.find({product: productId})
            .sort('-purchaseDate')
            .skip(skip)
            .limit(limit)
            .populate('payer','email')
            .populate('receiver','email')
            .exec(callback);
    },

    getByPlatform: function(platform, skip, limit, callback){
        this.find({platform: platform})
            .sort('-purchaseDate')
            .skip(skip)
            .limit(limit)
            .populate('payer','email')
            .populate('receiver','email')
            .exec(callback);
    },

    getByCurrency: function(currency, skip, limit, callback){
        this.find({currency: currency})
            .sort('-purchaseDate')
            .skip(skip)
            .limit(limit)
            .populate('payer','email')
            .populate('receiver','email')
            .exec(callback);
    }
};

mongoose.model('SubscriptionLog', log);