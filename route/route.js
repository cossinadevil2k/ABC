'use strict';

let env = process.env.NODE_ENV;

let mongoose = require('mongoose');
let restify = require('restify');
let async = require('async');
let moment = require('moment');
let _ = require('underscore');
let crypto = require('crypto');
let sprintf = require("sprintf-js").sprintf;
let jwt = require('jsonwebtoken');

let config = require('../config/config')[env];
let utils = require('../helper/utils');
let Error = require('../config/error');
let Hook = require('../config/hook');
let Email = require('../model/email');
let TagsContant = require('../config/tag_constant');
let RedisClient = require('../config/database').redisClient;

let Event = mongoose.model('Events');
let Active = mongoose.model('Active');
let Redeem = mongoose.model('Redeem');
let User = mongoose.model('User');
let AccountShare = mongoose.model('AccountShare');
let Account = mongoose.model('Account');
let Budget = mongoose.model('Budget');
let Campaign = mongoose.model('Campaign');
let Category = mongoose.model('Category');
let Transaction = mongoose.model('Transaction');
let Device = mongoose.model('Device');
let SubscriptionCode = mongoose.model('SubscriptionCode');
let ItemModel = mongoose.model('Item');

let SOCIAL = {
	'FACEBOOK': 1,
	'GOOGLE': 2
};

/*********UTILITY FUNCTIONS**********/

function validateUser(req, res) {
	let status = true;
	if (!req.user_id) {
		res.sendUnauthorized();
		status = false;
	}

	return status;
}

function checkEmailExists(email, callback) {
	User.findByEmail(email, function (err, result) {
		callback(!result);
	});
}

function validateEmail(email) {
	let re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}

function validateCode(code) {
	return !!code;
}

function validatePostLogin(info) {
	return !(!info || !info.email || !info.password);
}

function encryptPassword(password, salt) {
	if (!password) return '';
	return crypto.createHash('md5').update(password + salt).digest("hex");
}

function detectIpAndSendEmail(info) {
	if (!info || !info.user || !info.randomPassword) {
		return;
	}

	let location = utils.detectLocationByIp(info.user.ipRegistered);

	if (location) {
		//update tags
		let item = [];
		if (location.country) item.push('country:' + location.country.toLowerCase());
		if (location.city) item.push('city:' + location.city.replace(/ /g, '_').toLowerCase());
		if (item.length > 0) User.updateTags(info.user._id, item, function () {
		});
		//send email
		Email.sendSocialLoginWelcomeEmail(info.user.email, info.randomPassword, location.country, function () {
		});
	} else {
		Email.sendSocialLoginWelcomeEmail(info.user.email, info.randomPassword, 'Other', function () {
		});
	}
}

function generateHashForgotPassword(user, expireDay) {
	let pinCode = utils.generateUUID();
	
	return {
		pin: pinCode,
		hash: jwt.sign(
			{
				email: user.email,
				userId: user._id,
				pin: pinCode
			}, 
			config.forgotPasswordSecret,
			{
				expiresIn: `${expireDay}d`
			}
		)
	}
}

function generateKeyForgotPassword(pin) {
	return `ForgotPassword:${pin}`;
}

function savePinForgotPassword(pin, email, expire, callback) {
	let expireDay = (expire * 86400);
	
	RedisClient.SETEX(generateKeyForgotPassword(pin), expireDay, email, callback);
}

function makeForgotPasswordUrl(hash){
	return `https:${config.site.urlNewApp}/forgot-password/${hash}`;
}

function sendForgotPasswordEmail(user, hash){
	let url = makeForgotPasswordUrl(hash.hash);
	let pin = hash.pin;
	
	Email.forgotPassword2(user.email, url, pin, function(){

	});
}

/*********ROUTER FUNCTIONS**********/

function socialRegister(mode, req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let fbId = req.body.fbId,
		fbEmail = req.body.fbEmail,
		fbInfo = req.body.fbInfo,
		ggId = req.body.ggId,
		ggEmail = req.body.ggEmail,
		ggInfo = req.body.ggInfo,
		ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	if (ip) {
		ip = utils.realIP(ip);
	}

	if (mode === 1) {
		if (!fbId || !fbEmail || !fbInfo) return res.send({status: false, message: Error.PARAM_INVALID});
		if (!validateEmail(fbEmail)) return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	} else {
		//2
		if (!ggId || !ggEmail || !ggInfo) return res.send({status: false, message: Error.PARAM_INVALID});
		if (!validateEmail(ggEmail)) return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}

	let randomPassword = utils.uid(6);

	function checkSocialId(mode, id, cb) {
		if (mode === 1) {
			User.findByFacebookId(id, function (err, user) {
				if (err) cb(err);
				else {
					if (!user) cb(null, true);
					else {
						if (user.email == fbEmail) cb(null, false, Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
						else cb(null, false, Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
					}
				}
			});
		} else {
			User.findByGoogleId(id, function (err, user) {
				if (err) cb(err);
				else {
					if (!user) cb(null, true);
					else {
						if (user.email == ggEmail) cb(null, false, Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
						else cb(null, false, Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
					}
				}
			});
		}
	}

	function checkSocialEmail(mode, email, cb) {
		User.findByEmail(email, function (err, user) {
			if (err) cb(err);
			else {
				if (!user) cb(null, true);
				else {
					if (mode === 1) {
						if (!user.facebookId) cb(null, false, Error.SOCIAL_EMAIL_REGISTERED_WITHOUT_SOCIAL_ID);
						else cb(null, false, Error.SOCIAL_EMAIL_REGISTERED_WITH_ANOTHER_SOCIAL_ID);
					} else {
						if (!user.googleId) cb(null, false, Error.SOCIAL_EMAIL_REGISTERED_WITHOUT_SOCIAL_ID);
						else cb(null, false, Error.SOCIAL_EMAIL_REGISTERED_WITH_ANOTHER_SOCIAL_ID);
					}

				}
			}
		});
	}

	function createNewSocialUser(mode, callback) {
		let info;
		if (mode === 1) {
			info = {
				email: fbEmail,
				password: randomPassword,
				facebookId: fbId,
				ipRegistered: ip
			};
		} else {
			info = {
				email: ggEmail,
				password: randomPassword,
				googleId: ggId,
				ipRegistered: ip
			};
		}
		User.createUser(info, callback);
	}

	async.waterfall([
		function (callback) {
			if (mode === SOCIAL.FACEBOOK) {
				checkSocialId(mode, fbId, function (err, status, errorCode) {
					callback(err, status, errorCode);
				});
			} else {
				checkSocialId(mode, ggId, function (err, status, errorCode) {
					callback(err, status, errorCode);
				});
			}

		},
		function (status, errorCode, callback) {
			if (!status) callback(null, {status: status, errorCode: errorCode});
			else {
				if (mode === SOCIAL.FACEBOOK) {
					checkSocialEmail(mode, fbEmail, function (err, stt, errCode) {
						if (err) callback(err);
						else callback(null, {status: stt, errorCode: errCode});
					});
				} else {
					checkSocialEmail(mode, ggEmail, function (err, stt, errCode) {
						if (err) callback(err);
						else callback(null, {status: stt, errorCode: errCode});
					});
				}
			}
		}
	], function (err, result) {
		if (err) {
			return res.send({status: false, message: err});
		}


		if (!result.status) {
			return res.send({status: false, message: result.errorCode});
		}

		createNewSocialUser(mode, function (err2, user) {
			if (err2 || !user) res.send({status: false, message: Error.ERROR_SERVER});
			else {
				res.send({status: true});

				//detect location by ip
				if (user.ipRegistered) {
					detectIp({user: user, randomPassword: randomPassword});
				}

				//update user info
				if (mode === SOCIAL.FACEBOOK) {
					User.updateUserInfo(user._id, 'facebook', fbInfo, function (err, result) {
					});
				} else {
					User.updateUserInfo(user._id, 'google', ggInfo, function (err, result) {
					});
				}
			}
		});
	});
}

function socialRegister2(mode, id, email, info, callback, ref) {
	//mode, id, email, {info.profile, info.id}
	if (info.ip) {
		info.ip = utils.realIP(info.ip);
	}

	let randomPassword = utils.uid(6);

	function checkSocialId(mode, id, cb) {
		let callbackFunction = function (err, user) {
			if (err) {
				return cb(err);
			}

			if (!user) {
				return cb(null, true, null);
			}

			if (user.email == email) {
				cb(null, false, Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
			} else {
				cb(null, false, Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
			}
		};

		if (mode === 1) {
			User.findByFacebookId(id, callbackFunction);
		} else {
			User.findByGoogleId(id, callbackFunction);
		}
	}

	function checkSocialEmail(mode, email, cb) {
		User.findByEmail(email, function (err, user) {
			if (err) {
				return cb(err);
			}

			if (!user) {
				return cb(null, true, null);
			}

			let socialId;

			if (mode === SOCIAL.FACEBOOK) {
				socialId = user.facebookId;
			} else {
				socialId = user.googleId;
			}

			if (!socialId) {
				cb(null, false, Error.SOCIAL_EMAIL_REGISTERED_WITHOUT_SOCIAL_ID);
			} else {
				cb(null, false, Error.SOCIAL_EMAIL_REGISTERED_WITH_ANOTHER_SOCIAL_ID);
			}
		});
	}

	function createNewSocialUser(mode, cb) {
		let user;

		if (mode === SOCIAL.FACEBOOK) {
			user = {
				email: email,
				password: randomPassword,
				facebookId: id,
				ipRegistered: info.ip
			};
		} else {
			user = {
				email: email,
				password: randomPassword,
				googleId: id,
				ipRegistered: info.ip
			};
		}

		User.createUser(user, cb);
	}

	async.waterfall([
		function (cb) {
			checkSocialId(mode, id, cb);
		},
		function (status, errorCode, cb) {
			if (!status) {
				return cb(null, {status: status, errorCode: errorCode});
			}

			checkSocialEmail(mode, email, function (err, stt, errCode) {
				if (err) {
					cb(err);
				} else {
					cb(null, {status: stt, errorCode: errCode});
				}
			});

		}
	], function (err, result) {
		if (err) {
			return callback(err);
		}

		let updateSocialInfoCallback = function (error, user) {
			if (error || !user) {
				return callback(Error.ERROR_SERVER);
			}

			callback();

			//detect location by ip
			if (user.ipRegistered && randomPassword) {
				detectIpAndSendEmail({user: user, randomPassword: randomPassword});
			}

			let tags = [];

			if (ref) {
				let handledTag = utils.tagHandle(ref);
				if (handledTag && handledTag != 'undefined') {
					tags.push(sprintf(TagsContant.REF, utils.tagHandle(ref)));
				}
			}

			//update user info
			if (mode === SOCIAL.FACEBOOK) {
				User.updateUserInfo(user._id, 'facebook', info.profile, function () {
					tags.push(TagsContant.FACEBOOK);

					User.updateTags(user._id, tags, function () {
					});
				});
			} else {
				User.updateUserInfo(user._id, 'google', info.profile, function () {
					tags.push(TagsContant.GOOGLE);
					
					User.updateTags(user._id, tags, function () {
					});
				});
			}
		};

		if (!result.status) {
			if (result.errorCode !== Error.SOCIAL_EMAIL_REGISTERED_WITHOUT_SOCIAL_ID) {
				return callback(result.errorCode);
			} else {
				randomPassword = null;
				return linkWithSocial2(mode, id, email, updateSocialInfoCallback);
			}
		}

		createNewSocialUser(mode, updateSocialInfoCallback);
	});
}

function socialLogin(mode, req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	function sendError(errorStatus) {
		res.send(200, {
			status: false,
			message: errorStatus
		});
	}

	let postData = req.body;

	if (!postData || typeof postData !== "object") {
		return sendError(202);
	}

	if (mode === 1) {
		if (!postData.fbId) {
			return sendError(Error.USER_WARNING_INFO);
		}
	} else {
		if (!postData.ggId) {
			return sendError(Error.USER_WARNING_INFO);
		}
	}

	if (!req.authorization || !req.authorization.basic) {
		return sendError(Error.USER_WARNING_INFO);
	}

	let fbId = postData.fbId;
	let ggId = postData.ggId;
	let purchased = postData.purchased;
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ip) {
		ip = ip.split(',')[0];
	}
	let activeId = postData.activeId;
	let deviceInfo = {
		deviceId: postData.did,
		version: postData.v || 0,
		platform: postData.pl,
		appId: postData.aid
	};

	if (postData.uc) deviceInfo.uniqueCode = postData.uc;
	if (postData.na) deviceInfo.name = postData.na;

	let apiVersion = req.headers.apiversion || 1;

	let clientId = req.authorization.basic.username;
	let clientSecret = req.authorization.basic.password;

	try {
		apiVersion = parseInt(apiVersion, 10);
	} catch (e) {
		apiVersion = 1;
	}

	Hook.validateClient(clientId, clientSecret, function (error, result) {
		if (error || !result) return sendError(Error.OAUTH_ERROR_CLIENT_SECRET_NOT_VALIDATE);

		async.waterfall([
			function (cb) {
				if (mode === 1) {
					User.findByFacebookId(fbId, function (err, user) {
						if (err) cb(Error.ERROR_SERVER);
						else {
							if (!user) cb(Error.SOCIAL_ID_NOT_FOUND);
							else cb(null, user);
						}
					});
				} else {
					User.findByGoogleId(ggId, function (err, user) {
						if (err) cb(Error.ERROR_SERVER);
						else {
							if (!user) cb(Error.SOCIAL_ID_NOT_FOUND);
							else cb(null, user);
						}
					});
				}
			},
			function (user, cb) {
				//grant token
				let info = {
					purchased: purchased,
					ip: ip,
					activeId: activeId,
					deviceInfo: deviceInfo,
					apiVersion: apiVersion
				};
				Hook.generateOauth(user, info, function (error, token, expires, user_id, purchased, acceptSync, limitDevice, pending, expireDate, firstPurchase, lastPurchase, user_email, device) {
					if (error) {
						if (error === Error.USER_DEACTIVATED) return cb(Error.USER_DEACTIVATED);
						else return cb(Error.USER_ERROR_EMAIL_OR_PASSWORD);
					}

					if (!token) return cb(Error.USER_ERROR_EMAIL_OR_PASSWORD);

					let oauth2Data = {
						status: true,
						purchased: purchased,
						access_token: token,
						expires: expires,
						token_type: "Bearer",
						user_id: user_id,
						sync: acceptSync,
						lm: limitDevice,
						pen: pending,
						ed: expireDate,
						fp: firstPurchase,
						lp: lastPurchase,
						user_email: user_email
					};

					if (device) oauth2Data.device_id = device._id;

					cb(null, oauth2Data);
				});
			}
		], function (err, result) {
			if (err) {
				sendError(err);
			} else {
				res.send(result);
			}
		});
	});
}

function socialLogin2(mode, postData, callback) {
	if (!postData || typeof postData !== "object") {
		return callback(202);
	}

	if (!postData.id) {
		return callback(Error.USER_WARNING_INFO);
	}

	let id = postData.id;
	let purchased = postData.purchased;
	let ip = postData.ip;
	if (ip) {
		ip = ip.split(',')[0];
	}
	let activeId = postData.activeId;
	let deviceInfo = {
		deviceId: postData.did,
		version: postData.v || 0,
		platform: postData.pl,
		appId: postData.aid
	};

	if (postData.uc) deviceInfo.uniqueCode = postData.uc;
	if (postData.na) deviceInfo.name = postData.na;

	let apiVersion = postData.apiversion;

	let clientId = postData.authorization.basic.username;
	let clientSecret = postData.authorization.basic.password;

	try {
		apiVersion = parseInt(apiVersion, 10);
	} catch (e) {
		apiVersion = 1;
	}

	Hook.validateClient(clientId, clientSecret, function (error, result) {
		if (error || !result) return callback(Error.OAUTH_ERROR_CLIENT_SECRET_NOT_VALIDATE);

		async.waterfall([
			function (cb) {
				let callbackFunction = function (err, user) {
					if (err) {
						cb(Error.ERROR_SERVER);
					} else {
						if (!user) {
							cb(Error.SOCIAL_ID_NOT_FOUND);
						} else {
							cb(null, user);
						}
					}
				};

				if (mode === 1) {
					User.findByFacebookId(id, callbackFunction);
				} else {
					User.findByGoogleId(id, callbackFunction);
				}
			},
			function (user, cb) {
				//grant token
				let info = {
					purchased: purchased,
					ip: ip,
					activeId: activeId,
					deviceInfo: deviceInfo,
					apiVersion: apiVersion
				};

				Hook.generateOauth(user, info, function (error, token, expires, user_id, purchased, acceptSync, limitDevice, pending, expireDate, firstPurchase, lastPurchase, user_email, device) {
					if (error) {
						if (error === Error.USER_DEACTIVATED) {
							return cb(Error.USER_DEACTIVATED);
						}

						return cb(Error.USER_ERROR_EMAIL_OR_PASSWORD);
					}

					if (!token) return cb(Error.USER_ERROR_EMAIL_OR_PASSWORD);

					let oauth2Data = {
						status: true,
						purchased: purchased,
						access_token: token,
						expires: expires,
						token_type: "Bearer",
						user_id: user_id,
						sync: acceptSync,
						lm: limitDevice,
						pen: pending,
						ed: expireDate,
						fp: firstPurchase,
						lp: lastPurchase,
						user_email: user_email
					};

					if (device) oauth2Data.device_id = device._id;

					cb(null, oauth2Data);
				});
			}
		], function (err, result) {
			callback(err, result);
		});
	});
}

function linkWithSocial(mode, req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let fbId = req.body.fbId,
		ggId = req.body.ggId,
		email = req.body.email;

	if (mode === SOCIAL.FACEBOOK) {
		if (!fbId || !email) return res.send({status: false, e: Error.PARAM_EMAIL_INVALID});
	} else {
		if (!ggId || !email) return res.send({status: false, e: Error.PARAM_EMAIL_INVALID});
	}


	function sendError(errorStatus) {
		res.send(200, {
			status: false,
			message: errorStatus
		});
	}

	function checkSocialId(mode, id, email, cb) {
		//cb(error)
		if (mode === SOCIAL.FACEBOOK) {
			User.findByFacebookId(id, function (error, user) {
				if (error) cb(Error.ERROR_SERVER);
				else {
					if (!user) cb(null);
					else if (user.email == email) cb(Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
					else cb(Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
				}
			});
		} else {
			User.findByGoogleId(id, function (error, user) {
				if (error) cb(Error.ERROR_SERVER);
				else {
					if (!user) cb(null);
					else if (user.email == email) cb(Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
					else cb(Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
				}
			});
		}
	}

	function checkEmail(mode, email, id, cb) {
		//cb(error, result)
		User.findByEmail(email, function (error, user) {
			if (error) cb(Error.ERROR_SERVER);
			else {
				if (!user) cb(Error.USER_NOT_EXIST);
				else {
					if (mode === SOCIAL.FACEBOOK) {
						if (!user.facebookId) cb(null);
						else if (!user.facebookId == id) cb(Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
						else cb(Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
					} else {
						if (!user.facebookId) cb(null);
						else if (!user.facebookId == ggId) cb(Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
						else cb(Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
					}
				}

			}
		});
	}

	async.waterfall([
		function (cb) {
			if (mode === SOCIAL.FACEBOOK) {
				checkSocialId(mode, fbId, email, function (error) {
					if (error) cb(error);
					else cb(null, fbId);
				});
			} else {
				checkSocialId(mode, ggId, email, function (error) {
					if (error) cb(error);
					else cb(null, ggId);
				});
			}
		},
		function (socialId, cb) {
			checkEmail(mode, email, socialId, function (error, user) {
				if (error) cb(error);
				else cb(null, socialId, user);
			});
		},
		function (socialId, user, cb) {
			let update;
			if (mode === SOCIAL.FACEBOOK) update = {facebookId: socialId};
			else update = {googleId: socialId};

			User.findByIdAndUpdate(user._id, update, function (err, result) {
				if (err || !result) cb(Error.ERROR_SERVER);
				else cb();
			});
		}
	], function (err, result) {
		if (err) sendError(err);
		else res.send({status: true});
	})
}

function linkWithSocial2(mode, id, email, callback) {
	function checkSocialId(mode, id, email, cb) {
		//cb(error)

		let callbackFunction = function (error, user) {
			if (error) {
				return cb(Error.ERROR_SERVER);
			}

			if (!user) {
				cb(null);
			} else if (user.email == email) {
				cb(Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
			} else {
				cb(Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
			}
		};

		if (mode === SOCIAL.FACEBOOK) {
			User.findByFacebookId(id, callbackFunction);
		} else {
			User.findByGoogleId(id, callbackFunction);
		}
	}

	function checkEmail(mode, email, id, cb) {
		//cb(error, result)
		User.findByEmail(email, function (error, user) {
			if (error) {
				return cb(Error.ERROR_SERVER);
			}

			if (!user) {
				return cb(Error.USER_NOT_EXIST);
			}

			let socialId;

			if (mode === SOCIAL.FACEBOOK) {
				socialId = user.facebookId;
			} else {
				//Google
				socialId = user.googleId;
			}

			if (!socialId) {
				cb(null, user);
			} else if (socialId == id) {
				cb(Error.SOCIAL_ID_AND_EMAIL_REGISTERED);
			} else {
				cb(Error.SOCIAL_ID_REGISTERED_WITH_ANOTHER_EMAIL);
			}
		});
	}

	async.waterfall([
		function (cb) {
			checkSocialId(mode, id, email, function (error) {
				if (error) {
					cb(error);
				} else {
					cb(null, id);
				}
			});
		},
		function (socialId, cb) {
			checkEmail(mode, email, socialId, function (error, user) {
				if (error) {
					cb(error);
				} else {
					cb(null, socialId, user);
				}
			});
		},
		function (socialId, user, cb) {
			let update;

			if (mode === SOCIAL.FACEBOOK) {
				update = {facebookId: socialId};
			} else {
				update = {googleId: socialId};
			}

			User.findByIdAndUpdate(user._id, update, cb);
		}
	], callback);
}

function activePremiumSubscription(userId, options, callback) {
	User.findById(userId, (err, user) => {
		if (err) {
			return callback(Error.ERROR_SERVER);
		}
		if (!user) {
			return callback(Error.USER_NOT_EXIST);
		}

		let now = Date.now();
		let expireUnit = options.expireUnit || config.subscriptionExpire.premium.unit;
		let expireValue = options.expireValue || config.subscriptionExpire.premium.value;
		let productId = options.productId || 'premium_sub_year_1';
		let update = {};

		if (user.purchased) {
			if (!user.expireDate) update.expireDate = moment(now).add(expireValue, expireUnit);
			if (!user.premium_at) update.premium_at = now;
			if (!user.firstPurchase) update.firstPurchase = now;
			if (!user.lastPurchase) update.lastPurchase = now;
			if (!user.subscribeMarket) update.subscribeMarket = 'Other';
			if (!user.subscribeProduct) update.subscribeProduct = productId;
		} else {
			update.purchased = true;
			update.premium_at = now;
			update.expireDate = moment(now).add(expireValue, expireUnit);
			update.firstPurchase = now;
			update.lastPurchase = now;
			update.subscribeMarket = 'Other';
			update.subscribeProduct = productId;
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

function activeLinkedWalletSubscription(userId, options, callback) {
	if (!options.expireUnit || !options.expireValue || options.productId) {
		return callback('expire number invalid');
	}

    User.findById(userId, (err, user) => {
        if (err) {
            return callback(Error.ERROR_SERVER);
        }
        if (!user) {
            return callback(Error.USER_NOT_EXIST);
        }

        let now = Date.now();
        let expireUnit = options.expireUnit;
        let expireValue = options.expireValue;
        let productId = options.productId;
        let update = {};

        if (!user.rwFirstPurchase) update.rwFirstPurchase = now;
        update.rwLastPurchase = now;
        update.rwMarket = 'Other';
        update.rwProduct = productId;
        if (!user.rwExpire) {
        	update.rwExpire = moment(now).add(expireValue, expireUnit);
		} else {
        	let expireDate = moment(user.rwExpire);

        	if (expireDate.isSameOfAfter(now)) {
        		update.rwExpire = expireDate.add(expireValue, expireUnit);
			} else {
                update.rwExpire = moment(now).add(expireValue, expireUnit);
			}
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

let appFbRegister = function (req, res) {
	// socialRegister(SOCIAL.FACEBOOK, req, res);

	let id = req.body.fbId;
	let email = req.body.fbEmail;
	let profile = req.body.fbInfo;
	let ref = req.body.ref;
	let mode = SOCIAL.FACEBOOK;
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	if (!id || !email || !profile) {
		return res.send({status: false, message: Error.PARAM_INVALID});
	}

	if (!validateEmail(email)) {
		return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}

	socialRegister2(mode, id, email, {profile: profile, ip: ip}, function (err) {
		if (err) {
			res.send({status: false, message: err});
		} else {
			res.send({status: true});
		}
	}, ref);
};

let appGgRegister = function (req, res) {
	// socialRegister(SOCIAL.GOOGLE, req, res);

	let id = req.body.ggId;
	let email = req.body.ggEmail;
	let profile = req.body.ggInfo;
	let ref = req.body.ref;
	let mode = SOCIAL.GOOGLE;
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	if (!id || !email || !profile) {
		return res.send({status: false, message: Error.PARAM_INVALID});
	}

	if (!validateEmail(email)) {
		return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}

	socialRegister2(mode, id, email, {profile: profile, ip: ip}, function (err) {
		if (err) {
			res.send({status: false, message: err});
		} else {
			res.send({status: true});
		}
	}, ref);
};

let appFbLogin = function (req, res) {
	// socialLogin(SOCIAL.FACEBOOK, req, res);

	let postData = req.body;
	let mode = SOCIAL.FACEBOOK;

	postData.id = postData.fbId;
	postData.authorization = req.authorization;
	postData.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	postData.apiversion = req.headers.apiversion || 1;

	socialLogin2(mode, postData, function (err, result) {
		if (err) {
			res.send({status: false, message: err});
		} else {
			res.send(result);
		}
	});
};

let appGgLogin = function (req, res) {
	// socialLogin(SOCIAL.GOOGLE, req, res);

	let postData = req.body;
	let mode = SOCIAL.GOOGLE;

	postData.id = postData.ggId;
	postData.authorization = req.authorization;
	postData.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	postData.apiversion = req.headers.apiversion || 1;

	socialLogin2(mode, postData, function (err, result) {
		if (err) {
			res.send({status: false, message: err});
		} else {
			res.send(result);
		}
	});
};

let appFbLink = function (req, res) {
	// linkWithSocial(SOCIAL.FACEBOOK, req, res);

	let id = req.body.fbId;
	let email = req.body.email;
	let mode = SOCIAL.FACEBOOK;

	if (!id || !email) {
		return res.send({
			status: false,
			e: Error.PARAM_EMAIL_INVALID
		});
	}

	linkWithSocial2(mode, id, email, function (error) {
		if (error) {
			res.send({status: false, message: error});
		} else {
			res.send({status: true});
		}
	});
};

let appGgLink = function (req, res) {
	// linkWithSocial(SOCIAL.GOOGLE, req, res);

	let id = req.body.ggId;
	let email = req.body.email;
	let mode = SOCIAL.GOOGLE;

	if (!id || !email) {
		return res.send({
			status: false,
			e: Error.PARAM_EMAIL_INVALID
		});
	}

	linkWithSocial2(mode, id, email, function (error) {
		if (error) {
			res.send({status: false, message: error});
		} else {
			res.send({status: true});
		}
	});
};

let initial = function (req, res) {
	res.send({status: false});
};

let register = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let postData = req.body;

	if (validatePostLogin(postData)) {
		async.waterfall([
			function (callback) { // check postData
				if (postData.email !== undefined && postData.email !== null && postData.email !== '') {
					callback(null, {status: true});
				} else callback(null, {status: false, message: 202});
			},
			function (arg, callback) { // check Email
				if (arg.status) {
					if (validateEmail(postData.email)) { //check email đúng chuẩn
						checkEmailExists(postData.email, function (status) {
							if (status) callback(null, {status: true});
							else callback(null, {status: false, message: 200});
						});
					} else callback(null, {status: false, message: Error.USER_ERROR_NOT_EMAIL});
				} else callback(null, arg);
			},
			function (arg, callback) { // check share account
				if (arg.status) {
					AccountShare.count({email: postData.email}, function (err, counter) {
						if (counter > 0) {
							arg.acceptSync = true;
							callback(null, arg);
						} else callback(null, arg);
					});
				} else callback(null, arg);
			},
			function (arg, callback) { // create User
				if (arg.status) {
					let user = new User();
					user.email = postData.email;
					user.salt = utils.uid(5);
					if (arg.acceptSync) user.acceptSync = true;
					user.hashed_password = user.encryptPassword(postData.password, user.salt);
					user.ipRegistered = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
					if (user.ipRegistered) {
						user.ipRegistered = utils.realIP(user.ipRegistered);
					}

					user.save(function (err, userInfo) {
						if (err) {
							callback(null, {status: false, message: 204});
						} else {
							if (userInfo) {
								callback(null, {status: true});

								Redeem.findEmail(userInfo.email, function (status, redeemInfo) {
									if (status) {
										User.activeUser(userInfo._id, function () {
										});
										redeemInfo.activeRedeem(function (status) {
										});
									}
								});

								let info = {
									email: userInfo.email
								};

								let item = [];

								if (postData.ref) {
									let handledTag = utils.tagHandle(postData.ref);

									if (handledTag && handledTag != 'undefined') {
										item.push(sprintf(TagsContant.REF, utils.tagHandle(postData.ref)));
									}
								}

								//detect location by ip
								if (!userInfo.ipRegistered) return;

								let location = utils.detectLocationByIp(userInfo.ipRegistered);

								if (location) {
									if (location.country) {
										item.push('country:' + location.country.toLowerCase());
										info.country = location.country.toLowerCase();
									} else {
										info.country = 'n/a';
									}

									if (location.city) item.push('city:' + location.city.toLowerCase());
								}

								if (item.length > 0) {
									User.updateTags(userInfo._id, item, function () {
									});
								}

								//Send welcome email
								Email.wellcome(info, function (status, success) {
								});
							}
							else callback(null, {status: false, message: 204});
						}
					});
				} else callback(null, arg);
			}
		], function (err, result) {
			res.send(result);
		});
	} else res.send({status: false, message: 'No data'});
};

let svPublic = function (req, res) {
	res.send({
		"resource": "is public",
		"copyright": "Money Lover"
	});
};

let secret = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({s: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let status = validateUser(req, res);

	if (!status) {
		return;
	}

	res.send({s: true, message: 'Success'});
};

let active = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}
	//let status = validateUser(req, res);
	//
	//if(!status) return;

	let postData = req.body;
	let userId = req.user_id;
	let purchased = postData.purchased;

	if (!userId) return res.send({status: false, message: Error.USER_NOT_LOGIN});

	if (userId) {
		if (purchased === true) {
			// User.activeUser(userId, function (status) {
			// 	if (status) res.send({status: true});
			// 	else res.send({status: false, message: 204});
			// });
			activePremiumSubscription(userId, {}, err => {
				if (err) {
					return res.send({status: false, message: err});
				}

				res.send({status: true});
			});
		} else {
			User.checkActiveUser(userId, function (status) {
				if (status) res.send({status: true, message: status.purchased});
				else res.send({status: false, message: 204});
			});
		}
	} else {
		res.send({status: false, message: 209});
	}
};

let login = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let postData = req.body;
	let email = postData.email;
	let password = postData.password;
	let activeId = postData.activeId;
	let purchased = postData.purchased;

	User.findByEmail(email, function (err, user) {
		if (user) {
			if (user.authenticate(password)) {
				if (purchased === true) {
					User.updateActive(activeId, email, function (status) {
					});
				}
				res.send({status: true});
			} else res.send({status: false, message: 205});
		} else res.send({status: false, message: 205});
	});
};

let forgotPassword = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	if (!req.body) {
		return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}

	let email = req.body.email;

	if (!utils.isEmail(email)) {
		return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}

	User.findByEmail(email, function (err, user) {
		if (!user) {
			return res.send({status: false, message: Error.USER_ERROR_EMAIL_NOT_EXIST});
		}

		User.generateHashPassword(user, function (user2) {
			if (!user2) {
				return res.send({status: false, message: Error.ERROR_SERVER});
			}

			Email.forgotPassword(user2, function (status, data) {

			});
			res.send({status: true});
		});
	});
};

let forgotPassword2 = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	if (!req.body) {
		return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}

	let email = req.body.email;

	if (!utils.isEmail(email)) {
		return res.send({status: false, message: Error.USER_ERROR_NOT_EMAIL});
	}
	
	function _forgotPassword(user, callback) {
		let expire = 7;
		let hashForgotPassword = generateHashForgotPassword(user, expire);
		
		savePinForgotPassword(hashForgotPassword.pin, user.email, expire, function(err, status){
			callback(err, {status: status, hashForgotPassword: hashForgotPassword});
		});
	}
	
	User.findByEmail(email, function(err, user){
		if (!user) {
			return res.send({status: false, message: Error.USER_ERROR_EMAIL_NOT_EXIST});
		}
		
		_forgotPassword(user, function(error, data){
			if (err || !data.status) {
				res.send({status: false, message: Error.ERROR_SERVER});
			} else {
				sendForgotPasswordEmail(user, data.hashForgotPassword);
				res.send({status: true});
			}
		});
	});
};

let event = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let user_id = req.user_id;
	let postData = req.body;
	let code = postData.code;
	let device = postData.platform;
	let language = postData.l;

	if (!validateCode(code)) {
		return res.send({status: false, message: Error.USER_ERROR_EMPTY_SERIALS});
	}

	code = code.toLowerCase().replace(/ /g, '');
	let query = {code: code};

	async.parallel({ // findEvent by Code
		event: function (callback) {
			Event.findEvent(query, function (result) {
				callback(null, result);
			});
		},
		active: function (callback) {
			Active.findActive(code, function (result) {
				callback(null, result);
			});
		}
	}, activeUser);

	/****FUNCTIONS****/

	function parseEvent(activeId, event, lang) {
		let tmp = {
			status: true,
			activeId: activeId.toString().toUpperCase(),
			link: event.link, name: event.name,
			description: event.description,
			linkIcon: event.link_icon,
			tw: event.twitter
		};

		if (lang && event.addLang) {
			if (lang) {
				lang = lang.toLowerCase().split('-')[0];
			}

			event.addLang.forEach(function (eventLang) {
				if (eventLang.lang == lang) {
					tmp.link = eventLang.link || event.link;
					tmp.name = eventLang.title || event.name;
					tmp.description = eventLang.description || event.description;
					tmp.linkIcon = eventLang.link_icon || event.link_icon;
					tmp.tw = eventLang.twitter || event.twitter;
				}
			});
		}

		return tmp;
	}

	function activeUser(err, result) {
		if (result.event && result.event.code) {
			oneCodeEventHandler(result.event)
		} else if (result.active) {
			multipleCodeEventHandler(result.active);
		} else {
			res.send({status: false, message: Error.USER_ERROR_SERIALS});
		}
	}

	function oneCodeEventHandler(event) {
		let checkEvent = event.validateDateEvent();

        if (checkEvent === 3) {
            return res.send({status: false, message: Error.USER_ERROR_EVENT_EXPIRE});
        }

        if (checkEvent !== 1) {
            return res.send({status: false, message: Error.USER_ERROR_SERIALS});
        }

		Active.addCode(code, true, event._id, device, function (status) {
			if (!status) {
				res.send({status: false, message: Error.ERROR_SERVER});
			}

			if (!user_id) {
				return res.send(parseEvent(status._id, event, language));
			}

			if (!event.product) return activePremiumSubscription(user_id, {}, activeOneCodeEventSuccess);

			ItemModel.findByProductId(event.product, (err, product) => {
				if (err || !product || !product.type) {
					return res.send({status: false, message: Error.ERROR_SERVER});
				}

				if (product.type === 5) return activePremiumSubscription(user_id, {}, activeOneCodeEventSuccess);
				if (product.type === 2) {
					if (product.metadata && product.metadata.type) {
						if (product.metadata.type === 'premium') {
                            let options = {
                                expireUnit: product.expire_unit,
                                expireValue: product.expire_value,
                                productId: product.product_id
                            };

							return activePremiumSubscription(user_id, options, activeOneCodeEventSuccess);
						} else if (product.metadata.type === 'linked_wallet') {
							let options = {
								expireUnit: product.expire_unit,
								expireValue: product.expire_value,
								productId: product.product_id
							};

							return activeLinkedWalletSubscription(user_id, options, activeOneCodeEventSuccess);
						}
					}
				}
			});
		});

        function activeOneCodeEventSuccess(err) {
            if (err) {
                return res.send({status: false, message: err});
            }

            User.updateTags(user_id, [sprintf(TagsContant.PURCHASE_CODE, event._id)], function () {
            });

            Event.findById(event._id, function (err, eventInfo) {
                if (!eventInfo.isUnlimited || eventInfo.codeRemain) {
                    Event.findByIdAndUpdate(event._id, {$inc: {codeRemain: -1}}, function(e,r){});
                }
            });

            res.send(parseEvent(active._id, event, language));
        }
	}

	function multipleCodeEventHandler(active) {
		let eventId = active.mlEvent;

		Event.findEvent({_id: eventId}, function (event) {
			let checkEvent = event.validateDateEvent();

            if (checkEvent === 3) {
                return res.send({status: false, message: Error.USER_ERROR_EVENT_EXPIRE});
            }

            if (checkEvent !== 1) {
                return res.send({status: false, message: Error.USER_ERROR_SERIALS});
            }


			Active.updateDevice(code, device, function (err, data, update) {
				if (!user_id) {
					return res.send(parseEvent(active._id, event, language));
				}

                if (!event.product) return activePremiumSubscription(user_id, {}, activeMultipleCodeSuccess);

                ItemModel.findByProductId(event.product, (err, product) => {
                    if (err || !product || !product.type) {
                        return res.send({status: false, message: Error.ERROR_SERVER});
                    }

                    if (product.type === 5) return activePremiumSubscription(user_id, {}, activeMultipleCodeSuccess);
                    if (product.type === 2) {
                        if (product.metadata && product.metadata.type) {
                            if (product.metadata.type === 'premium') {
                                let options = {
                                    expireUnit: product.expire_unit,
                                    expireValue: product.expire_value,
                                    productId: product.product_id
                                };

                                return activePremiumSubscription(user_id, options, activeMultipleCodeSuccess);
                            } else if (product.metadata.type === 'linked_wallet') {
                                let options = {
                                    expireUnit: product.expire_unit,
                                    expireValue: product.expire_value,
                                    productId: product.product_id
                                };

                                return activeLinkedWalletSubscription(user_id, options, activeMultipleCodeSuccess);
                            }
                        }
                    }
                });
			});
		});

		function activeMultipleCodeSuccess(err) {
            if (err) {
                res.send({status: false, message: err});
            }

            User.updateTags(user_id, [sprintf(TagsContant.PURCHASE_CODE, eventId)], function () {
            });

            res.send(parseEvent(active._id, event, language));
		}
	}
};

let svStatus = function (req, res) { // purchased, active sync
	if (global.isServerMaintain) {
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}

	let status = validateUser(req, res);

	if (!status) return;

	let user_id = req.user_id;
	let select = '-_id purchased acceptSync expireDate firstPurchase lastPurchase subscribeProduct subscribeMarket rwExpire rwMarket rwProduct rwFirstPurchase rwLastPurchase rwLimit';

	if (req.body && req.body.okget) {
		User.findById(user_id, select, function (err, userInfo) {
			if (err || !userInfo) res.send({s: false, e: Error.USER_NOT_EXIST});
			else {
				if (!userInfo.rwLimit) userInfo.rwLimit = 10;
				res.send({s: true, d: userInfo});
			}
		});
	} else {
		res.send({s: false, e: Error.SYNC_ERROR_INFO});
	}
};

let activeSync = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}

	let status = validateUser(req, res);
	if (!status) return;

	let user_id = req.user_id;

	if (req.body && req.body.okget) {
		User.acceptSync(user_id);
		res.send({s: true});
	} else {
		res.send({s: false});
	}
};

let oauth = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}

	let postData = req.body;

	User.findUser(postData.em, function (err, user) {
		if (err || !user) {
			return res.send({s: false});
		}

		User.checkPassword(user._id, postData.pw, function (status) {
			if (status) {
				res.send({s: true, gid: user._id});
			} else {
				res.send({s: false});
			}
		});
	});
};

let statusAccount = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}

	if (req.body && req.body.okget && req.user_id) {
		let user_id = req.user_id;
		Account.find({'listUser': user_id}, '_id', function (err, accounts) {
			if (err) {
				res.send({s: false});
			} else {
				if (accounts.length === 0) {
					res.send({s: true, d: []});
				} else {
					let tmpAccounts = [];
					accounts.forEach(function (acc) {
						tmpAccounts.push(acc._id);
					});
					res.send({s: true, d: tmpAccounts});
				}
			}
		});
	} else {
		res.send({s: false});
	}
};

let logout = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let body = req.body;

	async.waterfall([
		function (cb) {
			Device.findOne({deviceId: body.did})
				.populate('owner', 'email')
				.exec(function (err, device) {
					if (err) {
						cb(err);
					} else if (!device) {
						cb('DeviceNotFound');
					} else if (!device.owner) {
						cb('DeviceNotLogin');
					} else {
						cb(null, device);
					}
				});
		}, function (device, cb) {
			Device.unlinkUser(device, function (status) {
				cb(!status);
			});
		}
	], function (err) {
		res.send({status: true});
	});
};

let changePassword = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}

	let user_id = req.user_id,
		old_password = req.body.op,
		new_password = req.body.np;

	async.series({
		checkUserId: function (callback) {
			if (!user_id) {
				res.send({s: false, e: Error.USER_NOT_LOGIN});
				callback(true, 'USER_NOT_LOGIN');
			} else callback(null);
		},
		checkParams: function (callback) {
			if (old_password && new_password) callback(null);
			else {
				res.send({s: false, e: Error.PARAM_PASSWORD_INVAILD});
				callback(true, 'PARAM_PASSWORD_INVAILD');
			}
		},
		checkOldPassword: function (callback) {
			User.findById(user_id, function (err, userInfo) {
				if (err || !userInfo) {
					res.send({s: false, e: Error.PARAM_PASSWORD_INVAILD});
					callback(true, 'NO_USER_FOUND');
				} else {
					if (userInfo.authenticate(old_password)) callback(null);
					else {
						res.send({s: false, e: Error.PARAM_PASSWORD_INVAILD});
						callback(true, 'PARAM_PASSWORD_INVAILD');
					}
				}
			});
		},
		checkNewPassword: function (callback) {
			if (new_password.length < 6 || new_password === old_password) {
				res.send({s: false, e: Error.PARAM_PASSWORD_INVAILD});
				callback(true, 'PARAM_PASSWORD_INVAILD');
			} else callback(null);
		},
		genNewPassword: function (callback) {
			let new_salt = utils.uid(5);
			let new_hashed_pass = encryptPassword(new_password, new_salt);
			User.findByIdAndUpdate(user_id, {salt: new_salt, hashed_password: new_hashed_pass}, function (err, result) {
				if (err || !result) {
					res.send({s: false, e: Error.PARAM_PASSWORD_INVAILD});
					callback(true);
				} else {
					callback(null);
				}
			});
		}
	}, function (err, result) {
		if (!err) res.send({s: true});
	})
};

let deactivate = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}

	let user_id = req.user_id,
		password = req.body.pw;

	let unlinkDevices = function (devices, callback) {
		//callback true if error
		async.eachSeries(devices, function (device, cb) {
			Device.unlinkUser(device, function (status) {
				if (!status) cb(true);
				else cb(null);
			}, true);
		}, function (err) {
			if (err) callback(true);
			else callback(null);
		});
	};

	async.series({
		checkUserId: function (callback) {
			if (!user_id) {
				res.send({s: false, e: Error.USER_NOT_LOGIN});
				callback(true, 'USER_NOT_LOGIN');
			} else if (!password) {
				res.send({s: false, e: Error.PARAM_INVALID});
				callback(true, 'PARAM_INVALID');
			} else callback(null);
		},
		validatePassword: function (callback) {
			User.findById(user_id, function (err, user) {
				if (err) {
					res.send({s: false, e: Error.ERROR_SERVER});
					callback(true, 'ERROR_FIND_USER');
				} else {
					if (!user) {
						res.send({s: false, e: Error.USER_NOT_EXIST});
						callback(true, 'USER_NOT_EXIST');
					} else {
						if (user.authenticate(password)) callback(null);
						else {
							res.send({s: false, e: Error.PARAM_PASSWORD_INVAILD});
							callback(true, 'WRONG_PASSWORD');
						}
					}
				}
			});
		},
		deactivate: function (callback) {
			User.findByIdAndUpdate(user_id, {isDeactivated: true}, function (err, user) {
				if (err || !user) {
					res.send({s: false, e: Error.ERROR_SERVER});
					callback(true, 'ERROR_DEACTIVATE');
				} else callback(null);
			});
		},
		unlinkDevices: function (callback) {
			Device.find({owner: user_id})
				.select('-_id owner deviceId platform tokenDevice appId')
				.populate('owner', 'email')
				.lean(true)
				.exec(function (e, devices) {
					if (e || !devices || devices.length === 0) {
						res.send({s: false, e: Error.ERROR_SERVER});
						callback(true, 'GET_DEVICE_ERROR');
					} else {
						unlinkDevices(devices, function (err) {
							if (err) {
								res.send({s: false, e: Error.CAN_NOT_CHANGE_DEVICE});
								callback(true, 'ERROR_UNLINK_DEVICES');
							}
							else callback(null);
						})
					}
				});
		}
	}, function (error, results) {
		if (!error) res.send({s: true});
	});
};

let reactivate = function (req, res) {
	if (global.isServerMaintain) {
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}

	let email = req.body.em;

	if (!email) {
		res.send({status: false, message: Error.PARAM_INVALID});
	} else {
		User.findByEmail(email, function (err, user) {
			if (err) {
				res.send({status: false, message: Error.ERROR_SERVER});
			} else {
				if (!user || user === {}) {
					res.send({status: false, message: Error.PARAM_EMAIL_INVALID});
				} else {
					user.isDeactivated = false;
					user.save(function (e, r) {
						if (e || !r) res.send({status: false, message: Error.ERROR_SERVER});
						else res.send({status: true});
					});
				}
			}
		});
	}
};

let appSigninInfo = function (req, res) {
	let postData = req.body;

	if (!postData.did || !postData.pl || !postData.aid) {
		return res.send({s: false, e: Error.PARAM_INVALID});
	}

	let purchased = postData.purchased;
	//let lang = postData.lang;
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ip) {
		ip = ip.split(',')[0];
	}

	let activeId = postData.activeId;

	let deviceInfo = {
		deviceId: postData.did,
		version: postData.v || 0,
		platform: postData.pl,
		appId: postData.aid
	};

	if (postData.uc) deviceInfo.uniqueCode = postData.uc;
	if (postData.na) deviceInfo.name = postData.na;

	let info = {
		userId: req.user_id,
		purchased: purchased,
		ip: ip,
		activeId: activeId,
		deviceInfo: deviceInfo,
		token: req.tokenDevice,
		ref: postData.ref
	};

	Hook.updateSignInInfo(info, function (err, result) {
		if (err) {
			return res.send({s: false, e: Error.ERROR_SERVER});
		}

		let data = {
			s: true,
			purchased: result.purchased,
			user_id: result.user_id,
			sync: result.acceptSync,
			lm: result.limitDevice,
			pen: result.pending,
			ed: result.expireDate,
			fp: result.firstPurchase,
			lp: result.lastPurchase,
			user_email: result.email,
			finsify_id: result.finsify_id
		};

		if (result.device) {
			data.device_id = result.device._id;
		}

		res.send(data);
	});
};

module.exports = function (server, config) {
	//let config_path = config.root + '/config';
	let routes_path = config.root + '/route';

	server.pre(function (req, res, next) {
		if (req.url === '/') {
		} else if (req.url === '/public') {
		} else if (req.url === '/token') {
			return next();
		}
		req.headers.accept = 'application/json';
		return next();
	});

	// Define entry points
	let RESOURCES = Object.freeze({
		INITIAL: "/",
		REGISTER: "/register",
		TOKEN: "/token",
		PUBLIC: "/public",
		SECRET: "/secret",
		FORGOTPASSWORD: '/forgot-password',
		LOGIN: '/login',
		EVENT: '/event',
		ACTIVE: '/active',
		STATUS: '/status',
		LOGOUT: '/logout',
		OAUTH: '/oauth',
		ACTIVESYNC: '/active-sync',
		STATUS_ACCOUNT: '/status-account',
		CHANGE_PASSWORD: '/change-password',
		DEACTIVATE: '/deactivate',
		REACTIVATE: '/reactivate',
		RENEWSUBSCRIPTION: '/subscribe',
		SUBSCRIPTION_CODE: '/subscription-code',
		FB_REGISTER: '/facebook-register',
		FB_LOGIN: '/facebook-login',
		FB_LINK: '/link-with-facebook',
		GG_REGISTER: '/google-register',
		GG_LOGIN: '/google-login',
		GG_LINK: '/link-with-google',
		SIGNIN_INFO: '/signin-info'
	});

	server.get(RESOURCES.INITIAL, initial);
	server.post(RESOURCES.REGISTER, register);
	server.get(RESOURCES.PUBLIC, svPublic);
	server.get(RESOURCES.SECRET, secret);
	server.post(RESOURCES.ACTIVE, active);
	server.post(RESOURCES.LOGIN, login);
	server.post(RESOURCES.FORGOTPASSWORD, forgotPassword2);
	server.post(RESOURCES.EVENT, event);
	server.post(RESOURCES.STATUS, svStatus);
	server.post(RESOURCES.ACTIVESYNC, activeSync);
	server.post(RESOURCES.OAUTH, oauth);
	server.post(RESOURCES.STATUS_ACCOUNT, statusAccount);
	server.post(RESOURCES.LOGOUT, logout);
	server.post(RESOURCES.CHANGE_PASSWORD, changePassword);
	server.post(RESOURCES.DEACTIVATE, deactivate);
	server.post(RESOURCES.REACTIVATE, reactivate);
	server.post(RESOURCES.FB_LOGIN, appFbLogin);
	server.post(RESOURCES.GG_LOGIN, appGgLogin);
	server.post(RESOURCES.FB_REGISTER, appFbRegister);
	server.post(RESOURCES.GG_REGISTER, appGgRegister);
	server.post(RESOURCES.FB_LINK, appFbLink);
	server.post(RESOURCES.GG_LINK, appGgLink);
	server.post(RESOURCES.SIGNIN_INFO, appSigninInfo);

	require(routes_path + '/user')(server, config);
	require(routes_path + '/sync')(server, config);
	require(routes_path + '/syncv2')(server, config);
	require(routes_path + '/statics')(server, config);
	require(routes_path + '/device')(server, config);
	require(routes_path + '/invited')(server, config);
	require(routes_path + '/wns')(server, config);
	require(routes_path + '/upload')(server, config);
	require(routes_path + '/event')(server, config);
	require(routes_path + '/purchasedstat')(server, config);
	require(routes_path + '/bankmsg')(server, config);
	require(routes_path + '/openedLog')(server, config);
	require(routes_path + '/helpdesk')(server, config);
	require(routes_path + '/widget')(server, config);
	require(routes_path + '/store')(server, config);
	require(routes_path + '/report')(server, config);
	require(routes_path + '/log_sync')(server, config);
	require(routes_path + '/remote_wallet')(server, config);
	require(routes_path + '/notif')(server, config);
	require(routes_path + '/subscription')(server, config);
	require(routes_path + '/phone')(server, config);
	require(routes_path + '/receipt')(server, config);
	require(routes_path + '/items')(server, config);
	require(routes_path + '/finsify')(server, config);

	// New auth with JWT
	require(routes_path + '/auth')(server, config);


	if (config.isDev) require(routes_path + '/info')(server, config);
};
