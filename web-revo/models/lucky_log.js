var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var luckyLog = new Schema({
    user: {type: String, required: true, ref: 'User', index: true},
    product: {type: String, required: true, ref:'Lucky', index: true},
    updateAt: {type: Date, default: Date.now, index: true}
});

mongoose.statics = {
    getAll: function(skip, limit, callback){
        this.find()
            .sort('-updateAt')
            .skip(skip)
            .limit(limit)
            .exec(callback);
    },

    getByUserId: function(userId, skip, limit, callback){
        var query = {user: userId};
        this.find(query)
            .sort('-updateAt')
            .skip(skip)
            .limit(limit)
            .exec(callback);
    },

    getByProductId: function(productId, skip, limit, callback){
        var query = {product: productId};
        this.find(query)
            .sort('-updateAt')
            .skip(skip)
            .limit(limit)
            .exec(callback);
    },

    getByUserAndProduct: function(userId, productId, skip, limit, callback){
        var query = {user: userId, product: productId};
        this.find(query)
            .sort('-updateAt')
            .skip(skip)
            .limit(limit)
            .exec(callback);
    },

    createNew: function(user, product, callback){
        var newItem = new this({
            user: user,
            product: product
        });

        newItem.save(callback);
    },

    clearAll: function(callback){
        this.remove(callback);
    }
};

mongoose.model('LuckyLog', luckyLog);