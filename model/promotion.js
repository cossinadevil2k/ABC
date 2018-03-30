/*
	Promotion model
*/

var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var PartnerDB 	= require('./helper/mongodb_connect_partner');

var PromotionSchema = new Schema({
	title: {type: String, required: true, trim: true, index: true},
	shortDescription: {type: String, trim: true, index: true},
	views: {type: Number, default: 0},
	status: {type: String, trim: true, enum: ['Public', 'Draft']},
	category: {type: String, ref: 'CategoryPromotion'},
    content: {type: String, required: true, trim: true},
	createdAt: { type: Date, default: Date.now },
	updateAt: { type: Date, default: Date.now },
    owner: {type: String, ref: 'Partner', required: true},
	provider: {type: String, ref: 'Provider', index: true, required: true},
	expiredDate: {type: Date}
});

var select = 'title shortDescription category content createdAt owner status views expiredDate';
var selectClient = 'title shortDescription category createdAt owner expiredDate';

var getAll = function(providerId, skip, limit, callback){
    this.find({provider: providerId})
        .select(select)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
		.populate('owner', 'name email')
		.populate('category', 'name')
		.lean()
        .exec(callback);
};

var getDetailByPostId = function(postId, callback){
	this.findById(postId)
		.select('title shortDescription category createdAt content views expiredDate')
		.populate('category', 'name')
		.lean()
		.exec(callback)
};

var updateViewsPromote = function(id, updates, callback){
	this.findByIdAndUpdate(id, updates, callback);
};

var getPublicPromotion = function(options, callback){
    this.find({provider: options.providerId, status: 'Public'})
        .select(selectClient)
        .sort('-createdAt')
        .skip(options.skip)
        .limit(options.limit)
		.populate('category', 'name')
		.populate('owner', 'name')
		.lean()
        .exec(callback);
};

var addPromotion = function(info, callback){
    var promotion = new this(info);
    promotion.save(callback);
};

var editPromote = function(id, updates, callback){
    this.findByIdAndUpdate(id, updates, callback);
};

var deleteByPromotionId = function(id, callback){
    this.findByIdAndRemove(id, function(err){
        callback(!err);
    });
};

var deleteByCategoryId = function(categoryId, providerId, callback){
	this.find({provider: providerId, category: categoryId})
		.remove(callback)
};


PromotionSchema.statics.getAll = getAll;
PromotionSchema.statics.getPublicPromotion = getPublicPromotion;
PromotionSchema.statics.getDetailByPostId = getDetailByPostId;
PromotionSchema.statics.addPromotion = addPromotion;
PromotionSchema.statics.editPromote = editPromote;
PromotionSchema.statics.updateViewsPromote = updateViewsPromote;
PromotionSchema.statics.deleteByPromotionId = deleteByPromotionId;
PromotionSchema.statics.deleteByCategoryId = deleteByCategoryId;

PartnerDB.model('Promotion', PromotionSchema);
