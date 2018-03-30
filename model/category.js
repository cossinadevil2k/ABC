'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var utils = require('./helper/utils');
var async = require('async');

var propertiesSelect = 'name icon metadata type parent';
const debug = require('debug')('cate:debug');

var CategorySchema = new Schema({
	_id: { type: String, index: true },
	name: { type: String, trim: true },
	icon: { type: String, required: true },
	metadata: { type: String, index: true },
	type: { type: Number, required: true, index: true },
	account: { type: String, ref: 'Account', require: true, index: true },
	parent: { type: String, ref: 'Category', index: true },
	isDelete: { type: Boolean, default: false, index: true },
	updateAt: { type: Date, default: Date.now, index: true },
	createdAt: { type: Date, default: Date.now, index: true },
	lastEditBy: { type: Schema.Types.ObjectId, ref: 'User' },
	tokenDevice: { type: String }
});

CategorySchema.index({ isDelete: 1, account: 1, parent: 1 });
CategorySchema.index({ account: 1, tokenDevice: 1, updateAt: 1, parent: 1 });
CategorySchema.index({ metadata: 1, type: 1 });

CategorySchema.pre('save', function (next) {
	this.updateAt = new Date();
	next();
});

CategorySchema.statics.getCategoryListByAccountId = function (account_id, type, includeSub, callback) {
	if (!account_id) return callback([]);

	var condition = [{
		'isDelete': false
	}];

	if (account_id instanceof Array) {
		condition.push({
			'account': { $in: account_id }
		});
	} else {
		condition.push({
			'account': account_id
		});
	}

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
	}).exec(function (err, data) {
		if (err || !data) callback([]); else callback(includeSub ? filterCategoryDeleted(data) : data);
	});
};

function filterCategoryDeleted(categories) {
	let allParent = categories.filter(category => !category.parent);
	let allParentId = allParent.map(category => category._id);

	let allSub = categories.filter(category => {
		return category.parent !== null && allParentId.indexOf(category.parent) !== -1;
	});

	return allParent.concat(allSub);
}

CategorySchema.statics.checkDuplicateName = function (account_id, cate_name, cate_id, callback) {
	if (!cate_name || !account_id) return callback(false);
	cate_name = cate_name.trim();
	this.findOne({
		account: account_id,
		name: cate_name
	}, '_id', function (err, category) {
		if (err || !category) callback(false); else if (cate_id === category._id) callback(false); else callback(true);
	});
};

var TYPE_INCOME = 1;
var TYPE_EXPENSE = 2;

var defaultCategory = [{
	name: 'Others',
	type: TYPE_INCOME,
	icon: 'ic_category_other_income',
	metadata: 'IS_OTHER_INCOME'
}, {
	name: 'Debt',
	type: TYPE_INCOME,
	icon: 'ic_category_debt',
	metadata: 'IS_DEBT'
}, {
	name: 'Gifts',
	type: TYPE_INCOME,
	icon: 'ic_category_give',
	metadata: 'IS_GIVE'
}, {
	name: 'Selling',
	type: TYPE_INCOME,
	icon: 'ic_category_selling',
	metadata: 'selling0'
}, {
	name: 'Interest Money',
	type: TYPE_INCOME,
	icon: 'ic_category_interestmoney',
	metadata: 'interestmoney0'
}, {
	name: 'Salary',
	type: TYPE_INCOME,
	icon: 'ic_category_salary',
	metadata: 'salary0'
}, {
	name: 'Others',
	type: TYPE_EXPENSE,
	icon: 'ic_category_other_expense',
	metadata: 'IS_OTHER_EXPENSE'
}, {
	name: 'Fees & Charges',
	type: TYPE_EXPENSE,
	icon: 'ic_category_other_expense',
	metadata: 'fees_charges0'
}, {
	name: 'Award',
	type: TYPE_INCOME,
	icon: 'ic_category_award',
	metadata: 'award0'
}, {
	name: 'Insurances',
	type: TYPE_EXPENSE,
	icon: 'ic_category_other_expense',
	metadata: 'insurance0'
}, {
	name: 'Loan',
	type: TYPE_EXPENSE,
	icon: 'ic_category_loan',
	metadata: 'IS_LOAN'
}, {
	name: 'Family',
	type: TYPE_EXPENSE,
	icon: 'ic_category_family',
	metadata: 'family0'
}, {
	name: 'Education',
	type: TYPE_EXPENSE,
	icon: 'ic_category_education',
	metadata: 'education0'
}, {
	name: 'Investment',
	type: TYPE_EXPENSE,
	icon: 'ic_category_invest',
	metadata: 'invest0'
}, {
	name: 'Travel',
	type: TYPE_EXPENSE,
	icon: 'ic_category_travel',
	metadata: 'travel0'
}, {
	name: 'Health & Fitness',
	type: TYPE_EXPENSE,
	icon: 'ic_category_medical',
	metadata: 'medical0'
}, {
	name: 'Gifts & Donations',
	type: TYPE_EXPENSE,
	icon: 'ic_category_give',
	metadata: 'gifts_donations0'
}, {
	name: 'Shopping',
	type: TYPE_EXPENSE,
	icon: 'ic_category_shopping',
	metadata: 'shopping0'
}, {
	name: 'Friends & Lover',
	type: TYPE_EXPENSE,
	icon: 'ic_category_friendnlover',
	metadata: 'friendnlover0'
}, {
	name: 'Entertainment',
	type: TYPE_EXPENSE,
	icon: 'ic_category_entertainment',
	metadata: 'entertainment0'
}, {
	name: 'Bills & Utilities',
	type: TYPE_EXPENSE,
	icon: 'icon_135',
	metadata: 'utilities0'
}, {
	name: 'Transportation',
	type: TYPE_EXPENSE,
	icon: 'ic_category_transport',
	metadata: 'transport0'
}, {
	name: 'Food & Beverage',
	type: TYPE_EXPENSE,
	icon: 'ic_category_foodndrink',
	metadata: 'foodndrink0'
}
	// , {
	// 	name: 'Transfer',
	// 	type: TYPE_INCOME,
	// 	icon: 'icon_143',
	// 	metadata: 'incoming_transfer0'
	// }, {
	// 	name: 'Transfer',
	// 	type: TYPE_EXPENSE,
	// 	icon: 'icon_142',
	// 	metadata: 'outgoing_transfer0'
	// }
];

var linkedDefault = [{
	"name": "Food & Beverage",
	"icon": "ic_category_foodndrink",
	"type": TYPE_EXPENSE,
	"metadata": "foodndrink0",
	"subcategories": [{
		"name": "Restaurants",
		"icon": "icon_133",
		"type": TYPE_EXPENSE,
		"metadata": "restaurants0"
	}, {
		"name": "Café",
		"icon": "icon_15",
		"type": TYPE_EXPENSE,
		"metadata": "cafe0"
	}]
}, {
	"name": "Bills & Utilities",
	"icon": "icon_135",
	"type": TYPE_EXPENSE,
	"metadata": "utilities0",
	"subcategories": [{
		"name": "Phone",
		"icon": "icon_134",
		"type": TYPE_EXPENSE,
		"metadata": "phone0"
	}, {
		"name": "Water",
		"icon": "icon_124",
		"type": TYPE_EXPENSE,
		"metadata": "water0"
	}, {
		"name": "Electricity",
		"icon": "icon_125",
		"type": TYPE_EXPENSE,
		"metadata": "electricity0"
	}, {
		"name": "Gas",
		"icon": "icon_139",
		"type": TYPE_EXPENSE,
		"metadata": "gas0"
	}, {
		"name": "Television",
		"icon": "icon_84",
		"type": TYPE_EXPENSE,
		"metadata": "television0"
	}, {
		"name": "Internet",
		"icon": "icon_126",
		"type": TYPE_EXPENSE,
		"metadata": "internet0"
	}, {
		"name": "Rentals",
		"icon": "icon_136",
		"type": TYPE_EXPENSE,
		"metadata": "rentals0"
	}]
}, {
	"name": "Transportation",
	"icon": "ic_category_transport",
	"type": TYPE_EXPENSE,
	"metadata": "transport0",
	"subcategories": [{
		"name": "Taxi",
		"icon": "icon_127",
		"type": TYPE_EXPENSE,
		"metadata": "taxi0"
	}, {
		"name": "Parking Fees",
		"icon": "icon_128",
		"type": TYPE_EXPENSE,
		"metadata": "parking0"
	}, {
		"name": "Petrol",
		"icon": "icon_129",
		"type": TYPE_EXPENSE,
		"metadata": "petrol0"
	}, {
		"name": "Maintenance",
		"icon": "icon_130",
		"type": TYPE_EXPENSE,
		"metadata": "maintenance0"
	}]
}, {
	"name": "Shopping",
	"icon": "ic_category_shopping",
	"type": TYPE_EXPENSE,
	"metadata": "shopping0",
	"subcategories": [{
		"name": "Clothing",
		"icon": "icon_17",
		"type": TYPE_EXPENSE,
		"metadata": "clothing0"
	}, {
		"name": "Footwear",
		"icon": "icon_131",
		"type": TYPE_EXPENSE,
		"metadata": "footwear0"
	}, {
		"name": "Accessories",
		"icon": "icon_63",
		"type": TYPE_EXPENSE,
		"metadata": "accessories0"
	}, {
		"name": "Electronics",
		"icon": "icon_9",
		"type": TYPE_EXPENSE,
		"metadata": "electronics0"
	}]
}, {
	"name": "cate_friend",
	"icon": "ic_category_friendnlover",
	"type": TYPE_EXPENSE,
	"metadata": "friendnlover0"
}, {
	"name": "Friends & Lover",
	"icon": "ic_category_entertainment",
	"type": TYPE_EXPENSE,
	"metadata": "entertainment0",
	"subcategories": [{
		"name": "Movies",
		"icon": "icon_6",
		"type": TYPE_EXPENSE,
		"metadata": "movies0"
	}, {
		"name": "Games",
		"icon": "icon_33",
		"type": TYPE_EXPENSE,
		"metadata": "games0"
	}]
}, {
	"name": "Travel",
	"icon": "ic_category_travel",
	"type": TYPE_EXPENSE,
	"metadata": "travel0"
}, {
	"name": "Health & Fitness",
	"icon": "ic_category_medical",
	"type": TYPE_EXPENSE,
	"metadata": "medical0",
	"subcategories": [{
		"name": "Sports",
		"icon": "icon_70",
		"type": TYPE_EXPENSE,
		"metadata": "sports0"
	}, {
		"name": "Doctor",
		"icon": "ic_category_doctor",
		"type": TYPE_EXPENSE,
		"metadata": "doctor0"
	}, {
		"name": "Pharmacy",
		"icon": "ic_category_pharmacy",
		"type": TYPE_EXPENSE,
		"metadata": "pharmacy0"
	}, {
		"name": "Personal Care",
		"icon": "icon_132",
		"type": TYPE_EXPENSE,
		"metadata": "personal_care0"
	}]
}, {
	"name": "Gifts & Donations",
	"icon": "ic_category_donations",
	"type": TYPE_EXPENSE,
	"metadata": "gifts_donations0",
	"subcategories": [{
		"name": "Marriage",
		"icon": "icon_10",
		"type": TYPE_EXPENSE,
		"metadata": "marriage0"
	}, {
		"name": "Funeral",
		"icon": "icon_11",
		"type": TYPE_EXPENSE,
		"metadata": "funeral0"
	}, {
		"name": "Charity",
		"icon": "ic_category_give",
		"type": TYPE_EXPENSE,
		"metadata": "charity0"
	}]
}, {
	"name": "Family",
	"icon": "ic_category_family",
	"type": TYPE_EXPENSE,
	"metadata": "family0",
	"subcategories": [{
		"name": "Children & Babies",
		"icon": "icon_38",
		"type": TYPE_EXPENSE,
		"metadata": "children0"
	}, {
		"name": "Home Improvement",
		"icon": "icon_8",
		"type": TYPE_EXPENSE,
		"metadata": "home_improvement0"
	}, {
		"name": "Home Services",
		"icon": "icon_54",
		"type": TYPE_EXPENSE,
		"metadata": "home_services0"
	}, {
		"name": "Pets",
		"icon": "icon_53",
		"type": TYPE_EXPENSE,
		"metadata": "pets0"
	}]
}, {
	"name": "Education",
	"icon": "ic_category_education",
	"type": TYPE_EXPENSE,
	"metadata": "education0",
	"subcategories": [{
		"name": "Books",
		"icon": "icon_35",
		"type": TYPE_EXPENSE,
		"metadata": "books0"
	}]
}, {
	"name": "Investment",
	"icon": "ic_category_invest",
	"type": TYPE_EXPENSE,
	"metadata": "invest0"
}, {
	"name": "Business",
	"icon": "icon_59",
	"type": TYPE_EXPENSE,
	"metadata": "business0"
}, {
	"name": "Insurances",
	"icon": "icon_137",
	"type": TYPE_EXPENSE,
	"metadata": "insurance0"
}, {
	"name": "Loan",
	"icon": "ic_category_loan",
	"type": TYPE_EXPENSE,
	"metadata": "IS_LOAN"
}, {
	"name": "Fees & Charges",
	"icon": "icon_138",
	"type": TYPE_EXPENSE,
	"metadata": "fees_charges0"
}, {
	"name": "Withdrawal",
	"icon": "icon_withdrawal",
	"type": TYPE_EXPENSE,
	"metadata": "IS_WITHDRAWAL"
}, {
	"name": "Repayment",
	"icon": "icon_141",
	"type": TYPE_EXPENSE,
	"metadata": "IS_REPAYMENT"
}, {
	"name": "Others",
	"icon": "ic_category_other_expense",
	"type": TYPE_EXPENSE,
	"metadata": "IS_OTHER_EXPENSE"
}, {
	"name": "Award",
	"icon": "ic_category_award",
	"type": TYPE_INCOME,
	"metadata": "award0"
}, {
	"name": "Interest Money",
	"icon": "ic_category_interestmoney",
	"type": TYPE_INCOME,
	"metadata": "interestmoney0"
}, {
	"name": "Salary",
	"icon": "ic_category_salary",
	"type": TYPE_INCOME,
	"metadata": "salary0"
}, {
	"name": "Debt",
	"icon": "ic_category_debt",
	"type": TYPE_INCOME,
	"metadata": "IS_DEBT"
}, {
	"name": "Gifts",
	"icon": "ic_category_give",
	"type": TYPE_INCOME,
	"metadata": "IS_GIVE"
}, {
	"name": "Selling",
	"icon": "ic_category_selling",
	"type": TYPE_INCOME,
	"metadata": "selling0"
}, {
	"name": "Debt Collection",
	"icon": "icon_140",
	"type": TYPE_INCOME,
	"metadata": "IS_DEBT_COLLECTION"
}, {
	"name": "Others",
	"icon": "ic_category_other_income",
	"type": TYPE_INCOME,
	"metadata": "IS_OTHER_INCOME"
}, {
	name: 'Incoming Transfer',
	type: TYPE_INCOME,
	icon: 'icon_143',
	metadata: 'incoming_transfer0'
}, {
	name: 'Outgoing Transfer',
	type: TYPE_EXPENSE,
	icon: 'icon_142',
	metadata: 'outgoing_transfer0'
}];

CategorySchema.statics.generateDefaultCategory = function (account_id, callback) {
	var Category = this;

	async.eachSeries(defaultCategory, function (item, cb) {
		var cate = new Category(item);
		cate.account = account_id;
		cate._id = utils.generateUUID();

		cate.save(function (err) {
			cb(err);
		});
	}, function (error) {
		callback(error);
	});
};

function createCategory(Category, account, cateInfo, callback) {
	cateInfo.account = account;
	cateInfo._id = utils.generateUUID();
	let subcates = cateInfo.subcategories;

	if (subcates) delete cateInfo.subcategories;
	var category = new Category(cateInfo);

	category.save(function (err, cate) {
		if (err) {
			callback(err);
		} else {
			if (subcates) {
				var cateLength = subcates.length;

				var updateState = function () {
					cateLength--;

					if (cateLength === 0) {
						callback(null);
					}
				};

				subcates.forEach(function (cateInfo) {
					cateInfo.parent = cate._id;

					createCategory(Category, account, cateInfo, updateState);
				});
			} else {
				callback(null);
			}
		}
	});
}

CategorySchema.statics.linkedDefaultCategory = function (account_id, callback) {
	var Category = this;

	async.eachSeries(linkedDefault, function (item, cb) {
		createCategory(Category, account_id, item, cb);
	}, function (error) {
		callback(error);
	});
};

CategorySchema.statics.checkSubCategoryOkie = function (account_id, cate_id, callback) {
	this.findOne({
		_id: cate_id,
		account: account_id,
		parent: null
	}).select('_id').exec(function (err, category) {
		if (err || !category) callback(true); else callback(false);
	});
};

CategorySchema.statics.deleteCategory = function (user_id, cate_id, isParent, callback) {
	if (!cate_id) return callback(false);
	var that = this;
	var TransactionSchema = mongoose.model('Transaction');
	var BudgetSchema = mongoose.model('Budget');

	that.findByIdAndUpdate(cate_id, {
		$set: {
			isDelete: true,
			lastEditBy: user_id
		}
	}, function (err, cate) {
		if (err) {
			console.error(err);
			callback(false);
		} else {
			TransactionSchema.deleteByCategoryId(user_id, cate_id, function (status) {
				if (status) {
					BudgetSchema.deleteByCategoryId(user_id, cate_id, function (status) {
						if (status) {
							if (isParent) {
								that.getChildCateByCategoryId(cate_id, function (categories) {
									var num = categories.length;
									if (num === 0) return callback(true);

									var handler = function (status) {
										num--;
										if (num === 0) callback(true);
									};

									categories.forEach(function (category) {
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

CategorySchema.statics.deleteByAccountId = function (user_id, account_id, callback) {
	this.update({
		account: account_id,
		isDelete: false
	}, {
			isDelete: true,
			lastEditBy: user_id
		}, {
			multi: true
		}, function (err) {
			if (err) console.error(err);
			callback(!err);
		});
};

CategorySchema.statics.getChildCateByCategoryId = function (cate_id, callback) {
	this.find({
		category: cate_id,
		isDelete: false
	}, propertiesSelect, function (err, categories) {
		if (err) callback([]); else callback(data);
	});
};

CategorySchema.statics.addNewCategory = function (categoryInfo, callback) {
	// let that = this;
	var category = new this();
	
	category._id = categoryInfo._id;
	category.name = categoryInfo.name;
	category.icon = categoryInfo.icon;
	category.type = categoryInfo.type;
	category.account = categoryInfo.account;
	if (categoryInfo.parent) category.parent = categoryInfo.parent;
	if (categoryInfo.metadata) category.metadata = categoryInfo.metadata;

	category.save(function (err, result) {
		callback();
	});
};

CategorySchema.statics.editCategory = function (categoryInfo, callback) {
	this.findByIdAndUpdate(categoryInfo._id, {
		icon: categoryInfo.icon,
		name: categoryInfo.name,
		parent: categoryInfo.parent
	}, function (err, numUpdate) {
		callback(!err);
	});
};

mongoose.model('Category', CategorySchema);