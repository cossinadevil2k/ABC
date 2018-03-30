"use strict";

let env = process.env.NODE_ENV;
let mongoose = require('mongoose');
// let _ = require("underscore");
let moment = require('moment');
let crypto = require("crypto");
let Client = mongoose.model('ClientKey');
//let Token = mongoose.model('AuthToken');
let User = mongoose.model('User');
let Device = mongoose.model('Device');
let AccountShare = mongoose.model('AccountShare');
let Database = require('./database');
let redisClient = Database.redisClient;
let async = require('async');
let timeExpire = 604800; // 7 days = 604800 seconds
let Error = require('./error');
let sprintf = require("sprintf-js").sprintf;
let TagConstant = require('./tag_constant');
let utils = require('../helper/utils');
let config = require('./config')[env];

function activeUserPremium(userId) {
    return new Promise((resolve, reject) => {
        let today = moment();
        let expire = moment().add(config.subscriptionExpire.premium.value, config.subscriptionExpire.premium.unit);

        let update = {
            $set: {
                purchased: true,
                premium_at: today,
                expireDate: expire,
                firstPurchase: today,
                lastPurchase: today,
                subscribeProduct: 'premium_sub_year_1',
                subscribeMarket: 'Other'
            }
        };

        User.findByIdAndUpdate(userId, update, err => {
            return err ? reject(err) : resolve();
        });
    });
}

function generateToken(data) {
	let random = Math.floor(Math.random() * 100001);
	let timestamp = (new Date()).getTime();
	let sha256 = crypto.createHmac("sha256", random + "BOO" + timestamp);
	let hash64 = sha256.update(data).digest("base64");
	return hash64.replace('\\', '/');
}

function generateExpire(){
	return (new Date().getTime() + (timeExpire * 1000));
}

function generateKey(token, version){
	return (token + ':' + version);
}

function createToken(user_id, token, version, cb){
	let expire = 0;
	// let newToken = new Token({
	// 	user_id: user_id,
	// 	token: token,
	// 	version: version,
	// 	expire: expire
	// });
	// newToken.save();

	if (version === 2 || version === 3) {
		let tokenKey = generateKey(token, version);
		
		expire = generateExpire();
		redisClient.set(tokenKey, user_id.toString());
		redisClient.EXPIRE(tokenKey, timeExpire);
	} else {
		redisClient.set(token, user_id.toString());
	}
	
	cb(null, {s: true, exp: expire});
}

function genToken(user_id, token, oauthVersion, cb){
	createToken(user_id, token, oauthVersion, cb);
}

function generateOauth(user, info, callback){
	let user_id = user._id;
	let token = generateToken(user_id + ":" + user.email);
	let newPurchased = false;
	info.deviceInfo.tokenDevice = token;
	info.deviceInfo.owner = user_id;

	async.waterfall([
		function(cb){
			Device.mergeToken(info.deviceInfo, function(err, lockSync, device){
				if (err) {
					cb(err);
				} else {
					cb(null, {status: lockSync, device: device});
				}
			}, true);
			// Device.mergeToken(deviceInfo, function(lockSync){
			// 	cb(null, {status: lockSync});
			// }, user.acceptSync);
		},
		function(arg, cb){
			async.parallel({
				saveToken: function(cb){
					genToken(user_id, token, info.apiVersion, cb);
					user.updateLastLogin(info.ip, info.activeId);
				},
				getPending: function(cb){
					AccountShare.countShare(user.email, function(err, counter){
						if(counter) cb(null, true);
						else cb(null, false);
					});
				},
				purchased: function(cb){
					if (info.purchased === true) {
						// User.activeUser(user._id, function(){});
                        activeUserPremium(user._id);
						newPurchased = true;
					} else {
						newPurchased = user.purchased;
					}
					cb(null, newPurchased);
				}
			}, function(err, results){
				cb(null, {
					status: true,
					expire: results.saveToken.exp,
					purchased: results.purchased,
					pending: results.getPending,
					limitDevice: arg.status,
					device: arg.device
				});
			});
		}
	], function(err, results){
		if(results.status){
			callback(null, token, results.expire, user_id, results.purchased, user.acceptSync, results.limitDevice, results.pending, user.expireDate, user.firstPurchase, user.lastPurchase, user.email, results.device);
		} else callback(null, true, 0);
	});
}

exports.updateSignInInfo = function (info, callback) {
	let token = info.token;
	let newPurchased = false;

	async.waterfall([
		function (cb) {
			User.findById(info.userId, function(err, user){
				cb(err, user);
			});
		},
		function (user, cb) {
			info.deviceInfo.tokenDevice = token;
			info.deviceInfo.owner = user._id;

			Device.mergeToken(info.deviceInfo, function(err, lockSync, device){
				cb(err, {status: lockSync, device: device, user: user});
			}, true);
		},
		function (arg, cb) {
			async.parallel({
				updateLastLogin: function (done) {
					arg.user.updateLastLogin(info.ip, info.activeId);
					done();
				},
				getPending: function (done) {
					AccountShare.countShare(arg.user.email, function(err, counter){
						if (counter) {
							done(null, true);
						} else {
							done(null, false);
						}
					});
				},
				purchased: function (done) {
					if (info.purchased === true) {
						User.activeUser(arg.user._id, function(){});
						newPurchased = true;
					} else {
						newPurchased = arg.user.purchased;
					}

					done(null, newPurchased);
				}
			}, function(err, results){
				cb(null, {
					status: true,
					purchased: results.purchased,
					pending: results.getPending,
					limitDevice: arg.status,
					device: arg.device,
					user: arg.user
				});

				if (info.ref) {
					let handledTag = utils.tagHandle(info.ref);

					if (handledTag && handledTag != 'undefined') {
						User.updateTags(arg.user._id, [sprintf(TagConstant.REF, handledTag)], function(){

						});
					}

				}
			});
		}
	], function(err, results){
		if (err) {
			callback(err);
		} else if (results.status){
			let data = {
				token: token,
				user_id: results.user._id,
				purchased: results.purchased,
				acceptSync: results.user.acceptSync,
				limitDevice: results.limitDevice,
				pending: results.pending,
				expireDate: results.user.expireDate,
				firstPurchase: results.user.firstPurchase,
				lastPurchase: results.user.lastPurchase,
				email: results.user.email,
				device: results.device,
				finsify_id: results.user.finsify_id
			};

			callback(null, data);
		} else {
			callback();
		}
	});
};

exports.validateClient = function(clientId, clientSecret, cb) {
	// Call back with `true` to signal that the client is valid, and `false` otherwise.
	// Call back with an error if you encounter an internal server error situation while trying to validate.

	Client.findOne({
		client: clientId,
		secret: clientSecret
	}, function(err, client) {
		if (err) cb(null, false);
		else {
			if (!client) cb(null, false);
			else {
				if (client.isDisabled) cb(null, false);
				cb(null, true);
			}
		}
	});
};

exports.grantUserToken = function(info, cb) {
	User.userLogin(info.email, info.password, function(err, user){
		if (err || !user) {
			if (err === 904) cb(904, false);
			else cb(null, false);
		} else {
			generateOauth(user, info, cb);
		}
	});
};

exports.generateOauth = generateOauth;

exports.authenticateToken = function(token, oauthVersion, cb) {
	// Query the Redis store for the Auth Token
	if(oauthVersion === 2){
		let tokenKey = generateKey(token, oauthVersion);
		redisClient.get(tokenKey, function(err, reply) {
			if (err) return cb(true, Error.ERROR_SERVER);
			else if(!err && !reply) return cb(true, Error.OAUTH_EXPIRE);
			else return cb(false, reply);
		});
	} else {
		redisClient.get(token, function(err, reply) {
			if (err) return cb(true, Error.ERROR_SERVER);
			else if(!err && !reply) return cb(true, Error.OAUTH_EXPIRE);
			else return cb(false, reply);
		});
	}

};

exports.validateCSRF = function(req, res, next) {
	if (!req.cookies['XSRF-TOKEN']) {
		res.cookie('XSRF-TOKEN', req.csrfToken());
	} else {
		if (req.headers['x-xsrf-token'] === req.cookies['XSRF-TOKEN']) res.cookie('XSRF-TOKEN', req.csrfToken());
	}
	next();
};

exports.loginChecker = function(req, res, next) {
	let user_id = req.session.userId;
	let getIndexApi = req.url.indexOf('/api/');

	if (!user_id) res.cookie('userLogin', 0, {
		maxAge: 0,
		path: '/'
	});

	if (getIndexApi === 0 && !user_id) res.send({error: 401, msg:"session_expired"});
	else next();
};

exports.cleanError = function(err, req, res, next) {
	if (err) {
		res.sendStatus(err.status);
	} else next();
};

exports.validatePostData = function(req, res, next) {
	if (req.method.toString().toLowerCase() === 'post') {
		if (req.body) {
			return next();
		}

		res.send({
			status: false,
			msg: 'No data'
		});
	} else {
		next();
	}
};

global.staticsMain = function(req, res){
	res.render('index', {env: env},function(err, html){
		if(err){
			console.log(err);
			res.send(500, 'Internal Server Error');
		}
		else res.send(html);
	});
};
global.staticsMain2 = function(req, res){
	res.render('app/index', function(err, html){
		if(err){
			console.log(err);
			res.send(500, 'Internal Server Error');
		}
		else res.send(html);
	});
};

global._CONFIG = config;
