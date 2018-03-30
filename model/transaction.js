/**
 * Module dependencies.
 */
'use strict';

let mongoose 	= require('mongoose');
let Category 	= mongoose.model('Category');
let Schema 		= mongoose.Schema;
let ObjectId 	= Schema.Types.ObjectId;
let utils       = require('./helper/utils');
let async		= require('async');
let Campaign	= mongoose.model('Campaign');
// let categoryChangelog = require('../helper/category-changelog');

let selected_properties = 'note account category amount displayDate campaign with exclude_report images original_currency';

let dataSchema = {
	_id: {type: String, index: true},
	note: {type: String, trim: true}, // Message
	account: { type: String, required: true, ref: 'Account', index: true },
	category: { type: String, required: true, ref: 'Category', index: true },
	amount: { type: Number, required: true}, // So tien
	displayDate: { type: Date, required: true, index: true }, // Ngay thuc hien giao dich
	dueDate: Date, // Ngay tra no, thong bao thanh toan ...
	remind: {type: Number},
	address: {type: String, trim: true}, // Dia diem
	longtitude: {type: Number}, // Location X
	latitude: {type: Number}, //  Location Y
	with: {type: [{type: String}]}, // An cung ai. (VD: Vay no)
	campaign: {type: [{type: String, ref: 'Campaign'}]}, // Chien dich tiet kiem, Picnic chi...
	parent: { type: String, ref: 'Transaction', index: true }, //
	isDelete: { type: Boolean, default: false, index: true },
	updateAt: { type: Date, default: Date.now, index: true },
	createdAt: { type: Date, default: Date.now, index: true},
	owner: {type: ObjectId, ref: 'User', index: true},
	lastEditBy: { type: ObjectId, ref: 'User'},
	tokenDevice: {type: String},
	isPublic: {type: Boolean, default: false},
	permalink: {type: String, trim: true},
	exclude_report: {type: Boolean, default: false},
	images: {type: [{type: String}]},
	original_currency: {type: String},
	mark_report: {type: Boolean, default: false},
	metadata: {type: Schema.Types.Mixed},
	related: {type: String}
};

let TransactionSchema = new Schema(dataSchema);
TransactionSchema.index({account: 1, tokenDevice: 1, updateAt: 1, parent: 1});
TransactionSchema.index({isDelete: 1, account: 1, parent: 1});

TransactionSchema.path('category').set(function(v){
	//store old category if it is modified
	this._category = this.category;
	return v;
});

TransactionSchema.pre('save', function(next){
	// if (this.isModified('category')) {
	// 	if (!this.isNew) {
	// 		categoryChangelog.checkCategoryModified(this);
	// 	}
	// }
	
	this.updateAt = new Date();
	next();
});

/**
 * FUNCTIONS
 */

let createTransaction = function(data, user_id, callback){
	let transaction = new this(data);
	transaction._id = utils.generateUUID();
	transaction.lastEditBy = user_id;
	transaction.save(function(err, data){
		callback(!err);
	});
};

let editTransaction = function(data, transaction_id, user_id, callback){
	this.findById(transaction_id, function(err, transaction){
		if(err || !transaction) callback(false);

		transaction.set(data);
		transaction.lastEditBy = user_id;
		transaction.save(function(err2, data){
			callback(!err2);
		});
	});
};

let deleteTransaction = function(transaction_id, user_id, callback) {
	let that = this;
	that.findById(transaction_id, function(err, transaction){
		if(err || !transaction) return callback(false);

		transaction.isDelete = true;
		transaction.lastEditBy = user_id;
		transaction.tokenDevice = 'web';
		transaction.save(function(err){
			that.deleteAllSubTransactionByParentTransactionId(transaction_id, user_id, function(status){
				callback(true);
			});
		});
	});
};

let deleteAllSubTransactionByParentTransactionId = function(transaction_id, user_id, callback){
	this.update({parent: transaction_id, isDelete: false},
		{isDelete: true, lastEditBy: user_id},
		{multi: true}, function(err){
			if(err) console.error(err);
			callback(!err);
		});
};

let getTransactionByDateRange = function(account_id, start_date, end_date, callback){
	let whereCondition = {isDelete: false};

	if(account_id instanceof Array){
		whereCondition.account = {$in: account_id};
	} else{
		whereCondition.account = account_id;
	}


	let dateCondition = {};
	if(null !== start_date) dateCondition.$gte = start_date;
	if(null !== end_date) dateCondition.$lte = end_date;

	if(null !== start_date || null !== end_date) {
		whereCondition.displayDate = dateCondition;
	}

	this.find(whereCondition)
		.populate('category', 'name icon type _id')
		.populate('campaign')
		.populate('account', 'currency_id name metadata account_type icon')
		.select(selected_properties).sort('-displayDate category.type').exec(callback);
};

let getStatsByAccountId = function(account_id, start_date, end_date, type, callback){
	let that = this;
	Category.getCategoryListByAccountId(account_id, type, true, function(categories){
		if(!categories) return callback(false);

		that.aggregate(
			{ $match : {$and: [{isDelete: false, account: mongoose.Types.ObjectId(account_id), category: {$in: categories}}]}},
			{ $group: { _id: 1 ,total: { $sum: '$amount'}}}, // 'group' goes first!
			{ $project: { _id: 1, total: 1 }}, // you can only project fields from 'group'
			callback
		);
	});
};

let deleteByCategoryId = function(user_id, cate_id, callback) {
	this.update({category: cate_id, isDelete: false},
		{isDelete: true, lastEditBy: user_id},
		{multi: true}, function(err){
			if(err) console.error(err);
			callback(!err);
		});
};

let deleteByAccountId = function(user_id, account_id, callback) {
	this.update({account: account_id, isDelete: false},
		{isDelete: true, lastEditBy: user_id},
		{multi: true}, function(err){
			if(err) console.error(err);
			callback(!err);
		});
};

let findTransactionByCampaign = function(campaignId, callback){
	//campaign là String hoac Array[String]
	let query = {isDelete: false};
	let that = this;

	async.waterfall([
		//get account info
		function(cb){
			Campaign.findById(campaignId)
				.populate('account')
				.exec(function(err, campaign){
					if(err) cb(err);
					else {
						if (!campaign || campaign == {}) cb("Event not found");
						else cb(null);
					}
				});
		},
		function(cb){
			query.campaign = campaignId;
			that.find(query)
				.populate('account category campaign')
				.exec(cb);
		}
	], function(err, result){
		if(err) callback(err);
		else callback(null, result)
	});
};

/**
 * EXPORTS
 */

TransactionSchema.statics.createTransaction = createTransaction;
TransactionSchema.statics.editTransaction = editTransaction;
TransactionSchema.statics.deleteTransaction = deleteTransaction;
TransactionSchema.statics.deleteAllSubTransactionByParentTransactionId = deleteAllSubTransactionByParentTransactionId;
TransactionSchema.statics.getTransactionByDateRange = getTransactionByDateRange;
TransactionSchema.statics.getStatsByAccountId = getStatsByAccountId;
TransactionSchema.statics.deleteByCategoryId = deleteByCategoryId;
TransactionSchema.statics.deleteByAccountId = deleteByAccountId;
TransactionSchema.statics.findTransactionByCampaign = findTransactionByCampaign;

mongoose.model('Transaction', TransactionSchema);
