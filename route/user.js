'use strict';

const env = process.env.NODE_ENV;
const config = require('../config/config')[env];
const mongoose = require('mongoose');
const restify = require('restify');
const User = mongoose.model('User');
const Error = require('../config/error');
const utils = require('../helper/utils');
const crypto = require('crypto');
const async = require('async');
const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const sprintf	= require("sprintf-js").sprintf;
let walletBalanceCalculator = require('../helper/wallet-balance');

//let Notify = require('../model/sync/newhook');
let PushController = require('../model/sync/push_controller');
let Permission = require('../model/permission');
let WalletModel = mongoose.model('Account');
let CategoryModel = mongoose.model('Category');
let ProviderModel = mongoose.model('Provider');
let TransactionModel = mongoose.model('Transaction');
let UseCreditModel = mongoose.model('UseCredit');
let PremiumLogModel = mongoose.model('PremiumLog');

const TagConstant = require('../config/tag_constant');
const SyncCodes = require('../config/sync_codes');
const SyncFlags = require('../config/sync_contant');
const iconRootUrlProduction = 'https://static.moneylover.me/img/icon';
const iconRootUrlDev = 'https://statictest.moneylover.me/img/icon';

const currencyFilePath = config.root + '/landing-page/data/currency.json';

function validateUser(req, res) {
	if (!req.user_id) {
		return res.sendUnauthorized();
	}
}

function checkServerMaintainWithLogedInUser(req, res, next){
	if (global.isServerMaintain){
		res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	} else next();
}

function callFetchRemoteWallet(login_id){
	let hookUrl = '';

	if (env === 'production') {
		hookUrl = 'hook.moneylover.me';
	} else {
		hookUrl = 'thook.moneylover.me';
	}

	let post_data = querystring.stringify({
		'login_id': login_id
	});

	let post_options = {
		host: hookUrl,
		port: '443',
		path: '/finsify/notify',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	};

	let request = https.request(post_options, function(response){
		let dataResult = '';
		response.setEncoding('utf8');
		response.on('data', function(chunk){
			dataResult += chunk;
		});

		response.on('end', function(){
			
		});
	});

	request.write(post_data);
	request.end();
}

let sendNoti = function(userId, walletId){
	PushController.pushSyncNotification({
		user_id: userId,
		wallet_id: walletId,
		flag:SyncCodes.WALLET + SyncFlags.FLAG_ADD,
		tokenDevice: 'moneyconnect'
	});
};

function getProviderInfo(code){
	return new Promise(function(resolve, reject){
		ProviderModel.findOne({code: code})
			.select('name code is_free hasBalance')
			.exec(function(err, result){
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
	});
}

let updateUserInfo = function(req, res){
	let user_id = req.user_id;
	if (!user_id) return res.send({s: false, e: Error.USER_NOT_LOGIN});

	let info = req.body.info,
		social_source = req.body.from;
	if (!info || !social_source) return res.send({s: false, e: Error.PARAM_INVALID});

	User.updateUserInfo(user_id, social_source, function(err){
		if (err) {
			if (err === Error.PARAM_INVALID) res.send({s: false, e: err});
			else res.send({s: false, e: Error.ERROR_SERVER});
		} else res.send({s: true});
	});
};

let getDiscount = function(req, res){
	let user_id = req.user_id;

	if (!user_id) return res.json({s: false, e: Error.USER_NOT_LOGIN});

	User.getDiscountByUserId(user_id, function(err, discount){
		if (err) res.json({s: false, e: err});
		else res.json({s: true, d: discount});
	});
};

let getFinsifyCustomerId = function(req, res){

	let user_id = req.user_id;

	if (!user_id) {
		return res.send({s: false, e: Error.USER_NOT_LOGIN});
	}

	User.findById(user_id, 'client_setting', function(err, userInfo){
		if (err) {
			res.send({s: false, e: Error.ERROR_SERVER});
		} else {
			let data = {
				s: true
			};

			if (!userInfo || !userInfo.client_setting || !userInfo.client_setting.fi_id) {
				data.d = '';
			} else {
				data.d = userInfo.client_setting.fi_id;
			}

			res.send(data);
		}
	});
};

let walletCreate = function(req, res){
	let userId = req.user_id;
	let accountInfo = req.body;
	
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	ip = utils.realIP(ip);

	if (!userId) {
		return res.send({s: false, e: Error.USER_NOT_LOGIN});
	}

	if (!accountInfo || !accountInfo.name || !accountInfo.icon || !accountInfo.currency) {
		return res.send({s: false, e: Error.PARAM_INVALID});
	}

	function generateWalletInfo(accountInfo){
		let metadata = {};
		let dataAccount = {};

		if (accountInfo.walletId) {
			dataAccount._id = accountInfo.walletId;
		}

		dataAccount.name = accountInfo.name;
		dataAccount.currency_id = parseInt(accountInfo.currency_id, 10);
		dataAccount.icon = accountInfo.icon;
		dataAccount.account_type = accountInfo.type || 0;
		dataAccount.transaction_notification = accountInfo.notification || false;
		dataAccount.exclude_total = accountInfo.exclude_total || false;
		dataAccount.rwInfo = {};
		dataAccount.rwInfo.balance = accountInfo.balance || 0;
		metadata.balance = accountInfo.balance || 0;
		dataAccount.balance = accountInfo.balance || 0;

		if (accountInfo.login_id) {
			dataAccount.rwInfo.login_id = accountInfo.login_id;
			metadata.login_id = accountInfo.login_id;
		}

		if (accountInfo.secret) {
			dataAccount.rwInfo.secret = accountInfo.secret;
			metadata.secret = accountInfo.secret;
		}

		if (accountInfo.lw_id) {
			dataAccount.rwInfo.acc_id = accountInfo.lw_id;
			metadata.acc_id = accountInfo.lw_id;
		}

		return new Promise(function(resolve, reject){
			if (accountInfo.provider) {
				getProviderInfo(accountInfo.provider)
					.then(function(providerInfo){
						metadata.p_code = providerInfo.code;
						metadata.p_name = providerInfo.name;
						metadata.is_free = providerInfo.is_free;
						metadata.hasBalance = providerInfo.hasBalance;

						dataAccount.rwInfo.p_code = providerInfo.code;

						dataAccount.metadata = JSON.stringify(metadata);

						resolve(dataAccount);
					}).catch(function(error){
						reject(error);
					});
			} else {
				dataAccount.metadata = JSON.stringify(metadata);
				resolve(dataAccount);
			}
		});
	}

	function checkWalletExists(callback){
		WalletModel.checkAccountExists(userId, accountInfo.name, function(status){
			if (status) {
				callback();
			} else {
				callback('WalletExists');
			}
		});
	}

	function createWallet(callback){
		generateWalletInfo(accountInfo)
			.then(function(dataAccount){
				WalletModel.createAccount(dataAccount, userId, function(result){
					if (result) {
						callback(null, result);
					} else {
						callback('CreateWalletFailed');
					}
				});
			}).catch(function(error){
				callback(error);
			});
	}

	function createDefaultCategory(walletInfo, callback){
		CategoryModel.generateDefaultCategory(walletInfo._id, function(err){
			callback(err, walletInfo);
		});
	}

	function setPermission(walletInfo, callback){
		Permission.setAccountPermission(userId, walletInfo._id, true, true, function(status){
			if (status) {
				callback(null, walletInfo);
			} else {
				callback('SetPermissionFailed');
			}
		});
	}

	function convertCurrencyCodeToId(currency_code){
		currency_code = currency_code.toUpperCase();
		let currencyData = fs.readFileSync(currencyFilePath);
		currencyData = JSON.parse(currencyData.toString());

		for (let i = 0; i < currencyData.data.length; i++) {
			if (currencyData.data[i].c === currency_code) {
				return currencyData.data[i].i;
			}
		}
	}

	//handle currency
	let currencyId = parseInt(accountInfo.currency, 10);
	if (isNaN(currencyId)) {
		accountInfo.currency_id = convertCurrencyCodeToId(accountInfo.currency);
	} else {
		accountInfo.currency_id = currencyId;
	}


	async.waterfall([
		//checkWalletExists,
		createWallet,
		createDefaultCategory,
		setPermission
	], function(error, walletInfo){
		if (error) {
			res.send({s: false, e: error});
		} else {
			res.send({s: true, d: {
				wallet_id: walletInfo._id,
				wallet_name: walletInfo.name,
				wallet_icon: ((env === 'production') ? iconRootUrlProduction : iconRootUrlDev) + '/' + walletInfo.icon + '.png'
			}});

			sendNoti(userId, walletInfo._id);

			if (accountInfo.fetchTransaction && walletInfo.rwInfo && walletInfo.rwInfo.login_id) {
				callFetchRemoteWallet(walletInfo.rwInfo.login_id);
			}
			
			let tags = [TagConstant.DEVICE_CONNECT];
			tags.push(sprintf(TagConstant.LOCATION_COUNTRY, utils.detectLocationByIp(ip)));
			User.updateTags(userId, [TagConstant.DEVICE_CONNECT], function(){});
		}
	});
};

let pushFinsifyCustomerId = function(req, res){
	let user_id = req.user_id;
	let fi_id = req.body.fi_id;

	if (!user_id) {
		return res.send({s: false, e: Error.USER_NOT_LOGIN});
	}

	if (!fi_id) {
		return res.send({s: false, e: Error.PARAM_INVALID});
	}

	User.findById(user_id, 'client_setting', function(err, userInfo){
		if (err) {
			return res.send({s: false, e: Error.ERROR_SERVER});
		}

		if (!userInfo.client_setting) {
			userInfo.client_setting = {};
		}

		userInfo.client_setting.fi_id = fi_id;

		User.findByIdAndUpdate(user_id, {client_setting: userInfo.client_setting}, saveUserCallback);
	});

	function saveUserCallback(err, result){
		if (err) {
			res.send({s: false, e: Error.ERROR_SERVER});
		} else {
			res.send({s: true});
		}
	}
};

let walletBalance = function(req, res) {
	let walletId = req.body.walletId;
	let future_included = req.body.future || false;
	
	if (!walletId) return res.send({s: false, e: Error.PARAM_INVALID});
	
	walletBalanceCalculator(walletId, future_included, WalletModel, TransactionModel)
		.then((result) => {
			res.send({s: true, d: result});
		})
		.catch((err) => {
			res.send({s: false, e: Error.ERROR_SERVER});
		});
};

let appUserCredit = function(req, res){
	let user_id = req.user_id;

	if (!user_id) {
		return res.json({s: false, e: Error.USER_NOT_LOGIN})
	}

	UseCreditModel.getUseCreditUser(user_id, (err, credits) => {
		if (err) {
			console.log(err);
			return res.json({s: false, e: Error.ERROR_SERVER});
		}

		res.json({s: true, credits: credits});
	});
};

module.exports = function(server, config) {
	server.get('api/V1/user', function(req, res, next) {
		validateUser(req, res);

		User.findById(req.user_id, function(err, user) {
			if (err || !user) {
				return next(new restify.InvalidCredentialsError("Invalid Credentials"));
			} else {
				res.send(user);
				return next();
			}
		});
	});

	server.post('/user/update-social-info', checkServerMaintainWithLogedInUser, updateUserInfo);
	server.post('/user/get-discount', getDiscount);
	server.post('/user/get-finsify-id', getFinsifyCustomerId);
	server.post('/user/wallet/create', walletCreate);
	server.post('/user/push-finsify-id', pushFinsifyCustomerId);
	server.post('/user/wallet/balance', walletBalance);
	server.post('/user/credit', appUserCredit);
};
