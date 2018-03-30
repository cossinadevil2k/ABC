/*
	Account
*/

'use strict';

var mongoose		= require('mongoose');
var Account			= mongoose.model('Account');
var AccountShare	= mongoose.model('AccountShare');
var Category		= mongoose.model('Category');
var Balance			= mongoose.model('Balance');
var User			= mongoose.model('User');
var Permission		= require('../../model/permission');
var Email			= require('../../model/email');
var Notify			= require('../../model/sync/newhook');
var Error			= require('../../config/error');
var utils			= require('../../helper/utils');
var async			= require('async');
var SyncAccount		= require('../../model/sync/account').SyncAccount;
var SyncCodes 		= require('../../config/sync_codes');
var SyncFlags		= require('../../config/sync_contant');
var RequestActions	= require('./actions');

var msgSuccess = function(msg, attr, action) {
	msg = msg || '';
	let returnData = {error: 0, msg: msg};

	if (attr) {
		returnData.data = attr;
	}

	if (action) {
		returnData.action = action;
	}

	return returnData;
};

var msgError = function(msg, action){
	msg = msg || '';
	let returnData = {error: 1, msg: msg};

	if (action) {
		returnData.action = action;
	}

	return returnData;
};

var addAccount = function(req, res){
    var accountInfo  = req.body;
	var userId = req.session.userId;

	function checkWalletExists(callback){
		Account.checkAccountExists(userId, accountInfo.name, function(status){
			if (status) {
				callback('wallet_w_account_exists');
			} else {
				callback();
			}
		});
	}

	function createWallet(callback){
		let dataAccount = {};

		dataAccount.name = accountInfo.name;
		dataAccount.currency_id = parseInt(accountInfo.currency_id, 10);
		dataAccount.icon = accountInfo.icon;

		Account.createAccount(dataAccount, userId, function(result){
			if(result) {
				callback(result);
			}
			else {
				callback('wallet_e_created');
			}
		});
	}

	function setDefaultCategory(wallet, callback){
		Category.generateDefaultCategory(wallet._id, function(){
			callback(null, wallet);
		});
	}
	
	function setPermission(wallet, callback){
		Permission.setAccountPermission(userId, wallet._id, true, true, function(status){
			if(status) {
				callback(null, wallet);
			} else {
				callback('wallet_e_created2');
			}
		});
	}

	async.waterfall([
		checkWalletExists,
		createWallet,
		setDefaultCategory,
		setPermission
	], function(error, wallet){
		if (error) {
			res.send(msgError(error, RequestActions.wallet_create));
		} else {
			if (wallet) {
				sendNoti(userId, wallet._id);

				res.send(msgSuccess('wallet_e_create_success', null, RequestActions.wallet_create));
			}
		}
	});
};

var getAccountList = function(req, res){
    var user_id = req.session.userId;

    Account.getAccountListByUserId(user_id, function(data){
        res.json({
			error: 0,
			data: data,
			action: RequestActions.wallet_list
		});
    });
};

var appUpdate = function(req, res){

};

var appDelete = function(req, res){

};

var sendNoti = function(userId, walletId){
    var info = {
        user_id: userId,
        account_id: walletId
    };

    var hook = new Notify(info);

	var push = function(code){
		var listSkipGetUser = [
			SyncCodes.BUDGET,
			SyncCodes.CAMPAIGN,
			SyncCodes.WALLET + SyncFlags.FLAG_ADD
		];

		var skipGetListUser = listSkipGetUser.indexOf(code) != -1;

		var promise = new Promise(function(resolve, reject){
			hook.send({f: code}, skipGetListUser, function(err, data){
				if (!err) {
					resolve();
				} else {
					reject('push_notification_failed');
				}
			}, walletId, false);
		});

		return promise;
	};

	push(SyncCodes.WALLET)
		.then(function(){
			push(SyncCodes.CATEGORY);
		})
		.then(function(){

		})
		.catch(function(error){

		})
};

module.exports = function(app){
    app.post('/api/account/list', getAccountList);
	app.post('/api/account/add', addAccount);
    // app.post('/api/account/update', appUpdate);
    // app.post('/api/account/delete', appDelete);
    // app.get('/account/invite/:token', appActiveShare);
};
