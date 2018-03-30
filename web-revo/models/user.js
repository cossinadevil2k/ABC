/**
 * Module dependencies.
 */

'use strict';

var mongoose = require('mongoose');
var mongoosastic = require('mongoosastic');
var validate = require('mongoose-validator').validate;
var restify = require('restify');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var crypto = require('crypto');
var utils = require('../helper/utils');
var moment = require('moment');
var Email = require('./email');
var _ = require('underscore');
var async = require('async');
var env	= process.env.NODE_ENV || 'production';
var TagConstant = require('../config/tag_constant');
var Error = require('../config/error');
var redisClient = require('../config/database').redisClient;
var sprintf	= require("sprintf-js").sprintf;
var config = require('../config/config')[env];

var elasticsearch =  require('elasticsearch');
var esClient = new elasticsearch.Client({
	host: config.elasticsearch.hostUrl
});

var esIndex = env + '_user';

/**
 * User Schema
 */
var UserSchema = new Schema({
	id: ObjectId,
	email: { type: String, trim: true, required: true, lowercase: true, unique: true, index: true, es_indexed: true },
	facebookId:{type: String, index: true},
	googleId:{type: String, index: true},
	hashed_password: { type: String, trim: true, required: true },
	salt: { type: String },
	//role: { type: String, trim: true, required: true, enum: ['User', 'Developer', 'Admin'], default: 'User' },
	selected_account: { type: Schema.Types.ObjectId, ref: 'Account' },
	settings: {
		setting_amount_display: {
			isShorten: { type: Boolean},
			showCurrency: { type: Boolean },
			negativeStyle: { type: Number},
			decimalVisibility: {type: Boolean},
			decimalSeparator: { type: Number }
		},
		setting_lang: { type: String },
		setting_date: {
			datetimeFormat: { type: String },
			firstDayOfMonth: { type: Number},
			firstDayOfWeek: {type: Number},
			firstMonthOfYear: {type: Number}
		},
		daily_alarm: {type: Number},
		show_add_it_later: {type: Boolean},
		on_location: {type: Boolean}
	},
	activeId: { type: Schema.Types.ObjectId, ref: 'Active' },
	purchased: { type: Boolean, default: false, index:true },
	forgotPass: {
		hash: { type: String, trim: true, index: true },
		expire: { type: Date }
	},
//	iconResource: [{ type: String, trim: true, index: true }],
	createdDate: { type: Date, default: Date.now, index: true, es_indexed: true },
	lastLogin: { type: Date, default: Date.now },
	verifyEmail: { type: Boolean, default: false },
	acceptSync: { type: Boolean, default: false, index: true},
	lastSync: { type: Date, index: true },
	userSubscribe: {type: Boolean, default: true, index: true, es_index: true},
	limitDevice: {type: Number, default: 5},
	skipPassword: {type: Boolean, default: false},
	icon_package: {type: [{type: String, trim: true, lowercase: true}]},
	ipRegistered: {type: String, trim:true},
	ipLastLogin: {type: String, trim:true},
	tags: [{type: String, trim: true, lowercase: true, es_indexed: true, index: true}],
	isDeactivated: {type: Boolean, default: false},
	sprintRemain: {type: Number, default: 0},
	client_setting: {type: Schema.Types.Mixed},
	exportReport: {
		hash: {type: String, trim: true, index: true},
		expire: {type: Date},
		eventId: {type: String, trim: true}
	},
	expireDate: {type: Date},
    firstPurchase: {type: Date},
	lastPurchase: {type: Date},
	subscribeProduct: {type: String, trim: true, lowercase: true},
	subscribeMarket: {type: String, trim: true, lowercase: true},
	rwExpire: {type: Date, es_index: true},
	rwProduct: {type: String, trim: true, lowercase:true},
	rwMarket: {type: String, trim: true},
	rwFirstPurchase: {type: Date, es_index: true},
	rwLastPurchase: {type: Date, es_index: true},
	rwLimit: {type: Number, default: 10},
	user_info: {type: Schema.Types.Mixed}
});

UserSchema.plugin(mongoosastic, {
	index: esIndex,
	hosts: [
		config.elasticsearch.hostUrl
	]
});

/**
 * UTILITIES
 */

function handleFacebookInfo(info){
	var obj = {};
	if (info.name) obj.name = info.name;
	if (info.first_name) obj.first_name = info.first_name;
	if (info.last_name) obj.last_name = info.last_name;
	if (info.birthday) obj.birthday = moment(info.birthday, 'MM/DD/YYYY').format();
	if (info.gender) obj.gender = info.gender;
	if (info.locale) obj.locale = info.locale;
	if (info.relationship_status) obj.relationship_status = info.relationship_status;

	return obj;
}

function handleGoogleInfo(info){
	var obj = {};
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
	if (info.gender != undefined || info.gender != null){
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

/**
 * Pre-save hook
 */
UserSchema.pre('save', function(next) {
	var userInfo = {};

    if (this.isModified('purchased')) {
        userInfo = {
            _id : this._id,
            email : this.email,
            hashed_password: this.hashed_password
        };

        if (this.purchased === true) {
			if (this.tags.indexOf(TagConstant.PURCHASE_PREMIUM) == -1) this.tags.push(TagConstant.PURCHASE_PREMIUM);
            Email.sendMailPremium(userInfo, function(status){

            });
        }
    }

	if (this.isModified('userSubscribe')){
		userInfo = {
			_id: this._id,
			email: this.email,
			hashed_password: this.hashed_password
		};

		if (this.userSubscribe === false){
			Email.unsubscribe(userInfo, function(status){
			});
		} else {
			Email.subscribe(userInfo, function(status){
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

var authenticate = function(password) {
	if (this.skipPassword) return true;

	let hash = crypto.createHash('md5').update(password + this.salt).digest("hex");

	return hash === this.hashed_password;
};

var encryptPassword = function(password, salt) {
	if (!password) return '';

	return crypto.createHash('md5').update(password + salt).digest("hex");
};

var updateLastLogin = function(ip, activeId) {
	this.lastLogin = new Date();
	this.ipLastLogin = utils.realIP(ip);

	if (!this.ipRegistered) {
		this.ipRegistered = this.ipLastLogin;
	}

	if (activeId) {
		this.activeId = activeId.toLowerCase();
	}

	this.save();
};

var activeUser = function() {
	this.purchased = true;
	this.save();
};

var setSelectedAccount = function(user_id, account_id, callback) {
	if (!user_id || !account_id) return callback(false);
	var that = this;
	var Permission = require('../model/permission');

	Permission.checkReadPermission(user_id, account_id, function(status) {
		if (status) {
			that.findById(user_id, function(err, user) {
				if (err || !user) callback(false);
				else {
					user.selected_account = account_id;
					user.save(function(err) {
						callback(!err);
					});
				}
			});
		} else callback(false);
	});
};

var findUser = function(email, callback){
	this.findOne({'email': email.toLowerCase()}, callback);
};

var findByEmail = function(email, callback) {
	this.findOne({ email: email.toLowerCase() }, callback);
};

var updateActive = function(activeId, email, callback) {
	this.find({ email: email }, function(err, user) {
		if (activeId) user.activeId = activeId.toLowerCase();
		user.purchased = true;
		user.save(function(err) {
			callback(!err);
		});
	});
};

var generateHashPassword = function(user, callback) {
	user.forgotPass = {
		hash: utils.uid(30),
		expire: moment().add(7, 'days')
	};
	user.save(function(err) {
		if (err) callback(false);
		else callback(user);
	});
};

var changePassword = function(email, salt, password, option, callback) {
	this.findOne({
		email: email.toLowerCase()
	}, function(err, user) {
		user.salt = salt;
		user.hashed_password = password;
		if (option === true) user.forgotPass = {
			hash: null
		};
		user.save(function(err) {
			callback(!err);
		});
	});
};

var activeUser = function(userId, callback) {
	this.findByIdAndUpdate(userId, {
		$set: {
			purchased: true
		},
		$addToSet:{tags:{$each: [TagConstant.PURCHASE_PREMIUM]}}
	}, function(err, status) {
		callback(!err);
	});
};

var checkActiveUser = function(userId, callback) {
	this.findById(userId, 'purchased', function(err, user) {
		if (err || !user) callback(false);
		else callback(user);
	});
};

var updateLang = function(email, lang, callback) {
	this.findOne({
		email: email
	}, function(err, user) {
		if (user) {
			user.settings.setting_lang = lang;
			user.save(function(err) {
				callback(!err);
			});
		}
	});
};

var acceptSync = function(userId) {
	this.findById(userId, function(err, user) {
		if(user){
			user.acceptSync = true;
			user.save();
		}
	});
};

var updateLastSync = function(userId){
	this.update({_id: userId}, {$set: {lastSync: new Date()}}, function(err, numUp){

	});
};

var getLimitDevice = function(userId, cb){
	this.findById(userId, 'limitDevice', function(err, user){
		if(err || !user) cb(false);
		else cb(user.limitDevice);
	});
};

var updateSetting = function(userId, settings, cb){
	var that = this;
	this.findById(userId, function(err, user){
		if(err) cb(0);
		else if(!err && !user) cb(1);
		else {
			//user.settings = settings;
			//if(!user.client_setting) user.client_setting = {};
			//user.client_setting = _.extend(user.client_setting, settings);
			//user.save(function(err, result){
			//	console.log(err);
			//	if(err) cb(0);
			//	else cb(2);
			//});
			var cloudSetting = (!user.client_setting)? {} : user.client_setting;
			cloudSetting = _.extend(cloudSetting, settings);
			that.findByIdAndUpdate(userId, {client_setting: cloudSetting}, function(err, result){
				if (err) cb(0);
				else cb(2);
			});
		}
	});
};

var checkExist = function(email, callback){
	this.findOne({email: email.toLowerCase()}, function(err, user){
		callback(!!user, user);
	});
};

var updateTags = function(userId, tags, callback){
	var update = {$addToSet:{tags:{$each: tags}}};
	this.findByIdAndUpdate(userId, update, callback)
};

var extendDevice = function(userId, noOfExtend, callback){
	this.findById(userId, function(err, user){
		if(err){
			callback(true, err);
		} else if (!err && !user){
			callback(true, "user_not_found");
		} else {
			user.limitDevice += noOfExtend;
			user.save(callback);
		}
	});
};

var requestExport = function(userId, eventId, callback){
	/*
	 * callback(err, userInfo)
	 * */

	this.findById(userId, function(err, user){
		if(err) return callback(err);
		else if (!user) return callback(true);
		else {
			user.exportReport = {
				hash: utils.uid(16),
				expire: moment().add(2, 'days'),
				eventId: eventId
			};
			user.save(function(e, result) {
				if (e) callback(e);
				else callback(null, result);
			});
		}
	});
};

var checkExportRequest = function(userId, request_code, eventId, callback){
	/*
	 * callback(err, status)
	 * */

	this.findById(userId)
		.select('exportReport')
		.exec(function(err, user){
			if(err) callback(err);
			else if (!user) callback(true);
			else {
				if (request_code != user.exportReport.hash) return callback(null, false);
				var today = new Date();
				if (today > user.exportReport.expire) return callback(null, false);
				if (eventId != user.exportReport.eventId) return callback(null, false);
				callback(null, true);
			}
		});
};

var renewSubscription = function(purchaseInfo, callback){
	/*
	 * Hàm sử dụng với trường hợp người dùng tự gia hạn theo cách thông thường
	 * purchaseInfo: payerId, receiverEmail, product, market, os, purchase_type, purchase_date
	 * callback err: ['receiver', product', 'renew']
	 * */
	var fs = require('fs');
	var _root = require('path').normalize(__dirname + '/..');
	var filePath = _root + '/landing-page/data/subscription_product.json';
	var that = this;
	var momentExpire = null;

	function convertProductToTime(product_id){
		//productId example: sub1_100_notrial
		var info = product_id.split('_');
		var withTrial = (info[2] !== 'notrial');
		var timeValue = 0;

		var i = 1;
		if (info[0].substr(0, 2) === 'rw'){
			if (info[0].length === 4) i = 2;
		} else if (info[0].substr(0, 3) === 'sub') {
			if (info[0].length === 5) i = 2;
		}

		var type = info[0].slice(0, info[0].length - i);
		try {
			timeValue = parseInt(info[0].slice(info[0].length - i));
		} catch(e){
			return false;
		}
		if (env === 'production') return {unit: 'months', time: timeValue, withTrial: withTrial, type: type};
		else return {unit: (timeValue >= 12) ? 'months': 'minutes', time: timeValue, withTrial: withTrial, type: type};
	}

	async.waterfall([
		//check receiver
		function(next){
			that.findByEmail(purchaseInfo.receiverEmail, function(err, receiver){
				if(err || !receiver) next('receiver');
				else next(null, receiver);
			});
		},
		//check product & renew
		function(receiver, next){
			var productInfo = convertProductToTime(purchaseInfo.product);
			if (!productInfo) return next('product');

			var today = moment();

			if (productInfo.type === 'sub') {
				//if (purchaseInfo.product !== receiver.subscribeProduct) return next('product');
				if (purchaseInfo.market) receiver.subscribeMarket = purchaseInfo.market;

				receiver.lastPurchase = moment(purchaseInfo.purchase_date).toISOString();
			} else {
				//rw
				if (purchaseInfo.market) receiver.rwMarket = purchaseInfo.market;

				receiver.rwLastPurchase = moment(purchaseInfo.purchase_date).toISOString();
			}

			if (purchaseInfo.purchase_type === 1){
				//auto renew
				if (productInfo.type === 'sub') {
					if (!receiver.subscribeProduct) {
						//new user detected
						receiver.firstPurchase = today;
						if (productInfo.withTrial) {
							receiver.expireDate = today.add(14, 'days');
							receiver.subscribeProduct = 'Trial';
						} else {
							receiver.expireDate = today.add(productInfo.time, productInfo.unit);
							receiver.subscribeProduct = purchaseInfo.product;
						}
					} else {
						if (purchaseInfo.product !== receiver.subscribeProduct) {
							//change product detected
							if (receiver.subscribeProduct === 'Trial') {
								receiver.subscribeProduct = purchaseInfo.product;
								momentExpire = moment(receiver.expireDate);
								receiver.expireDate = momentExpire.add(productInfo.time, productInfo.unit);
							} else {
								receiver.subscribeProduct = purchaseInfo.product;
								receiver.expireDate = today.add(productInfo.time, productInfo.unit);
							}
						} else {
							//renew
							momentExpire = moment(receiver.expireDate);
							receiver.expireDate = momentExpire.add(productInfo.time, productInfo.unit);
						}
					}
				} else {
					//rw
					if (!receiver.rwExpire) {
						//first time
						receiver.rwFirstPurchase = today;
						if (productInfo.withTrial) {
							receiver.rwExpire = today.add(14, 'days');
							receiver.rwProduct = 'Trial';
						} else {
							receiver.rwExpire = today.add(productInfo.time, productInfo.unit);
							receiver.rwProduct = purchaseInfo.product;
						}
					} else {
						if (purchaseInfo.product !== receiver.rwProduct) {
							//change product
							if (receiver.rwProduct === 'Trial') {
								receiver.rwProduct = purchaseInfo.product;
								momentExpire = moment(receiver.rwExpire);
								receiver.rwExpire = momentExpire.add(productInfo.time, productInfo.unit);
							} else {
								receiver.rwProduct = purchaseInfo.product;
								receiver.rwExpire = today.add(productInfo.time, productInfo.unit);
							}
						} else {
							//renew
							momentExpire = moment(receiver.rwExpire);
							receiver.rwExpire = momentExpire.add(productInfo.time, productInfo.unit);
						}
					}
				}
			} else if (purchaseInfo.purchase_type === 2){
				//manual renew
				if (productInfo.type === 'sub') {
					if (!receiver.subscribeProduct) {
						//new user detected
						receiver.firstPurchase = today;
						receiver.expireDate = today.add(productInfo.time, productInfo.unit);
						receiver.subscribeProduct = purchaseInfo.product;
					} else {
						if (purchaseInfo.product !== receiver.subscribeProduct) {
							//change product detected
							receiver.subscribeProduct = purchaseInfo.product;
						}

						if (receiver.expireDate > today) {
							momentExpire = moment(receiver.expireDate);
							receiver.expireDate = momentExpire.add(productInfo.time, productInfo.unit);
						} else {
							receiver.expireDate = today.add(productInfo.time, productInfo.unit);
						}
					}
				} else {
					//rw
					if (!receiver.rwProduct) {
						//first time
						receiver.rwFirstPurchase = today;
						receiver.rwExpire = today.add(productInfo.time, productInfo.unit);
						receiver.rwProduct = purchaseInfo.product;
					} else {
						if (purchaseInfo.product !== receiver.rwProduct) {
							//change product detected
							receiver.rwProduct = purchaseInfo.product;
						}

						if (receiver.rwExpire > today) {
							momentExpire = moment(receiver.rwExpire);
							receiver.rwExpire = momentExpire.add(productInfo.time, productInfo.unit);
						} else {
							receiver.rwExpire = today.add(productInfo.time, productInfo.unit);
						}
					}
				}
			}

			receiver.save(function(err, data){
				if (err || !data) next('renew');
				else if(productInfo.type === 'sub') {
					next(null, receiver._id, productInfo.type, receiver.expireDate);
				} else {
					//rw
					next(null, receiver._id, productInfo.type, receiver.rwExpire)
				}
			});

		},
		//save log
		function(receiverId, productType, expire, next){
			var subscriptionLog = mongoose.model('SubscriptionLog');
			var info = {payer: purchaseInfo.payerId,
				receiver: receiverId,
				product: purchaseInfo.product,
				market: purchaseInfo.market,
				platform: purchaseInfo.os
			};
			if (productType === 'sub') info.type = 0;
			else info.type = 1; //rw

			subscriptionLog.newLog(info, function(status){
				var data = {
					receiverId: receiverId
				};
				if (productType === 'sub') data.receiverExpireDate = expire;
				else data.receiverRwExpire = expire; //rw

				next(null, data);
			});
		}
	], function(err, data){
		if (err) callback(err);
		else {
			callback(null, data);
			//push notification
			var Hook = require('./sync/newhook');
			var Device = mongoose.model('Device');
			Device.find({owner: data.receiverId, tokenDevice: {$ne: purchaseInfo.tokenDevice}}, function(err, listDevice){
				if(listDevice){
					var hookInstance = new Hook();
					var message = {};
					if (data.receiverExpireDate) message = {ac: 16, exp: data.receiverExpireDate};
					else message = {ac: 17, exp: data.receiverRwExpire}; //rw
					hookInstance.pushd(listDevice, '1', message, function(){

					});
				}
			});
		}
	});

};

var setExpire = function(userId, timeUnit, timeValue, callback){
	/*
	 * Sử dụng trong trường hợp gia hạn trong backend
	 * callback(error)
	 * */

	this.findById(userId, function(err, user){
		if (err) return callback(err);

		var today = moment();

		if (!user.expireDate) user.expireDate = today;
		else if (user.expireDate < today) user.expireDate = today;

		var momentExpire = moment(user.expireDate);
		user.expireDate = momentExpire.add(timeValue, timeUnit);

		user.save(callback);
	});
};

var checkPassword = function(userId, password, callback){
	this.findById(userId, function(err, user){
		var key = env + '-' + userId + '-skip-password';
		var hash;
		redisClient.EXISTS(key, function(e,r){
			if (e) {
				hash = crypto.createHash('md5').update(password + user.salt).digest("hex");
				callback(hash === user.hashed_password);
			} else if (!r) {
				hash = crypto.createHash('md5').update(password + user.salt).digest("hex");
				callback(hash === user.hashed_password);
			} else callback(true);
		});
	});
};

var findByFacebookId = function(facebookId, callback){
	this.findOne({facebookId: facebookId})
		.select('-__v')
		.exec(callback);
};

var findByGoogleId = function(googleId, callback){
	this.findOne({googleId: googleId})
		.select('-__v')
		.exec(callback);
};

var updateFacebookId = function(userId, facebookId, callback){
	this.findByIdAndUpdate(userId, {facebookId: facebookId}, callback);
};

var updateGoogleId = function(userId, googleId, callback){
	this.findByIdAndUpdate(userId, {googleId: googleId}, callback);
};

var unlinkFacebookId = function(){

};

var unlinkGoogleId = function(){

};

var createUser = function(info, callback){
	if (!info.email || !info.password) callback(Error.PARAM_INVALID);

	var tags = [];
	var user = new this(info);
	user.email = info.email;
	user.salt = utils.uid(5);
	user.hashed_password = user.encryptPassword(info.password, user.salt);
	user.acceptSync = true;
	if (info.ipRegistered) user.ipRegistered = info.ipRegistered;
	if (info.facebookId) {
		user.facebookId = info.facebookId;
		tags.push(TagConstant.FACEBOOK);
	}
	if (info.googleId){
		user.googleId = info.googleId;
		tags.push(TagConstant.GOOGLE);
	}

	user.tags = tags;
	user.save(callback);

};

var userLogin = function(email, password, callback){
	//callback(err, user)
	var that = this;
	this.findByEmail(email, function(err, user){
		if (err || !user) callback(err, user);
		else {
			if (user.isDeactivated) callback(904);
			that.checkPassword(user._id, password, function(status){
				if (status) callback(null, user);
				else callback(Error.USER_UNAUTHORITE);
			});
		}
	});
};

var updateUserInfo = function(user_id, from, raw_info, callback){
	var self = this;

	var processedInfo;

	if (from === 'facebook') processedInfo = handleFacebookInfo(raw_info);
	else if (from === 'google') processedInfo = handleGoogleInfo(raw_info);
	else return callback(Error.PARAM_INVALID);

	//save
	this.findById(user_id, function(err, user){
		if (err) callback(err);
		else if (!user) callback(Error.USER_NOT_EXIST);
		else {
			var userInfo = user.user_info || {};
			userInfo = _.extend(userInfo, processedInfo);
			self.findByIdAndUpdate(user_id, {user_info: userInfo}, callback);
		}
	});

	//update tag
	if (processedInfo.gender) {
		var tag = [];
		tag.push(sprintf(TagConstant.GENDER, processedInfo.gender.toLowerCase()));
		this.updateTags(user_id, tag, function(err, result){});
	}

};

var getDiscountByUserId = function(userId, callback){
	this.findById(userId)
		.select('tags')
		.exec(function(err, userInfo){
			if (err) callback(Error.ERROR_SERVER);
			else if (!userInfo) callback(Error.USER_NOT_EXIST);
			else {
				if (!userInfo.tags) return callback(null, 0);

				var discountResult = 0;
				userInfo.tags.forEach(function(tag){
					if (tag.indexOf('discount:') != -1) {
						var discountValue = parseInt(tag.split(':')[1]);
						if (discountValue > discountResult) discountResult = discountValue;
					}
				});

				callback(null, discountResult);
			}
		});
};

var countUserByLinkedWalletProvider = function(provider, callback) {
	let tag = sprintf(TagConstant.LINKEDWALLET, provider);

	let body = utils.createUserQuery(tag);

	esClient.count({
		index: esIndex,
		body: body
	}, function (err, response) {
		callback(err, response.count);
	});
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
UserSchema.statics.activeUser = activeUser;
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
UserSchema.statics.renewSubscription = renewSubscription;
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

var User = mongoose.model('User', UserSchema);
//var stream = User.synchronize();
//var count = 0;

//stream.on('data', function(err, doc){
//	count++;
//	console.log(count);
//});
//stream.on('close', function(){
	//console.log('indexed all User documents!');
//});
//stream.on('error', function(err){
//	console.log(err);
//});