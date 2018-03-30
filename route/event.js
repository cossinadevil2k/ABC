/*
 Event
 */

'use strict';

let env = process.env.NODE_ENV;

let mongoose = require('mongoose');
let OAuthDB = require('../model/helper/mongodb_connect_oauth');
let ClientKey = OAuthDB.model('ClientKey');
let Event = mongoose.model('Events');
let Active = mongoose.model('Active');
let User = mongoose.model('User');
let Redeem = mongoose.model('Redeem');
let Recaptcha = require('recaptcha').Recaptcha;
let PUBLIC_KEY  = '6LeohPoSAAAAAEP1-VlqPbwMZ2p8V2SYRo7pmdfN',
	PRIVATE_KEY = '6LeohPoSAAAAADHRG7b990VChFE2PHGguFvXAlRb';

let Email = require('../model/email');
let https = require('https');
let moment = require('moment');
let querystring = require('querystring');
let sprintf = require("sprintf-js").sprintf;
let TagConstant = require('../config/tag_constant');
let config = require('../config/config')[env];
let async = require('async');

function checkServerMaintainLoginRequired(res){
	if (global.isServerMaintain){
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}
}

function checkServerMaintain(res){
	if (global.isServerMaintain){
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}
}

function verifyRecaptcha(key, callback) {
	let post_data = querystring.stringify({
		secret: PRIVATE_KEY,
		response: key
	});

	let post_options = {
		host: 'www.google.com',
		port: 443,
		path: '/recaptcha/api/siteverify',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	};

	//set up the post request
	let postReq = https.request(post_options, function(res){
		res.setEncoding('utf8');
		let data = "";
		res.on('data', function (chunk) {
			data += chunk.toString();
		});
		res.on('end', function() {
			let parsedData = JSON.parse(data);
			if (parsedData.success === true || parsedData.success === 'true') callback(true);
			else callback(false);
		});
	});

	//post the data
	postReq.write(post_data);
	postReq.end();
}

let StringLang = {
	vi: {
		'joined': 'Bạn đã tham gia sự kiện này.',
		'isPurchased': 'Địa chỉ email này đã được ghi nhớ là tài khoản Premium. Bấm vào liên kết "Tìm hiểu thêm" ở cuối trang hoặc bấm vào <a href="https://moneylover.me" target="_blank">đây</a> để tải ứng dụng và đăng nhập bằng địa chỉ email này.',
		'expire': 'Rất tiếc! Mã khuyến mại đã hết hạn. Hãy like <a href="https://www.facebook.com/moneylovervietnam" target="_blank">Facebook fanpage</a> của chúng tôi để cập nhật thông tin mới nhất.',
		'recaptcha':'Xác thực không thành công',
		'invalid_form':'Thông tin không chính xác.',
		'invalid_event': 'Sự kiện bạn tham gia không tồn tại.'
	},
	en: {
		'joined': 'Sorry, you have already participated in this event.',
		'isPurchased': 'This email is already a Premium account. Click the "More details" at the end of page or click <a href="https://moneylover.me" target="_blank">here</a> for more details',
		'expire': 'The code has expired. You may like our <a href="https://www.facebook.com/moneylovervietnam" target="_blank">Facebook fanpage</a> to update more info.',
		'recaptcha': 'Recaptcha verifying is not success.',
		'invalid_form': 'The information is invalid',
		'invalid_event': 'The event is invalid'
	}
};

function sendJSONP(res, data){
	res.send(data);
}

function validateEmail(email) {
	let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

function activePremiumSubscription(userId, callback) {
	User.findById(userId, (err, user) => {
		if (err) {
			return callback(Error.ERROR_SERVER);
		}
		if (!user) {
			return callback(Error.USER_NOT_EXIST);
		}

		let now = Date.now();
		let expireUnit = config.subscriptionExpire.premium.unit;
		let expireValue = config.subscriptionExpire.premium.value;
		let update = {};

		if (user.purchased) {
			if (!user.expireDate) update.expireDate = moment(now).add(expireValue, expireUnit);
			if (!user.premium_at) update.premium_at = now;
			if (!user.firstPurchase) update.firstPurchase = now;
			if (!user.lastPurchase) update.lastPurchase = now;
			if (!user.subscribeMarket) update.subscribeMarket = 'Other';
			if (!user.subscribeProduct) update.subscribeProduct = 'premium_sub_year_1';
		} else {
			update.purchased = true;
			update.premium_at = now;
			update.expireDate = moment(now).add(expireValue, expireUnit);
			update.firstPurchase = now;
			update.lastPurchase = now;
			update.subscribeMarket = 'Other';
			update.subscribeProduct = 'premium_sub_year_1';
		}

		let updateKeys = Object.keys(update);

		if (updateKeys.length === 0) {
			return callback();
		}

		User.findByIdAndUpdate(userId, {$set: update}, err => {
			if (err) {
				callback(Error.ERROR_SERVER);
			} else {
				callback();
			}
		});
	});
}

let validForm = function(data){
	let status = 0;

	if(!data.redeemCode){
		status += 1;
	} else {
		status -= 1;
	}
	if(!data.formName || !data.formName.trim().length){
		status += 1;
	} else {
		status -= 1;
	}
	if(!data.formEmail || !validateEmail(data.formEmail)){
		status += 1;
	} else {
		status -= 1;
	}
	return status === -3;
};

let callbackError = function(data){
	// data.callback = undefined;
	data._ = undefined;
	data.recaptcha_challenge_field = undefined;
	return {s: false, data: data};
};

let sendMailDownloadTips = function(fullname, email, lang){
	let subject = '';
	if(lang==='vi'){
		subject = fullname + ' ơi, cùng cài đặt Money Lover nhé!';
	} else {
		subject = "Dear "+fullname+", let's get started with Money Lover app!";
	}

	Email.sendMailDownloadTips(fullname, email, lang, subject, function(err, data){

	});
};

let sendMailActiveGuide = function(fullname, email){
	let subject = fullname + ' ơi, cùng cài đặt Money Lover nhé!';
	Email.sendMailActiveGuide(fullname, email, subject, function(err, data){});
};

let makeObjRedeem = function(event, formData, ipAddress, status){
	return {
		event: event,
		userName: formData.formName,
		userEmail: formData.formEmail,
		ipAddress: ipAddress,
		status: status,
		metadata: {
			tags: [sprintf(TagConstant.PURCHASE_CODE, event)]
		}
	}
};

let validEvent = function(infomation, callback, status){
	let formData = infomation;
	let ipAddress = formData.ipAddress;
	Event.valid(formData.event, function(status, data, event){
		if(status){
			if(data === 1){
				let eventId = event._id;
				Redeem.checkExist(eventId, formData.formEmail, function(status){
					if(status){
						callback(false, '5'); // da tham gia event
					} else {
						User.checkExist(formData.formEmail, function(status, userInfo){
							if(status){
								if(userInfo.purchased === true){
									callback(false, '6'); // da duoc kich hoat premium truoc do
								} else {
									// User.activeUser(userInfo._id, function(){});
									activePremiumSubscription(userInfo._id, err => {});
									Redeem.saveRedeem(makeObjRedeem(eventId, formData, ipAddress, true));
									Active.changeStatus(formData.event, true);
									callback(true, '1');

									sendMailActiveGuide(formData.formName, formData.formEmail);
								}
							} else {
								Redeem.saveRedeem(makeObjRedeem(eventId, formData, ipAddress, false));
								Active.changeStatus(formData.event, true);
								callback(true, '2');

								sendMailActiveGuide(formData.formName, formData.formEmail);
							}
						});
					}
				});
			} else {
				callback(false, '4');
			}
		} else {
			callback(false, '4');
		}
	}, status);
};

let redeemSubmit = function(req, res){
	checkServerMaintainLoginRequired(res);

	let formData = req.query;
	let language = formData.language || 'en';

	let ipAddress =  req.headers['x-real-ip'] || req.headers['x-forwarded-for'];

	function checkEmailExistsAndPurchased(cb){
		//cb(err, registered)
		User.findByEmail(formData.formEmail, (err, user) => {
			if (err) {
				return cb({s: true, data: false, msg: 'Server Error'});
			}

			if (!user) {
				return cb(null, true);
			}

			if (user) {
				if (user.purchased) {
					return cb({s: true, data: false, msg: StringLang[language].isPurchased || StringLang['en'].isPurchased});
				}

				cb(null, user._id);
			}
		});
	}

	function validateCode(user_id, cb){
		Event.valid(formData.redeemCode, (status, available, event) => {
			if (!status || available > 1) {
				return cb({s: true, data: false, msg: StringLang[language].expire || StringLang['en'].expire})
			}

			cb(null, user_id, event);
		});
	}

	function activePremiumForUser(user_id, event, cb){
		if (user_id) {
			// User.activeUser(user_id, function(){});
			activePremiumSubscription(user_id, err => {});
			User.updateTags(user_id, [sprintf(TagConstant.PURCHASE_CODE, event._id)], function(){});
			Redeem.saveRedeem(makeObjRedeem(event._id, formData, ipAddress, true));
			Active.changeStatus(formData.redeemCode, true);
		} else {
			Redeem.saveRedeem(makeObjRedeem(event._id, formData, ipAddress, false));
			sendMailDownloadTips(formData.formName, formData.formEmail, language);
			Active.changeStatus(formData.redeemCode, true);
		}

		if (event.code) {
			event.useCode();
		} else {
			Active.changeStatus(formData.redeemCode, true);
		}

		sendJSONP(res, {s: true, data: true});
		cb();
	}

	async.waterfall([
		function (cb) {
			if (env === 'local') {
				return cb();
			}

			verifyRecaptcha(formData["g-recaptcha-response"], function(status) {
				if (!status) {
					cb({s: true, data: false, msg: StringLang[language].recaptcha || StringLang['en'].recaptcha});
				} else {
					cb();
				}
			});
		},

		function (cb) {
			if (validForm(formData)) {
				cb();
			} else {
				cb({s: true, data: false, msg: StringLang[language]["invalid_form"] || StringLang['en']["invalid_form"]});
			}
		},

		checkEmailExistsAndPurchased,

		validateCode,

		activePremiumForUser
	], (err) => {
		if (err) {
			sendJSONP(res, err);
		}
	});
};

let eventSubmit = function(req, res){
	checkServerMaintain(res);

	let ipAddress =  req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
	let postData = req.body;
	let appId = postData.appid;
	let Secret = postData.secretkey;

	function makeObj(eventId, name, email, ipAddress){
		return {
			event: eventId,
			formName: name,
			formEmail: email,
			ipAddress: ipAddress
		};
	}

	ClientKey.findOne({client: appId, secret: Secret}, function(err, status){
		if (err || !status){
			res.send('3');
		} else {
			let info = makeObj(postData.event, postData.fullname, postData.email, ipAddress);
			validEvent(info, function(status, code){
				res.send(code);
			}, true);
		}
	});
};

module.exports = function(server, config){
	server.get('/redeem-submit', redeemSubmit);
	server.post('/event-submit', eventSubmit);
};
