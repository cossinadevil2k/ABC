/*
	Account
*/

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

var addDefaultCategory = function addDefaultCategory(account, callback){
	Category.generateDefaultCategory(account._id, callback);
};

var addAccount = function(req, res){
	var accountInfo  = req.body.walletInfo;
	var userId = req.session.userId;

	async.waterfall([
		function(callback){ // Account Exists
			Account.checkAccountExists(userId, accountInfo.name, function(status){
				if(status) callback(null, true);
				else callback(null, false);
			});
		},
		function(arg, callback){ // Create Account
			if(arg) {
				var dataAccount = {};
				dataAccount.name = accountInfo.name;
				dataAccount.currency_id = parseInt(accountInfo.currency.currency_id, 10);

				Account.createAccount(dataAccount, userId, function(result){
					if(result != false) {
                        callback(null, utils.msgSuccess('wallet_e_create_success', result));
                    }
					else callback(null, utils.msgError('wallet_e_created'));
				});
			} else callback(null, utils.msgError('wallet_w_account_exists'));
		},
		function(arg, callback){ // Set default Category
            if(arg.error === 0){
				Category.generateDefaultCategory(arg.data._id, function(){
					callback(null, arg);
				});
			} else callback(null, arg);
		},
		function(arg, callback){ // Set permission
			if(arg.error === 0){
				Permission.setAccountPermission(userId, arg.data._id, true, true, function(status){
					if(status) callback(null, arg);
					else callback(null, utils.msgError('wallet_e_created2'));
				});
			} else callback(null, arg);
		},
		function(arg, callback){ // Set default Account
            if(arg.error === 0){
				if(accountInfo.default === true){
					User.setSelectedAccount(userId, arg.data._id, function(){
						callback(null, arg);
					});
				} else callback(null, arg);
			} else callback(null, arg);
		}
	], function(err, result){
        res.send(result);
	});
};

var getBalance = function(req, res){
	var account_id = req.params.account_id;

	Balance.getBalance(account_id, function(err, data){
		if(err) res.json(false);
		else res.json(data);
	});
};

var getAccountList = function(req, res){
    var user_id = req.session.userId;

    Account.getAccountListByUserId(user_id, function(data){
        res.json(data);
    });
};

var appActiveShare = function(req, res){
	var token = req.params.token;
	async.waterfall([
		function(callback){
			if (!token) callback(null, false);
			else callback(null, true);
		},
		function(status, callback){
			if(status){
				AccountShare.findShare(token, function(err, info){
					if(err || !info) callback(true, null);
					else {
						User.checkExist(info.email, function(status, info2){
							if(status){
								req.body = {sc: token, s: true};
								req.user_id = info2._id;
								var syncAccount = new SyncAccount(req);
								syncAccount.acceptShare(req, function(status, err){
									if(status) callback(false, { email: info.email, wallet: info.account.name });
									else callback(true, {email: null, wallet: null});
								}, Notify, Permission, Email, AccountShare, Error);
							} else {
								callback(true, true);
							}
						});
					}
				});
			} else callback(true, false);
		}
	], function(err, result){
		if(result === true){
			req.session.nextPage = req.url;
			res.render('share2', {}, function(err, html){
				res.send(html);
			});
		} else {
			res.render('share', {
				shareStatus: !err,
				email: result.email,
				wallet: result.wallet
			}, function(err, html){
				res.send(html);
			});
		}
	});
};

module.exports = function(app, config){
    app.get('/api/account/list', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/account/add', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/account/balance', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/account/invite/:token', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/wallet-manager', function(req,res){res.redirect('https://web.moneylover.me')});
};