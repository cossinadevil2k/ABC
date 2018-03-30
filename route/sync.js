'use strict';

let SyncAccount = require('../model/sync/account').SyncAccount;
let SyncBalanceAccount = require('../model/sync/account_balance').SyncBalanceAccount;
let SyncCategory = require('../model/sync/category').SyncCategory;
let SyncBudget = require('../model/sync/budget').SyncBudget;
let SyncCampaign = require('../model/sync/campaign').SyncCampaign;
let SyncTransaction = require('../model/sync/transaction').SyncTransaction;
let ShareTransaction = require('../model/sync/transaction_share');
let SyncSetting = require('../model/sync/setting').SyncSetting;
let SyncIcon = require('../model/syncv2/icon').SyncIcon;
//let Notify = require('../model/sync/newhook');
let PushController = require('../model/sync/push_controller');
let Permission = require('../model/permission');
let Email = require('../model/email');
let Utils = require('../helper/utils');
let Error = require('../config/error');

let mongoose = require('mongoose');
let User = mongoose.model('User');
let Account = mongoose.model('Account');
let Budget = mongoose.model('Budget');
let Campaign = mongoose.model('Campaign');
let Category = mongoose.model('Category');
let Transaction = mongoose.model('Transaction');
let AccountShare = mongoose.model('AccountShare');
let TransactionReport = mongoose.model('TransactionReport');
let async = require('async');

// let SyncCodes = require('../config/sync_codes');

function checkServerMaintainLoginRequired(req, res, next){
	if (global.isServerMaintain){
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}
	next();
}

// function checkServerMaintain(res){
// 	if (global.isServerMaintain){
// 		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
// 	}
// }

let walletBalancePush = function(req, res){
	if (req.body.f === 1) {
		return res.json({s: false, e: Error.SYNC_DUPLICATE_ITEM});
	}

	let syncBalanceWallet = new SyncBalanceAccount(req);

	syncBalanceWallet.push(function(status, data, err){
		if (!status) {
			return res.send({ s: false, e: err });
		}

		let result = { s: true, d: data};

		if (err && err.length > 0) {
			result.le = err;
		}

		res.send(result);

	});
};

let walletBalancePull = function(req, res){
	let syncBalanceWallet = new SyncBalanceAccount(req);

	syncBalanceWallet.pull(function(status, data, err){
		if (err) return res.json({s: false, e: err});

		if (data.length === 0) return res.json({s: true, d: data, t: Utils.currentTimestamp()});

		let result = [];
		async.eachSeries(data, function(wallet, cb){
			Permission.checkReadPermission(req.user_id, wallet._id, function(errCheck, status){
				if (errCheck) return cb(errCheck);

				if (status) {
					result.push(wallet);
					cb();
				} else cb();
			});
		}, function(e){
			if (e) {
				res.json({s: false, e: e});
			} else {
				res.json({s: true, d: result, t: Utils.currentTimestamp()});
			}
		});
	});
};

module.exports = function(server, config) {
	server.use(checkServerMaintainLoginRequired);

	let mlSendError = function(res, errCode){
		res.send({ s: false, e: errCode });
	};

	let accountInvite = function(req, res) {
		let token = req.body.token;

		if (!token) return res.send('fail');

		Permission.checkShareToken(token, function(status, user_id, account_id) {
			if (status) {
				Account.addUserToAccount(user_id, account_id, function(err){
					res.send(!err);
				});
			} else {
				res.send('fail');
			}
		})
	};

	let accountPull = function(req, res) {
		let syncAccount = new SyncAccount(req);

		syncAccount.pull(function(status, data, err) {
			if (!status) {
				return res.send({ s: false, e: err });
			}

			res.send({ s: true, d: data, t: Utils.currentTimestamp() });

			// if (data.length === 0) {
			// 	return res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			// }
            //
			// let result = [];
            //
			// async.eachSeries(data, function(wallet, cb){
			// 	Permission.checkReadPermission(req.user_id, wallet._id, function(errCheck, status){
			// 		if (errCheck) return cb(errCheck);
            //
			// 		if (status) {
			// 			result.push(wallet);
			// 			cb();
			// 		} else {
			// 			cb();
			// 		}
			// 	});
			// }, function(e){
			// 	if (e) {
			// 		res.send({ s: false, e: e });
			// 	} else {
			// 		res.send({ s: true, d: result, t: Utils.currentTimestamp() });
			// 	}
			// });
		});
	};

	let accountPush = function(req, res) {
		let syncAccount = new SyncAccount(req);
		syncAccount.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};
				if (err && err.length > 0) result.le = err;
				res.send(result);
			}
			else res.send({ s: false, e: err });
		});
	};

	let categoryPull = function(req, res) {
		let syncCategory = new SyncCategory(req);
		syncCategory.pull(function(status, data, err) {
			if (status) res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			else res.send({ s: false, e: err });
		});
	};

	let categoryPush = function(req, res) {
		let syncCategory = new SyncCategory(req);
		syncCategory.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};
				if (err && err.length > 0) result.le = err;
				res.send(result);
			}
			else res.send({ s: false, e: err });
		});
	};

	let categorySubPull = function(req, res) {
		let syncCategory = new SyncCategory(req);
		syncCategory.setSyncSub(true);
		syncCategory.pull(function(status, data, err) {
			if (status) res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			else res.send({ s: false, e: err });
		});
	};

	let categorySubPush = function(req, res) {
		let syncCategory = new SyncCategory(req);
		syncCategory.setSyncSub(true);
		syncCategory.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};
				if (err && err.length > 0) result.le = err;
				res.send(result);
			}
			else res.send({ s: false, e: err });
		});
	};

	let budgetPush = function(req, res) {
		let syncBudget = new SyncBudget(req);
		syncBudget.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};
				if (err && err.length > 0) result.le = err;
				res.send(result);
			}
			else res.send({ s: false, e: err });
		});
	};

	let budgetPull = function(req, res) {
		let syncBudget = new SyncBudget(req);
		syncBudget.pull(function(status, data, err) {
			if (status) res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			else res.send({ s: false, e: err });
		});
	};

	let campaignPush = function(req, res) {
		let syncCampaign = new SyncCampaign(req);
		syncCampaign.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};

				if (err && err.length > 0) {
					result.le = err;
				}

				res.send(result);
			} else {
				res.send({ s: false, e: err });
			}
		});
	};

	let campaignPull = function(req, res) {
		let syncCampaign = new SyncCampaign(req);
		syncCampaign.pull(function(status, data, err) {
			if (status) res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			else res.send({ s: false, e: err });
		});
	};

	let transactionPush = function(req, res) {
		let syncTransaction = new SyncTransaction(req);
		syncTransaction.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};
				if (err && err.length > 0) result.le = err;
				res.send(result);
			}
			else res.send({ s: false, e: err });
		});
	};

	let transactionPull = function(req, res) {
		let syncTransaction = new SyncTransaction(req);
		syncTransaction.pull(function(status, data, err) {
			if (status) res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			else res.send({ s: false, e: err });
		});
	};

	let transactionSubPush = function(req, res) {
		let syncTransaction = new SyncTransaction(req);
		syncTransaction.setSyncSub(true);
		syncTransaction.pushToServer(function(status, data, err) {
			if (status){
				let result = { s: true, d: data};
				if (err && err.length > 0) result.le = err;
				res.send(result);
			}
			else res.send({ s: false, e: err });
		});
	};

	let transactionSubPull = function(req, res) {
		let syncTransaction = new SyncTransaction(req);
		syncTransaction.setSyncSub(true);
		syncTransaction.pull(function(status, data, err) {
			if (status) res.send({ s: true, d: data, t: Utils.currentTimestamp() });
			else res.send({ s: false, e: err });
		});
	};

	let transactionSharePush = function(req, res){
		let Share = new ShareTransaction(req);
		Share.share(function(status, data, err) {
			if (status) res.send({ s: true, p: data });
			else res.send({ s: false, e: err });
		});
	};

	let settingPush = function(req, res){
		let syncSetting = new SyncSetting(req);
		
		syncSetting.pushSetting((err) => {
			if (err) {
				res.send({s: false, e: err});
			} else {
				res.send({s: true});
			}
		});
	};

	let settingPull = function(req, res){
		let syncSetting = new SyncSetting(req);

		syncSetting.pullSetting((err, setting) => {
			if (err) {
				res.send({s: false, e: err});
			} else {
				res.send({s: true, d: setting});
			}
		});
	};

	let accountAccept = function(req, res){
		let syncAccount = new SyncAccount(req);

		syncAccount.acceptShare(req, function(status, err){
			if (status) {
				res.send({s: true});
			} else {
				res.send({s: false, e: err});
			}
		}, PushController, Permission, Email, AccountShare, Error);
	};

	let accountPendingList = function(req, res){
		let body = req.body;
		let user_id = req.user_id;

		if (!body || !user_id || !body.okget){
			return mlSendError(res, Error.SHARE_BODY_INVALID);
		}

		let parsePending = function(listShare){
			let tmpShare = [];

			listShare.forEach(function(share){
				if(share.account){
					tmpShare.push({
						_id: share._id,
						icon: share.account.icon || 'icon',
						email: share.owner.email,
						account_id: share.account._id,
						account_name: share.account.name,
						note: (share.note || ''),
						shareCode: share.shareCode
					});
				}
			});

			return tmpShare;
		};


		User.findById(user_id)
			.select('email')
			.exec(function(err, user){
				if (!user){
					mlSendError(res, Error.USER_NOT_EXIST);
				}

				AccountShare.find({email: user.email, status: true, isDelete: false})
					.populate('owner', 'email')
					.populate('account', '_id name icon')
					.select('owner email account shareCode note')
					.exec(function(err, share){
						if(err) {
							mlSendError(res, Error.ERROR_SERVER);
						} else {
							res.send({s: true, d: parsePending(share)});
						}
					});
			});
	};

	let accountShare = function(req, res) {
		let body = req.body;
		let user_id = req.user_id;

		if (!body || !user_id){
			return mlSendError(res, Error.SHARE_BODY_INVALID);
		}

		let account_id = body.ac;
		let email = body.em;
		let canWrite = body.p || false;
		let note = body.n || null;

		if (!email) {
			return mlSendError(res, Error.PARAM_EMAIL_INVALID);
		}

		if (!account_id) {
			return mlSendError(res, Error.PARAM_ACCOUNT_INVALID);
		}

		async.waterfall([
			function(cb){ // check myself
				User.findById(user_id)
					.select('email')
					.exec(function(err, user){
						if (user.email == email) {
							cb(Error.SHARE_MYSELF);
						} else {
							cb(null, user);
						}
					});
			},
			function(userInfo, cb){
				Account.findOne({_id: account_id, isDelete: false})
					.select('name listUser')
					.exec(function(err, walletInfo){
						if(err || !walletInfo) {
							cb(Error.SHARE_ACCOUNT_NOT_EXIST);
						} else {
							cb(null, userInfo, walletInfo);
						}
					});
			},
			function(userInfo, walletInfo, cb){
				//check user already shared or not
				User.findOne({email: email})
					.select('_id')
					.exec(function(err, user){
						if(err || !user) {
							cb(Error.USER_NOT_EXIST);
						} else {
							if (walletInfo.listUser.indexOf(user._id) != -1) {
								cb(Error.SHARE_EMAIL_ALREADY_SHARED);
							} else {
								cb(null, userInfo, walletInfo);
							}
						}
					});
			},
			function(userInfo, walletInfo, cb){
				AccountShare.generateShare(user_id, email, account_id, canWrite, note, function(status, err, share){
					if (err) {
						cb(Error.SHARE_CAN_NOT_GEN_CODE);
					} else {
						cb();

						if (status) {
							User.findByEmail(email, function(err, user){
								if (user){
									Email.sendShareAccountInvite(walletInfo.name, email, userInfo.email, function(err, data){
									}, share);

									PushController.pushShareWallet({
										userId: user._id,
										emailFrom: userInfo.email,
										emailTo: email,
										shareCode: share.shareCode,
										walletName: walletInfo.name
									});
								} else {
									Email.sendShareAccountInvite2(walletInfo.name, email, userInfo.email, function(err, data){
									}, share);
								}
							});
						}
					}
				});
			}
		], function(err){
			if (err) {
				res.send({s: false, e: err, ok: true});
			} else {
				res.send({s: true, ok: true});
			}
		});
	};

	let accountListShare = function(req, res){
		let user_id  = req.user_id;
		let body = req.body;

		if (!user_id) {
			return res.send({s: false, e: Error.USER_NOT_LOGIN});
		}

		if (!body || !body.ac) {
			return res.send({s: false, e: Error.USER_WARNING_INFO});
		}


		let parseData = function(data){
			let tmpData = {};
			let list = [];
			if(data) {
				tmpData.creator = (data.owner && data.owner.email) ? data.owner.email : 'Unknown';
				data.listUser.forEach(function(user){
					list.push({user_id: user._id, email: user.email})
				});
			}
			tmpData.list = list;
			tmpData.s = true;
			return tmpData;
		};

		let account_id = body.ac;

		Permission.checkReadPermission(user_id, account_id, function(errCheck, status){
			if (errCheck) {
				return res.send({s: false, e: Error.ERROR_SERVER});
			}
			
			if (!status){
				return res.send({s: false, e: Error.SYNC_ACCOUNT_CAN_NOT_READ});
			}

			Account.findById(account_id)
				.populate('owner', 'email')
				.populate('listUser', 'email')
				.select('owner listUser')
				.exec(function(err, listUser){
					if(err) {
						res.send({s: false, e: Error.ERROR_SERVER});
					} else {
						res.send(parseData(listUser));
					}
				});
		});
	};

	let syncIconPull = function(req, res) {
		let user_id = req.user_id;

		if (!user_id) {
			return res.send({s: false, e: Error.USER_NOT_LOGIN});
		}

		User.findById(user_id, 'icon_package', (err, user) => {
			if (err) {
				return res.send({s: false, e: Error.ERROR_SERVER});
			}

			if (!user) {
				return res.send({s: false, e: Error.USER_NOT_EXIST});
			}

			if (!user.icon_package) {
				return res.send({s: true, d: []});
			}

			res.send({s: true, d: user.icon_package});
		});
	};

	let syncIconPush = function (req, res) {
		let syncIcon = new SyncIcon(req);

		syncIcon.pushToDB(function(err) {
			if (err) {
				res.send({s: false, e: Error.ERROR_SERVER});
			} else {
				res.send({s: true});
			}
		});
	};

	let transactionReportPush = function(req, res){
		const types = ['hidden_fee', 'double_charge', 'fraud'];
		const user_id = req.user_id;
		const transactionId = req.body.tr;
		const type = req.body.ty;

		if (!user_id) {
			return res.send({s: false, e: Error.USER_NOT_LOGIN});
		}

		if (!transactionId || !type) {
			return res.send({s: false, e: Error.PARAM_INVALID});
		}

		if (types.indexOf(type) === -1) {
			return res.send({s: false, e: Error.PARAM_INVALID});
		}

		TransactionReport.createReport(transactionId, user_id, type, (err) => {
			if (err) {
				return res.send({s: false, e: Error.ERROR_SERVER});
			}

			res.send({s: true});
		});
	};

	let transactionReportUndo = function(req, res){
		const transactionId = req.body.tr;
		const user_id = req.user_id;

		if (!user_id) {
			return res.send({s: false, e: Error.USER_NOT_LOGIN});
		}

		if (!transactionId) {
			return res.send({s: false, e: Error.PARAM_INVALID});
		}

		TransactionReport.undoReport(transactionId, (err) => {
			if (err) {
				return res.send({s: false, e: Error.ERROR_SERVER});
			}

			res.send({s: true});
		})
	};

	server.get('/account/invite/:token', accountInvite);
	server.post('/sync/account/pull', accountPull);
	server.post('/sync/account/push', accountPush);
	server.post('/sync/category/pull', categoryPull);
	server.post('/sync/category/push', categoryPush);
	server.post('/sync/category/sub/pull', categorySubPull);
	server.post('/sync/category/sub/push', categorySubPush);
	server.post('/sync/budget/push', budgetPush);
	server.post('/sync/budget/pull', budgetPull);
	server.post('/sync/campaign/push', campaignPush);
	server.post('/sync/campaign/pull', campaignPull);
	server.post('/sync/transaction/push', transactionPush);
	server.post('/sync/transaction/pull', transactionPull);
	server.post('/sync/transaction/sub/push', transactionSubPush);
	server.post('/sync/transaction/sub/pull', transactionSubPull);
	server.post('/transaction/share/push', transactionSharePush);
	server.post('/sync/setting/push', settingPush);
	server.post('/sync/setting/pull', settingPull);
	server.post('/account/accept', accountAccept);
	server.post('/account/pending', accountPendingList);
	server.post('/account/share', accountShare);
	server.post('/account/share/list', accountListShare);
	server.post('/sync/account/balance/pull', walletBalancePull);
	server.post('/sync/account/balance/push', walletBalancePush);
	server.post('/sync/icon/pull', syncIconPull);
	server.post('/sync/icon/push', syncIconPush);
	server.post('/transaction/report/push', transactionReportPush);
	server.post('/transaction/report/undo', transactionReportUndo);
};