/**
 * Module dependencies.
 */

'use strict';

let mongoose = require('mongoose');
let mongoosastic = require('mongoosastic');
let Schema = mongoose.Schema;
let ObjectId = Schema.ObjectId;
let crypto = require('crypto');
let utils = require('../helper/utils');
let moment = require('moment');
let Email = require('./email');
let _ = require('underscore');
let async = require('async');
let env = process.env.NODE_ENV || 'production';
let TagConstant = require('../config/tag_constant');
let Error = require('../config/error');
let redisClient = require('../config/database').redisClient;
let sprintf = require("sprintf-js").sprintf;
let config = require('../config/config')[env];

let elasticsearch = require('elasticsearch');
let esClient = new elasticsearch.Client({
	host: config.elasticsearch.hostUrl
});

let esIndex = env + '_user';

/**
 * User Schema
 */
let UserSchema = new Schema({
	id: ObjectId,
	email: { type: String, trim: true, required: true, lowercase: true, unique: true, index: true, es_indexed: true },
	facebookId: { type: String, index: true },
	googleId: { type: String, index: true },
	hashed_password: { type: String, trim: true, required: true },
	salt: { type: String },
	//role: { type: String, trim: true, required: true, enum: ['User', 'Developer', 'Admin'], default: 'User' },
	selected_account: { type: Schema.Types.ObjectId, ref: 'Account' },
	settings: {
		setting_amount_display: {
			isShorten: { type: Boolean },
			showCurrency: { type: Boolean },
			negativeStyle: { type: Number },
			decimalVisibility: { type: Boolean },
			decimalSeparator: { type: Number }
		},
		setting_lang: { type: String },
		setting_date: {
			datetimeFormat: { type: String },
			firstDayOfMonth: { type: Number },
			firstDayOfWeek: { type: Number },
			firstMonthOfYear: { type: Number }
		},
		daily_alarm: { type: Number },
		show_add_it_later: { type: Boolean },
		on_location: { type: Boolean }
	},
	activeId: { type: Schema.Types.ObjectId, ref: 'Active' },
	purchased: { type: Boolean, default: false, index: true },
	forgotPass: {
		hash: { type: String, trim: true },
		expire: { type: Date }
	},
	//	iconResource: [{ type: String, trim: true, index: true }],
	createdDate: { type: Date, default: Date.now, index: true, es_indexed: true },
	lastLogin: { type: Date, default: Date.now },
	verifyEmail: { type: Boolean, default: false, es_index: true },
	acceptSync: { type: Boolean, default: false },
	lastSync: { type: Date, index: true, es_indexed: true },
	userSubscribe: { type: Boolean, default: true, es_indexed: true },
	limitDevice: { type: Number, default: 5 },
	skipPassword: { type: Boolean, default: false },
	icon_package: { type: [{ type: String, trim: true, lowercase: true }] },
	ipRegistered: { type: String, trim: true },
	ipLastLogin: { type: String, trim: true },
	tags: [{ type: String, trim: true, lowercase: true, es_indexed: true, index: true }],
	isDeactivated: { type: Boolean, default: false },
	sprintRemain: { type: Number, default: 0 },
	client_setting: { type: Schema.Types.Mixed },
	exportReport: {
		hash: { type: String, trim: true },
		expire: { type: Date },
		eventId: { type: String, trim: true }
	},
	expireDate: { type: Date, index: true },
	firstPurchase: { type: Date },
	lastPurchase: { type: Date, index: true },
	subscribeProduct: { type: String, trim: true, lowercase: true },
	subscribeMarket: { type: String, trim: true, lowercase: true },
	rwExpire: { type: Date, es_indexed: true, index: true },
	rwProduct: { type: String, trim: true, lowercase: true },
	rwMarket: { type: String, trim: true },
	rwFirstPurchase: { type: Date, es_indexed: true },
	rwLastPurchase: { type: Date, es_indexed: true, index: true },
	rwLimit: { type: Number, default: 10 },
	user_info: { type: Schema.Types.Mixed },
	finsify_id: { type: String, trim: true, index: true },
	phone: [{ type: String, trim: true, index: true }],
	premium_at: { type: Date, index: true, es_indexed: true },
	premiumProduct: { type: String },
	semi_premium_purchased: { type: Boolean },
	semi_premium_metadata: [{
		platform: { type: String, trim: true, lowercase: true, es_indexed: true, index: true },
		expireDate: { type: Date, index: true },
		firstPurchase: { type: Date },
		lastPurchase: { type: Date, index: true },
		product: { type: String, trim: true, lowercase: true },
		market: { type: String, trim: true, lowercase: true }
	}]
});

UserSchema.index({ createdDate: 1, lastSync: 1, tags: 1, purchased: 1, premium_at: 1, isDeactivated: 1, semi_premium_purchased: 1, semi_premium_metadata: 1, rwExpire: 1, expireDate: 1 });

UserSchema.plugin(mongoosastic, {
	index: esIndex,
	hosts: [
		config.elasticsearch.hostUrl
	]
});

const PLATFORM = {
	'android': 'android',
	'ios': 'ios',
	'windows': 'windows',
	'winphone': 'winphone'
}
/**
 * UTILITIES
 */

function handleFacebookInfo(info) {
	let obj = {};
	if (info.name) obj.name = info.name;
	if (info.first_name) obj.first_name = info.first_name;
	if (info.last_name) obj.last_name = info.last_name;
	if (info.birthday) obj.birthday = moment(info.birthday, 'MM/DD/YYYY').format();
	if (info.gender) obj.gender = info.gender;
	if (info.locale) obj.locale = info.locale;
	if (info.relationship_status) obj.relationship_status = info.relationship_status;

	return obj;
}

function handleGoogleInfo(info) {
	let obj = {};
	if (info.name) {
		if (info.name.first_name && info.name.last_name) {
			obj.first_name = info.name.first_name;
			obj.last_name = info.name.last_name;
		} else {
			obj.name = info.name;
		}
	}

	if (info.displayName) {
		if (info.displayName.familyName && info.displayName.givenName) {
			obj.first_name = info.displayName.familyName;
			obj.last_name = info.displayName.givenName;
		} else {
			obj.name = info.displayName;
		}
	}

	if (info.birthday) obj.birthday = moment(info.birthday, 'YYYY-MM-DD').format();
	if (info.gender != undefined || info.gender != null) {
		if (info.gender == 0) obj.gender = 'male';
		else if (info.gender == 1) obj.gender = 'female';
		else if (info.gender == 2) obj.gender = 'other';
		else {
			//string
			obj.gender = info.gender;
		}
	}

	if (info.relationshipStatus) obj.relationship_status = info.relationshipStatus;

	return obj;
}

function hasCountryTag(tags) {
	let hasCountryTag = false;

	tags.forEach(function (tag) {
		if (tag.indexOf('country:') !== -1) {
			hasCountryTag = true;
		}
	});

	return hasCountryTag;
}

/**
 * Pre-save hook
 */
UserSchema.pre('save', function (next) {
	let userInfo = {};

	if (this.isModified('purchased')) {
		userInfo = {
			_id: this._id,
			email: this.email,
			hashed_password: this.hashed_password
		};

		if (this.purchased === true) {
			if (this.tags.indexOf(TagConstant.PURCHASE_PREMIUM) == -1) this.tags.push(TagConstant.PURCHASE_PREMIUM);
			Email.sendMailPremium(userInfo, function (status) {

			});
		}
	}

	if (this.isModified('userSubscribe')) {
		userInfo = {
			_id: this._id,
			email: this.email,
			hashed_password: this.hashed_password
		};

		if (this.userSubscribe === false) {
			Email.unsubscribe(userInfo, function (status) {
			});
		} else {
			Email.subscribe(userInfo, function (status) {
			});
		}
	}

	// password not blank when creating, otherwise skip
	if (!this.isNew) return next();
	next();
});


/**
 * FUNCTIONS
 */

function mergeObject(main_object, extend_object) {
	for (let prop in extend_object) {
		main_object[prop] = extend_object[prop];
	}

	return main_object;
}

let authenticate = function (password) {
	if (this.skipPassword) return true;

	let hash = crypto.createHash('md5').update(password + this.salt).digest("hex");

	return hash === this.hashed_password;
};

let encryptPassword = function (password, salt) {
	if (!password) return '';

	return crypto.createHash('md5').update(password + salt).digest("hex");
};

let updateLastLogin = function (ip, activeId) {
	this.lastLogin = new Date();
	this.ipLastLogin = utils.realIP(ip);

	if (!this.ipRegistered) {
		this.ipRegistered = this.ipLastLogin;
	}

	if (activeId) {
		this.activeId = activeId.toLowerCase();
	}

	if (!hasCountryTag(this.tags)) {
		let location = utils.detectLocationByIp(ip);

		if (location) {
			this.tags.push('country:' + location.country.toLowerCase());
		}
	}

	this.save();
};

let activeUser = function () {
	let hasChanged = false;
	let today = moment();
	let expire = moment().add(100, 'years');

	if (!this.purchased) {
		this.purchased = true;
		hasChanged = true;
	}
	if (!this.premium_at) {
		this.premium_at = today;
		hasChanged = true;
	}
	if (!this.expireDate) {
		this.expireDate = expire;
		hasChanged = true;
	}
	if (!this.firstPurchase) {
		this.firstPurchase = today;
		hasChanged = true;
	}
	if (!this.lastPurchase) {
		this.lastPurchase = today;
		hasChanged = true;
	}
	if (!this.subscribeProduct) {
		this.subscribeProduct = 'premium_sub_year_1';
		hasChanged = true;
	}
	if (!this.subscribeMarket) {
		this.subscribeMarket = 'Other';
		hasChanged = true;
	}
	if (hasChanged) {
		this.save()
	}
};

let setSelectedAccount = function (user_id, account_id, callback) {
	if (!user_id || !account_id) return callback(false);
	let that = this;
	let Permission = require('../model/permission');

	Permission.checkReadPermission(user_id, account_id, function (errCheck, status) {
		if (errCheck) return callback(false);

		if (status) {
			that.findById(user_id, function (err, user) {
				if (err || !user) callback(false);
				else {
					user.selected_account = account_id;
					user.save(function (err) {
						callback(!err);
					});
				}
			});
		} else callback(false);
	});
};

let findUser = function (email, callback) {
	this.findOne({ 'email': email.toLowerCase() }, callback);
};

let findByEmail = function (email, callback) {
	this.findOne({ email: email.toLowerCase() }, callback);
};

let updateActive = function (activeId, email, callback) {
	this.find({ email: email }, function (err, user) {
		if (activeId) user.activeId = activeId.toLowerCase();
		user.purchased = true;
		user.save(function (err) {
			callback(!err);
		});
	});
};

let generateHashPassword = function (user, callback) {
	user.forgotPass = {
		hash: utils.uid(30),
		expire: moment().add(7, 'days')
	};
	user.save(function (err) {
		if (err) callback(false);
		else callback(user);
	});
};

let changePassword = function (email, salt, password, option, callback) {
	this.findOne({
		email: email.toLowerCase()
	}, function (err, user) {
		user.salt = salt;
		user.hashed_password = password;
		if (option === true) user.forgotPass = {
			hash: null
		};
		user.save(function (err) {
			callback(!err);
		});
	});
};

let appActiveUser = function (userId, callback) {
	let today = moment();
	let expireDate = moment().add(100, 'years');

	this.findByIdAndUpdate(userId, {
		$set: {
			purchased: true,
			premium_at: today,
			expireDate: expireDate,
			firstPurchase: today,
			lastPurchase: today,
			subscribeProduct: 'premium_sub_year_1',
			subscribeMarket: 'Other'
		},
		$addToSet: { tags: { $each: [TagConstant.PURCHASE_PREMIUM] } }
	}, function (err, status) {
		callback(!err);
	});
};

let checkActiveUser = function (userId, callback) {
	this.findById(userId, 'purchased', function (err, user) {
		if (err || !user) callback(false);
		else callback(user);
	});
};

let updateLang = function (email, lang, callback) {
	this.findOne({
		email: email
	}, function (err, user) {
		if (user) {
			user.settings.setting_lang = lang;
			user.save(function (err) {
				callback(!err);
			});
		}
	});
};

let acceptSync = function (userId) {
	this.findById(userId, function (err, user) {
		if (user) {
			user.acceptSync = true;
			user.save();
		}
	});
};

let updateLastSync = function (userId) {
	this.update({ _id: userId }, { $set: { lastSync: new Date() } }, function (err, numUp) {

	});
};

let getLimitDevice = function (userId, cb) {
	this.findById(userId, 'limitDevice', function (err, user) {
		if (err || !user) cb(false);
		else cb(user.limitDevice);
	});
};

let updateSetting = function (userId, settings, cb) {
	this.findById(userId, (err, user) => {
		if (err) return cb(204);

		if (!user) return cb(901);

		let cloudSetting = (!user.client_setting) ? {} : user.client_setting;
		cloudSetting = mergeObject(cloudSetting, settings);

		this.findByIdAndUpdate(userId, { client_setting: cloudSetting }, (err) => {
			if (err) {
				cb(204);
			} else {
				cb();
			}
		});
	});
};

let checkExist = function (email, callback) {
	this.findOne({ email: email.toLowerCase() }, function (err, user) {
		callback(!!user, user);
	});
};

let updateTags = function (userId, tags, callback) {
	let update = { $addToSet: { tags: { $each: tags } } };
	this.findByIdAndUpdate(userId, update, callback);
};

let extendDevice = function (userId, noOfExtend, callback) {
	this.findById(userId, function (err, user) {
		if (err) {
			callback(true, err);
		} else if (!err && !user) {
			callback(true, "user_not_found");
		} else {
			user.limitDevice += noOfExtend;
			user.save(callback);
		}
	});
};

let requestExport = function (userId, eventId, callback) {
	/*
	 * callback(err, userInfo)
	 * */

	this.findById(userId, function (err, user) {
		if (err) return callback(err);
		else if (!user) return callback(true);
		else {
			user.exportReport = {
				hash: utils.uid(16),
				expire: moment().add(2, 'days'),
				eventId: eventId
			};
			user.save(function (e, result) {
				if (e) callback(e);
				else callback(null, result);
			});
		}
	});
};

let checkExportRequest = function (userId, request_code, eventId, callback) {
	/*
	 * callback(err, status)
	 * */

	this.findById(userId)
		.select('exportReport')
		.exec(function (err, user) {
			if (err) callback(err);
			else if (!user) callback(true);
			else {
				if (request_code != user.exportReport.hash) return callback(null, false);
				let today = new Date();
				if (today > user.exportReport.expire) return callback(null, false);
				if (eventId != user.exportReport.eventId) return callback(null, false);
				callback(null, true);
			}
		});
};

let setExpire = function (userId, timeUnit, timeValue, callback, purchaseDate) {
	/*
	 * Sử dụng trong trường hợp gia hạn trong backend
	 * callback(error)
	 * */

	this.findById(userId, function (err, user) {
		if (err) return callback(err);

		let today = moment();

		if (!user.expireDate) user.expireDate = today;
		else if (user.expireDate < today) user.expireDate = today;

		let momentExpire = moment(user.expireDate);
		user.expireDate = momentExpire.add(timeValue, timeUnit);

		if (purchaseDate) {
			user.lastPurchase = moment(purchaseDate, 'yyyy-mm-dd');
		} else {
			user.lastPurchase = moment();
		}

		user.save(callback);
	});
};

let checkPassword = function (userId, password, callback) {
	this.findById(userId, function (err, user) {
		let key = env + '-' + userId + '-skip-password';
		let hash;
		redisClient.EXISTS(key, function (e, r) {
			if (e) {
				hash = crypto.createHash('md5').update(password + user.salt).digest("hex");
				callback(hash === user.hashed_password);
			} else if (!r) {
				hash = crypto.createHash('md5').update(password + user.salt).digest("hex");
				callback(hash === user.hashed_password);
			} else {
				callback(true);
			}
		});
	});
};

let findByFacebookId = function (facebookId, callback) {
	this.findOne({ facebookId: facebookId })
		.select('-__v')
		.exec(callback);
};

let findByGoogleId = function (googleId, callback) {
	this.findOne({ googleId: googleId })
		.select('-__v')
		.exec(callback);
};

let updateFacebookId = function (userId, facebookId, callback) {
	this.findByIdAndUpdate(userId, { facebookId: facebookId }, callback);
};

let updateGoogleId = function (userId, googleId, callback) {
	this.findByIdAndUpdate(userId, { googleId: googleId }, callback);
};

let unlinkFacebookId = function () {

};

let unlinkGoogleId = function () {

};

let createUser = function (info, callback) {
	if (!info.email || !info.password) callback(Error.PARAM_INVALID);

	let tags = [];
	let user = new this(info);
	user.email = info.email;
	user.salt = utils.uid(5);
	user.hashed_password = user.encryptPassword(info.password, user.salt);
	user.acceptSync = true;
	if (info.ipRegistered) user.ipRegistered = info.ipRegistered;
	if (info.facebookId) {
		user.facebookId = info.facebookId;
		tags.push(TagConstant.FACEBOOK);
	}
	if (info.googleId) {
		user.googleId = info.googleId;
		tags.push(TagConstant.GOOGLE);
	}

	user.tags = tags;
	user.save(callback);

};

let userLogin = function (email, password, callback) {
	//callback(err, user)
	let that = this;
	this.findByEmail(email, function (err, user) {
		if (err || !user) callback(err, user);
		else {
			if (user.isDeactivated) callback(904);
			that.checkPassword(user._id, password, function (status) {
				if (status) callback(null, user);
				else callback(Error.USER_UNAUTHORITE);
			});
		}
	});
};

let updateUserInfo = function (user_id, from, raw_info, callback) {
	let self = this;

	let processedInfo;

	if (from === 'facebook') processedInfo = handleFacebookInfo(raw_info);
	else if (from === 'google') processedInfo = handleGoogleInfo(raw_info);
	else return callback(Error.PARAM_INVALID);

	//save
	this.findById(user_id, function (err, user) {
		if (err) callback(err);
		else if (!user) callback(Error.USER_NOT_EXIST);
		else {
			let userInfo = user.user_info || {};
			userInfo = _.extend(userInfo, processedInfo);
			self.findByIdAndUpdate(user_id, { user_info: userInfo }, callback);
		}
	});

	//update tag
	if (processedInfo.gender) {
		let tag = [];
		tag.push(sprintf(TagConstant.GENDER, processedInfo.gender.toLowerCase()));
		this.updateTags(user_id, tag, function (err, result) { });
	}

};

let getDiscountByUserId = function (userId, callback) {
	this.findById(userId)
		.select('tags')
		.exec(function (err, userInfo) {
			if (err) callback(Error.ERROR_SERVER);
			else if (!userInfo) callback(Error.USER_NOT_EXIST);
			else {
				if (!userInfo.tags) return callback(null, 0);

				let discountResult = 0;
				userInfo.tags.forEach(function (tag) {
					if (tag.indexOf('discount:') != -1) {
						let discountValue = parseInt(tag.split(':')[1]);
						if (discountValue > discountResult) discountResult = discountValue;
					}
				});

				callback(null, discountResult);
			}
		});
};

let countUserByLinkedWalletProvider = function (provider, callback) {
	let tag = sprintf(TagConstant.LINKEDWALLET, provider);

	let body = utils.createUserQuery(tag);

	esClient.count({
		index: esIndex,
		body: body
	}, function (err, response) {
		callback(err, response.count);
	});
};

let addNewIconPackage = function (product_id, user_id, callback) {
	let update = {
		$addToSet: {
			icon_package: {
				$each: [product_id]
			}
		}
	};

	this.findByIdAndUpdate(user_id, update, callback);
};

let getFinsifyCustomerId = function (user_id, callback) {
	this.findById(user_id, 'finsify_id client_setting', (err, user) => {
		if (err) {
			return callback(err);
		}

		if (!user) {
			return callback('User not found');
		}

		if (user.finsify_id) {
			return callback(null, user.finsify_id);
		}

		if (user.client_setting && user.client_setting.fi_id) {
			return callback(null, user.client_setting.fi_id);
		}

		callback();
	});
};

let setFinsifyCustomerId = function (user_id, fi_id, callback) {
	let update = {
		finsify_id: fi_id
	};

	this.findByIdAndUpdate(user_id, update, callback);
};

let addPhoneNumber = function (user_id, phone, callback) {
	let update = {
		$addToSet: {
			phone: {
				$each: [phone]
			}
		}
	};

	this.findByIdAndUpdate(user_id, update, callback);
};

let findByPhoneNumber = function (phone, callback) {
	let query = { phone: phone };

	this.find(query, callback);
};


let updateSemiPremium = function (user_id, updateData, callback) {
	let update = {
		$set: {
			semi_premium_purchased: updateData.semi_premium_purchased,
			semi_premium_metadata: [{
				platform: updateData.platform,
				expireDate: updateData.expireDate,
				firstPurchase: updateData.firstPurchase,
				lastPurchase: updateData.lastPurchase,
				product: updateData.product,
				market: updateData.market
			}]
		}
	};

	let _that = this;
	let isEmpty = true;

	async.series({
		checkExits: function (cb) {
			_that.findOne({
				_id: user_id
			}, function (error, result) {
				if (error) {
					cb(error);
				} else {
					if (result) {
						if (result.semi_premium_metadata.length > 0) {
							result.semi_premium_metadata.forEach(item => {
								if (item.platform == updateData.platform) {
									isEmpty = false;
								}
							});
						}
					}

					cb();
				}
			})
		},
		updateTask: function (cb) {
			if (!isEmpty) {
				_that.findByIdAndUpdate(user_id, update, { new: true }, cb);
			} else {
				let update_append = {
					$push: {
						semi_premium_metadata: {
							platform: updateData.platform,
							expireDate: updateData.expireDate,
							firstPurchase: updateData.firstPurchase,
							lastPurchase: updateData.lastPurchase,
							product: updateData.product,
							market: updateData.market
						}
					}
				}

				_that.findByIdAndUpdate(user_id, update_append, { new: true }, cb);
			}
		}
	}, callback);

};

/**
 * EXPORTS
 */

UserSchema.methods.authenticate = authenticate;
UserSchema.methods.encryptPassword = encryptPassword;
UserSchema.methods.updateLastLogin = updateLastLogin;
UserSchema.methods.activeUser = activeUser;

UserSchema.statics.setSelectedAccount = setSelectedAccount;
UserSchema.statics.findUser = findUser;
UserSchema.statics.findByEmail = findByEmail;
UserSchema.statics.updateActive = updateActive;
UserSchema.statics.generateHashPassword = generateHashPassword;
UserSchema.statics.changePassword = changePassword;
UserSchema.statics.activeUser = appActiveUser;
UserSchema.statics.checkActiveUser = checkActiveUser;
UserSchema.statics.updateLang = updateLang;
UserSchema.statics.acceptSync = acceptSync;
UserSchema.statics.updateLastSync = updateLastSync;
UserSchema.statics.getLimitDevice = getLimitDevice;
UserSchema.statics.updateSetting = updateSetting;
UserSchema.statics.checkExist = checkExist;
UserSchema.statics.updateTags = updateTags;
UserSchema.statics.extendDevice = extendDevice;
UserSchema.statics.requestExport = requestExport;
UserSchema.statics.checkExportRequest = checkExportRequest;
UserSchema.statics.setExpire = setExpire;
UserSchema.statics.checkPassword = checkPassword;
UserSchema.statics.findByFacebookId = findByFacebookId;
UserSchema.statics.findByGoogleId = findByGoogleId;
UserSchema.statics.updateFacebookId = updateFacebookId;
UserSchema.statics.updateGoogleId = updateGoogleId;
UserSchema.statics.unlinkFacebookId = unlinkFacebookId;
UserSchema.statics.unlinkGoogleId = unlinkGoogleId;
UserSchema.statics.createUser = createUser;
UserSchema.statics.userLogin = userLogin;
UserSchema.statics.updateUserInfo = updateUserInfo;
UserSchema.statics.getDiscountByUserId = getDiscountByUserId;
UserSchema.statics.countUserByLinkedWalletProvider = countUserByLinkedWalletProvider;
UserSchema.statics.addNewIconPackage = addNewIconPackage;
UserSchema.statics.getFinsifyCustomerId = getFinsifyCustomerId;
UserSchema.statics.setFinsifyCustomerId = setFinsifyCustomerId;
UserSchema.statics.addPhoneNumber = addPhoneNumber;
UserSchema.statics.findByPhoneNumber = findByPhoneNumber;
UserSchema.statics.updateSemiPremium = updateSemiPremium;


let User = mongoose.model('User', UserSchema);
// let stream = User.synchronize();
// let count = 0;

// stream.on('data', function(err, doc){
// 	count++;
// 	console.log(count);
// });
// stream.on('close', function(){
// 	console.log('indexed all User documents!');
// });
// stream.on('error', function(err){
// 	console.log(err);
// });
