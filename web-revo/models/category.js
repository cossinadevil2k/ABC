/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var utils = require('../helper/utils');
var async = require('async');

var propertiesSelect = 'name icon metadata type parent';


/*
 * Client Key Schema
 */
var CategorySchema = new Schema({
	_id: {type: String, index: true},
	name: { type: String, trim: true},
	icon: { type: String, required: true },
	metadata: { type: String},
	type: { type: Number, required: true, index: true },
	account: { type: String, ref: 'Account', require: true, index: true },
	parent: { type: String, ref: 'Category', index: true },
	isDelete: { type: Boolean, default: false, index: true },
	updateAt: { type: Date, default: Date.now, index: true },
	createdAt: { type: Date, default: Date.now, index: true },
	lastEditBy: { type: Schema.Types.ObjectId, ref: 'User' },
	tokenDevice: { type: String }
});

CategorySchema.index({isDelete: 1, account: 1, parent: 1});
CategorySchema.index({account: 1, tokenDevice: 1, updateAt: 1, parent: 1});

CategorySchema.pre('save', function(next) {
	this.updateAt = new Date();
	next();
});

CategorySchema.statics.getCategoryListByAccountId = function(account_id, type, includeSub, callback) {
	if (!account_id) return callback([]);

	var condition = [{
		'isDelete': false
	}, {
		'account': account_id
	}];
	if (!includeSub) condition.push({
		'parent': null
	});

	if (type > 0) condition.push({
		'type': type
	});

	this.find({
		$and: condition
	}).select(propertiesSelect).sort({
		'type': 1,
		'name': 1
	}).exec(function(err, data) {
		if (err || !data) callback([]);
		else callback(data);
	});
};
// true: dupe name
CategorySchema.statics.checkDuplicateName = function(account_id, cate_name, cate_id, callback) {
	if (!cate_name || !account_id) return callback(false);
	cate_name = cate_name.trim();
	this.findOne({
		account: account_id,
		name: cate_name
	}, '_id', function(err, category) {
		if (err || !category) callback(false);
		else if (cate_id === category._id) callback(false);
		else callback(true);
	});
};


var TYPE_INCOME = 1;
var TYPE_EXPENSE = 2;

var defaultCategory = [
	{
		name: 'Others',
		type: TYPE_INCOME,
		icon: 'ic_category_other_income',
		metadata: 'IS_OTHER_INCOME'
	},
	{
		name: 'Debt',
		type: TYPE_INCOME,
		icon: 'ic_category_debt',
		metadata: 'IS_DEBT'
	},
	{
		name: 'Gifts',
		type: TYPE_INCOME,
		icon: 'ic_category_give',
		metadata: 'IS_GIVE'
	},
	{
		name: 'Selling',
		type: TYPE_INCOME,
		icon: 'ic_category_selling',
		metadata: 'selling0'
	},
	{
		name: 'Interest Money',
		type: TYPE_INCOME,
		icon: 'ic_category_interestmoney',
		metadata: 'interestmoney0'
	},
	{
		name: 'Salary',
		type: TYPE_INCOME,
		icon: 'ic_category_salary',
		metadata: 'salary0'
	},
	{
		name: 'Others',
		type: TYPE_EXPENSE,
		icon: 'ic_category_other_expense',
		metadata: 'IS_OTHER_EXPENSE'
	},
	{
		name: 'Fees & Charges',
		type: TYPE_EXPENSE,
		icon: 'ic_category_other_expense',
		metadata: 'fees_charges0'
	},
	{
		name: 'Award',
		type: TYPE_INCOME,
		icon: 'ic_category_award',
		metadata: 'award0'
	},
	{
		name: 'Insurances',
		type: TYPE_EXPENSE,
		icon: 'ic_category_other_expense',
		metadata: 'insurance0'
	},
	{
		name: 'Loan',
		type: TYPE_EXPENSE,
		icon: 'ic_category_loan',
		metadata: 'IS_LOAN'
	},
	{
		name: 'Family',
		type: TYPE_EXPENSE,
		icon: 'ic_category_family',
		metadata: 'family0'
	},
	{
		name: 'Education',
		type: TYPE_EXPENSE,
		icon: 'ic_category_education',
		metadata: 'education0'
	},
	{
		name: 'Investment',
		type: TYPE_EXPENSE,
		icon: 'ic_category_invest',
		metadata: 'invest0'
	},
	{
		name: 'Travel',
		type: TYPE_EXPENSE,
		icon: 'ic_category_travel',
		metadata: 'travel0'
	},
	{
		name: 'Health & Fitness',
		type: TYPE_EXPENSE,
		icon: 'ic_category_medical',
		metadata: 'medical0'
	},
	{
		name: 'Gifts & Donations',
		type: TYPE_EXPENSE,
		icon: 'ic_category_give',
		metadata: 'gifts_donations0'
	},
	{
		name: 'Shopping',
		type: TYPE_EXPENSE,
		icon: 'ic_category_shopping',
		metadata: 'shopping0'
	},
	{
		name: 'Friends & Lover',
		type: TYPE_EXPENSE,
		icon: 'ic_category_friendnlover',
		metadata: 'friendnlover0'
	},
	{
		name: 'Entertainment',
		type: TYPE_EXPENSE,
		icon: 'ic_category_entertainment',
		metadata: 'entertainment0'
	},
	{
		name: 'Bills & Utilities',
		type: TYPE_EXPENSE,
		icon: 'icon_135',
		metadata: 'utilities0'
	},
	{
		name: 'Transportation',
		type: TYPE_EXPENSE,
		icon: 'ic_category_transport',
		metadata: 'transport0'
	},
	{
		name: 'Food & Beverage',
		type: TYPE_EXPENSE,
		icon: 'ic_category_foodndrink',
		metadata: 'foodndrink0'
	}
];

CategorySchema.statics.generateDefaultCategory = function(account_id, callback) {
	var Category = this;

	async.eachSeries(defaultCategory, function(item, cb){
		var cate = new Category(item);
		cate.account = account_id;
		cate._id = utils.generateUUID();

		cate.save(function(err){
			cb(err);
		});
	}, function(error){
		callback(error);
	});
};


CategorySchema.statics.checkSubCategoryOkie = function(account_id, cate_id, callback) {
	this.findOne({
		_id: cate_id,
		account: account_id,
		parent: null
	}).select('_id')
		.exec(function(err, category) {
			if (err || !category) callback(true);
			else callback(false);
		});
};

CategorySchema.statics.deleteCategory = function(user_id, cate_id, isParent, callback) {
	if (!cate_id) return callback(false);
	var that = this;
	var TransactionSchema = mongoose.model('Transaction');
	var BudgetSchema = mongoose.model('Budget');

	that.findByIdAndUpdate(cate_id, {
		$set: {
			isDelete: true,
			lastEditBy: user_id
		}
	}, function(err, cate) {
		if (err) {
			console.error(err);
			callback(false);
		} else {
			TransactionSchema.deleteByCategoryId(user_id, cate_id, function(status) {
				if (status) {
					BudgetSchema.deleteByCategoryId(user_id, cate_id, function(status) {
						if (status) {
							if (isParent) {
								that.getChildCateByCategoryId(cate_id, function(categories) {
									var num = categories.length;
									if (num === 0) return callback(true);

									var handler = function(status) {
										num--;
										if (num === 0) callback(true);
									};

									categories.forEach(function(category) {
										that.deleteCategory(user_id, category._id, false, handler);
									});
								});
							} else callback(true);
						} else callback(false);
					});
				} else callback(false);
			});
		}
	});
};

CategorySchema.statics.deleteByAccountId = function(user_id, account_id, callback) {
	this.update({
		account: account_id,
		isDelete: false
	}, {
		isDelete: true,
		lastEditBy: user_id
	}, {
		multi: true
	}, function(err) {
		if (err) console.error(err);
		callback(!err);
	});
};

CategorySchema.statics.getChildCateByCategoryId = function(cate_id, callback) {
	this.find({
		category: cate_id,
		isDelete: false
	}, propertiesSelect, function(err, categories) {
		if (err) callback([]);
		else callback(data);
	});
};

CategorySchema.statics.addNewCategory = function(categoryInfo, callback) {
	var category		= new this();

	category.name		= categoryInfo.name;
	category.icon		= categoryInfo.icon;
	category.type		= categoryInfo.type;
	category.account	= categoryInfo.account;
	if(categoryInfo.parent) category.parent		= categoryInfo.parent;

	category.save(function(err){
		callback(!err);
	});
};

CategorySchema.statics.editCategory = function(categoryInfo, callback){
	this.findByIdAndUpdate(categoryInfo._id, {icon: categoryInfo.icon, name: categoryInfo.name, parent: categoryInfo.parent}, function(err, numUpdate){
		callback(!err);
	});
};

mongoose.model('Category', CategorySchema);
