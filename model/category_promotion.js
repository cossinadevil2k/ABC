/*
	Promotion model
*/

var mongoose	= require('mongoose');
var PartnerDB   = require('./helper/mongodb_connect_partner');
var Schema		= mongoose.Schema;

var CategoryPromotionSchema = new Schema({
	name: {type: String, required: true, trim: true, index: true},
	createdAt: { type: Date, default: Date.now },
	updateAt: { type: Date, default: Date.now },
	provider: {type: String, index: true, required: true}
});

var select = 'name createdAt';

var getAll = function(options, callback){
    if (!options.providerId || !options.limit) {
        return callback('ParamsInvalid');
    }

    this.find({provider: options.providerId})
        .skip(options.skip)
        .limit(options.limit)
        .select(select)
        .sort('-createdAt')
		.lean()
        .exec(callback);
};

var addCategory = function(info, callback){
    var category = new this(info);
    category.save(callback);
};

var editCategory = function(id, updates, callback){
    this.findByIdAndUpdate(id, updates, callback);
};

var deleteCategory = function(id, callback){
    this.findByIdAndRemove(id, function(err){
        callback(!err);
    });
};

CategoryPromotionSchema.statics.getAll = getAll;
CategoryPromotionSchema.statics.addCategory = addCategory;
CategoryPromotionSchema.statics.editCategory = editCategory;
CategoryPromotionSchema.statics.deleteCategory = deleteCategory;

PartnerDB.model('CategoryPromotion', CategoryPromotionSchema);
