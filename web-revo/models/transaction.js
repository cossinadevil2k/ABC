/**
 * Module dependencies.
 */
'use strict';

var mongoose = require('mongoose');
var Category = mongoose.model('Category');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var utils = require('../helper/utils');
var async = require('async');
var Campaign = mongoose.model('Campaign');

var selected_properties = 'note account category amount displayDate campaign with exclude_report images original_currency';

var dataSchema = {
	_id: {type: String, index: true},
	note: {type: String, trim: true}, // Message
	account: {type: String, require: true, ref: 'Account', index: true},
	category: {type: String, require: true, ref: 'Category', index: true},
	amount: {type: Number, required: true, index: true}, // So tien
	displayDate: {type: Date, required: true, index: true}, // Ngay thuc hien giao dich
	dueDate: Date, // Ngay tra no, thong bao thanh toan ...
	remind: {type: Number},
	address: {type: String, trim: true, index: true}, // Dia diem
	longtitude: {type: Number}, // Location X
	latitude: {type: Number}, //  Location Y
	with: {type: [{type: String}]}, // An cung ai. (VD: Vay no)
	campaign: {type: [{type: String, ref: 'Campaign'}]}, // Chien dich tiet kiem, Picnic chi...
	parent: {type: String, ref: 'Transaction', index: true}, //
	isDelete: {type: Boolean, default: false, index: true},
	updateAt: {type: Date, default: Date.now, index: true},
	createdAt: {type: Date, default: Date.now, index: true},
	owner: {type: ObjectId, ref: 'User', index: true},
	lastEditBy: {type: ObjectId, ref: 'User'},
	tokenDevice: {type: String},
	isPublic: {type: Boolean, default: false},
	permalink: {type: String, trim: true},
	exclude_report: {type: Boolean, default: false},
	images: {type: [{type: String}], index: true},
	original_currency: {type: String}
};

var TransactionSchema = new Schema(dataSchema);
TransactionSchema.index({account: 1, tokenDevice: 1, updateAt: 1, parent: 1});
TransactionSchema.index({isDelete: 1, account: 1, parent: 1});

TransactionSchema.pre('save', function (next) {
	this.updateAt = new Date();
	next();
});

/**
 * FUNCTIONS
 */

var createTransaction = function (data, user_id, callback) {
	var transaction = new this(data);
	transaction._id = utils.generateUUID();
	transaction.lastEditBy = user_id;
	transaction.save(function (err, data) {
		callback(!err);
	});
};

var editTransaction = function (data, transaction_id, user_id, callback) {
	this.findById(transaction_id, function (err, transaction) {
		if (err || !transaction) callback(false);

		transaction.set(data);
		transaction.lastEditBy = user_id;
		transaction.save(function (err2, data) {
			callback(!err2);
		});
	});
};

var deleteTransaction = function (transaction_id, user_id, callback) {
	var that = this;
	that.findById(transaction_id, function (err, transaction) {
		if (err || !transaction) return callback(false);

		transaction.isDelete = true;
		transaction.lastEditBy = user_id;
		transaction.save(function (err) {
			that.deleteAllSubTransactionByParentTransactionId(transaction_id, user_id, function (status) {
				callback(true);
			});
		});
	});
};

var deleteAllSubTransactionByParentTransactionId = function (transaction_id, user_id, callback) {
	this.update({parent: transaction_id, isDelete: false},
		{isDelete: true, lastEditBy: user_id},
		{multi: true}, function (err) {
			if (err) console.error(err);
			callback(!err);
		});
};

var getTransactionByDateRange = function (account_id, start_date, end_date, callback) {
	var whereCondition = {isDelete: false};

	if (account_id instanceof Array) {
		whereCondition.account = {$in: account_id};
	} else {
		whereCondition.account = account_id;
	}


	var dateCondition = {};
	if (null !== start_date) dateCondition.$gte = start_date;
	if (null !== end_date) dateCondition.$lte = end_date;

	if (null !== start_date || null !== end_date) {
		whereCondition.displayDate = dateCondition;
	}

	this.find(whereCondition)
		.populate('category', 'name icon type _id')
		.populate('campaign')
		.populate('account', 'currency_id name metadata')
		.select(selected_properties).sort('-displayDate category.type').exec(callback);
};

var getStatsByAccountId = function (account_id, start_date, end_date, type, callback) {
	var that = this;
	Category.getCategoryListByAccountId(account_id, type, true, function (categories) {
		if (!categories) return callback(false);

		that.aggregate(
			{
				$match: {
					$and: [{
						isDelete: false,
						account: mongoose.Types.ObjectId(account_id),
						category: {$in: categories}
					}]
				}
			},
			{$group: {_id: 1, total: {$sum: '$amount'}}}, // 'group' goes first!
			{$project: {_id: 1, total: 1}}, // you can only project fields from 'group'
			callback
		);
	});
};

var deleteByCategoryId = function (user_id, cate_id, callback) {
	this.update({category: cate_id, isDelete: false},
		{isDelete: true, lastEditBy: user_id},
		{multi: true}, function (err) {
			if (err) console.error(err);
			callback(!err);
		});
};

var deleteByAccountId = function (user_id, account_id, callback) {
	this.update({account: account_id, isDelete: false},
		{isDelete: true, lastEditBy: user_id},
		{multi: true}, function (err) {
			if (err) console.error(err);
			callback(!err);
		});
};

var findTransactionByCampaign = function (campaignId, callback) {
	//campaign là String hoac Array[String]
	var query = {isDelete: false};
	var that = this;

	async.waterfall([
		//get account info
		function (cb) {
			Campaign.findById(campaignId)
				.populate('account')
				.exec(function (err, campaign) {
					if (err) cb(err);
					else {
						if (!campaign || campaign == {}) cb("Event not found");
						else cb(null);
					}
				});
		},
		function (cb) {
			query.campaign = campaignId;
			that.find(query)
				.populate('account category campaign')
				.exec(cb);
		}
	], function (err, result) {
		if (err) callback(err);
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
