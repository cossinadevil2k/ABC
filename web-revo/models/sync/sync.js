/*
	Sync controller
	Converted to ES6 by cuongpham at 29/01/2016
 */

'use strict';

var env	= process.env.NODE_ENV;
var pushHook = require('./newhook');
var Error = require('../../config/error');
var SyncCodes = require('../../config/sync_codes');
var Permission = require('../../model/permission');
var SyncContant = require('../../config/sync_contant');
var TagConstant = require('../../config/tag_constant');
var mongoose = require('mongoose');
var AccountSchema = mongoose.model('Account');
var User = mongoose.model('User');
var FailedSyncItem = mongoose.model('FailedSyncItem');
var errorLog = mongoose.model('errorLog');
//var redisClient = require('../../config/database').redisClient;
var config = require('../../config/config')[env];
var utils = require('../../helper/utils');
var async = require('async');
var sprintf	= require("sprintf-js").sprintf;
var platformCode = require('../../config/platform_codes').platformCode;
var appIdCode = require('../../config/platform_codes').appIdCode;
var pushController = require('./push_controller');

class Sync {
	constructor(request) {
		this.Schema = null;
		this.request = null;
		this.__user_id = null;
		this.__tokenDevice = null;
		this.__deviceId = null;
		this.maxSyncQuota = config.maxSyncItem;
		this.skipCheckAccount = false;
		this.isSyncSub = false;
		this.propertiesSelect = '';
		this.default_push_limit = 40;
		this.isServerMaintain = global.isServerMaintain;
		this.__pushObj = null;
		this.syncCode = 0;
		this.__skipGetListUser = false;
		this.syncByUser = false;
		this.__dataType = null;
		this.__changeAccount = null;
		this.__account_id = null;
		this.__AndroidVersionCode = 551;
		this.__iOSVersionCode = 500;
		this.__iOSVersionCodePlus = 500;
		this.__wpVersionCode = 500;
		this.__osxVersionCode = 500;
		this.__webVersionCode = 500;
		this.__transactionNotificationCount = 0;
		this.__walletInfo = null;
		this.__userInfo = null;
		this.__kickSharedUser = false;

		this.setRequest(request);
		//this.__setPush(request);
		this.__getUserInfo(request);
	}

	__getUserInfo(req){
		if (!req.user_id) {
			return;
		}

		var that = this;

		User.findById(req.user_id, function(err, userInfo){
			if (userInfo) {
				that.__userInfo = userInfo;
			}
		});
	}

	__setPush(req){
        var info = {
            user_id: req.user_id,
            account_id: req.body.account_id,
			tokenDevice: req.tokenDevice
        };
		this.__pushObj = new pushHook(info);
	}

	__checkAppVersion(){
		var that = this;
		var platform = that.__request.body.pl || 1;
		var appVersionCode = that.__request.body.av;

		if(!appVersionCode || !platform) {
			return false;
		} else {
			if(platform === appIdCode.ANDROID && appVersionCode >= that.__AndroidVersionCode) return true;
			else if(platform === appIdCode.IOS_FREE && appVersionCode >= that.__iOSVersionCode) return true;
			else if(platform === appIdCode.IOS_PLUS && appVersionCode >= that.__iOSVersionCodePlus) return true;
			else if(platform === appIdCode.WINDOWS_PHONE && appVersionCode >= that.__wpVersionCode) return true;
			else if(platform === appIdCode.WINDOWS_PC && appVersionCode >= that.__wpVersionCode) return true;
			else if(platform === appIdCode.MAC && appVersionCode >= that.__osxVersionCode) return true;
			else if(platform === appIdCode.WEB && appVersionCode >= that.__webVersionCode) return true;
			else return false;
		}
	}

	setRequest(request) {
		this.__request = request;
		this.__user_id = request.user_id;
		this.__tokenDevice = request.tokenDevice;
	}

	setSyncSub(status) {
		this.isSyncSub = status;
		if(status) this.syncCode += 100;
	}

	pull(callback) {
		if (this.isServerMaintain) {
			return callback(false, null, Error.SYNC_SERVER_MAINTAINCE);
		}

		if(!this.__checkAppVersion()) return callback(false, null, Error.APP_OUT_OF_DATE);

		var that = this;
		var params = that.__request.body;
		var account_id = that.__account_id = params.account_id;
		var limit = params.limit || that.default_push_limit;
		var skip = params.skip || 0;
		var lastUpdate = parseInt(params.lastUpdate, 10);

		var user_id = that.__user_id;

		that.__checkReadPermission(user_id, account_id, function(readStatus) {
			if (!readStatus) return callback(false, null, Error.SYNC_ACCOUNT_CAN_NOT_READ);

			that.__checkAccount(account_id, function(status, account) {
				if (!status) return callback(false, null, Error.ACCOUNT_NOT_FOUND);

				that.__pull({
					lastUpdate: lastUpdate,
					user_id: user_id,
					account: account_id,
					isSyncSub: that.isSyncSub,
					limit: limit,
					skip: skip,
					tokenDevice: that.__tokenDevice
				}, callback);
			});
		});
	}

	pushToServer(callback){
		if (this.isServerMaintain) {
			return callback(false, null, Error.SYNC_SERVER_MAINTAINCE);
		}

		if (!this.__checkAppVersion()) {
			return callback(false, null, Error.APP_OUT_OF_DATE);
		}

		var that = this;
		var params = that.__request.body;
		var account_id = that.__account_id = params.account_id;
		var data = params.data;
		var user_id = that.__user_id;

		try {
			data = JSON.parse(data);
			data = data.d;
		} catch(e){
			return callback(false, null, Error.SYNC_DATA_INVAILD_FORMAT);
		}

		if (!data instanceof Array) {
			return callback(false, null, Error.SYNC_ERROR_TYPE_DATA);
		}

		if (data.length > this.maxSyncQuota) {
			return callback(false, null, Error.OVER_DATA_QUOTA);
		}

		that.__checkWritePermission(user_id, account_id, function(status) {
			if (!status) {
				return callback(false, null, Error.SYNC_ACCOUNT_CAN_NOT_WRITE);
			}

			that.__checkAccount(account_id, function(status, account) {
				if (!status) {
					return callback(false, null, Error.ACCOUNT_NOT_FOUND);
				}

				if (account) {
					that.__walletInfo = account;
				}

				that.__push(data, user_id, account_id, that.isSyncSub, callback);
			});
		});
	}

	__getParent(parent_id, callback) {
		if (this.skipCheckAccount) return callback(true);
		if (!this.isSyncSub) return callback(true);
		if (!parent_id) return callback(false);

		this.Schema.findById(parent_id, function(err, parent) {
			if (err || !parent) {
				return callback(false);
			} else return callback(true, parent);
		});
	}

	__checkAccount(account_id, callback) {
		if (this.skipCheckAccount) return callback(true);
		if (!account_id) return callback(false);

		AccountSchema.findById(account_id, function(err, account) {
			if (err || !account) callback(false);
			else callback(true, account);
		});
	}

	__checkReadPermission(user_id, account_id, callback) {
		if (this.skipCheckAccount) return callback(true);

		Permission.checkReadPermission(user_id, account_id, callback);
	}

	__checkWritePermission(user_id, account_id, callback) {
		if (this.skipCheckAccount) return callback(true);

		Permission.checkWritePermission(user_id, account_id, callback);
	}

	pullCondition(params) {
		var condition = [];
		var account = params.account;

		if (params.lastUpdate === 0) {
			condition.push({ 'isDelete': false });
		} else {
			condition.push({ tokenDevice: { '$ne': params.tokenDevice } });
		}

		if (this.syncByUser) {
			condition.push({ 'owner': this.__user_id });
		} else if (account) {
			condition.push({ 'account': account });
		} else {
			condition.push({'listUser': this.__user_id});
		}

		if (params.isSyncSub) {
			condition.push({ parent: { '$ne': null } });
		} else if (this.syncCode === 200 || this.syncCode === 600) {
			//category & transaction
			condition.push({ parent: null });
		}

		if (params.lastUpdate > 0) {
			condition.push({ 'updateAt': { $gt: params.lastUpdate } });
		}

		return {
			$and: condition
		};
	}

	__updateLastSync(){
		var that = this;

		if(that.syncCode === 600 && that.__user_id){
			User.updateLastSync(that.__user_id);
		}
	}

	__pull(params, callback) {
		this.pullData(params, callback);
		this.__updateLastSync();
	}

	__push(data, user, account, isSyncSub, callback) {
		var that = this;

		that.__updateData(data, user, account, isSyncSub, function(list, status, failed) {
			if (!status) {
				return callback(false, null, Error.SYNC_DATA_INVAILD_FORMAT);
			}

			if (failed && failed.length > 0) {
				callback(true, list, failed);
			} else {
				callback(true, list);
			}
		})
	}

	__minAccountId(listAc){
		if(listAc.length === 1) return listAc;

		var tmpAc = [];

		listAc.forEach(function(ac){
			if(tmpAc.indexOf(ac) === -1) tmpAc.push(ac);
		});

		return tmpAc;
	}

	__sendNotif(account_id){
		var that = this;
		var data = {f: that.syncCode};
		account_id = account_id || that.__changeAccount;

		that.__pushObj.send(data, that.__skipGetListUser, function(status, data){
		}, account_id);
	}

	__pushNotif(){
		var that = this;
		if (that.syncCode === 400 || that.syncCode === 500 || that.syncCode === 101) {
			that.__skipGetListUser = true;
		}

		that.__sendNotif();
	}

	__pushSyncNotification(){
		pushController.pushSyncNotification({
			user_id: this.__user_id,
			wallet_id: this.__account_id,
			flag: this.syncCode,
			tokenDevice: this.__tokenDevice
		});

		if (this.syncCode === SyncCodes.WALLET && this.__kickSharedUser) {
			pushController.pushKickShareWallet({
				walletId: this.__account_id,
				tokenDevice: this.__tokenDevice
			});
		}

		if (env === 'production') {
			//if (this.__walletInfo.isPublic) {
			//	pushController.pushWidgetMessage(this.__account_id);
			//}
		} else {
			pushController.pushWidgetMessage(this.__account_id);
		}
	}

	__getListAccount(data){
		var tmpList = [];

		data.forEach(function(item){
			tmpList.push(item.ac);
		});

		return tmpList;
	}

	__cleanData(data, allowAccount){
		var tmpData = [];

		data.forEach(function(item){
			if(allowAccount.indexOf(item.ac) >= 0) tmpData.push(item);
		});

		return tmpData;
	}

	__checkPermission(data, cb){
		if (this.syncCode === 400 || this.syncCode === 500){
			var that = this;
			var tmpAccount = that.__getListAccount(data);
			var listAc = that.__minAccountId(tmpAccount);
			var allowAccount = [];
			var num = listAc.length;

			var updateState = function(status, account_id){
				--num;
				if(status) {
					allowAccount.push(account_id);
				}

				if(num === 0) cb(that.__cleanData(data, allowAccount));
			};

			listAc.forEach(function(account_id){
				Permission.checkWritePermission(that.__user_id, account_id, function(status){
					updateState(status, account_id);
				});
			});
		} else cb(data);
	}

	__updateData(data, user, account, isSyncSub, callback) {
		var list = [];
		var failed = [];
		var num = data.length;
		var that = this;

		if (num === 0) return callback(list, true);

		var updateCb = function(status, obj, error_item) {
			--num;
			if (status) {
				list.push(obj);
			} else {
				if(error_item) {
					failed.push(error_item);
				}
			}

			if (num === 0) {
				callback(list, true, failed);
				//that.__pushNotif();
				that.__pushSyncNotification();
				that.__pushTransactionNotification();
			}
		};

		that.__checkPermission(data, function(newData){
			that.__updateMixedData(that, newData, user, account, isSyncSub, updateCb);
		});
	}

	__updateMixedData(that, data, user, account, isSyncSub, updateState) {
		data.forEach(function(item) {
			var syncFlag = parseInt(item.f, 10);

			switch (syncFlag) {
				case SyncContant.FLAG_ADD:
					that.__addItem(item, user, account, isSyncSub, updateState);
					if (that.syncCode === SyncCodes.TRANSACTION) {
						that.__transactionNotificationCount++;
					}
					break;
				case SyncContant.FLAG_EDIT:
					that.__editItem(item, user, account, isSyncSub, updateState);
					break;
				case SyncContant.FLAG_DELETE:
					that.__deleteItem(item, user, updateState);
					break;
				default:
					updateState(false);
			}
		});
	}

	__addItem(item, user, account, isSyncSub, updateState) {
		var that = this;
		this.__getParent(item.pi, function(status, parent) {
			if (!status) return updateState(false);

			that.makeNewItem(item, user, account, parent, function(itemData) {
				var obj = new that.Schema(itemData);
				obj.lastEditBy = user;
				obj.tokenDevice = that.__tokenDevice;

				that.__saveCallback(item, obj, SyncContant.FLAG_ADD, updateState);
			});
		});
	}

	__editItem(item, user, account, isSyncSub, updateState) {
		var syncId = item.gid;
		var that = this;

		if(!syncId) {
			return updateState(false);
		}

		that.Schema.findById(syncId, function(err, obj) {
			if (err || !obj) {
				var failItem = { gid: syncId, flag: 2 };
				if (err) failItem.error = Error.SYNC_UNKNOWN_ERROR;
				else if (!obj) failItem.error = Error.SYNC_NO_RECORD_ON_DB;
				return updateState(false, null, failItem);
			}
			that.__getParent(item.pi, function(status, parent) {
				that.makeEditItem(item, obj, account, parent, function(obj) {
					obj.lastEditBy = user;
					obj.tokenDevice = that.__tokenDevice;
					that.__saveCallback(item, obj, SyncContant.FLAG_EDIT, updateState);
				});
			});
		});
	}

	__deleteItem(item, user, callback) {
		var syncId = item.gid;
		var that = this;

		if (!syncId) {
			return callback(false);
		}

		that.Schema.findById(syncId, function(err, obj) {
			if (err || !obj) {
				var failItem = { gid: syncId, flag: 2 };

				if (err) {
					failItem.error = Error.SYNC_UNKNOWN_ERROR;
				} else if (!obj) {
					failItem.error = Error.SYNC_NO_RECORD_ON_DB;
				}

				return callback(false, null, failItem);
			}

			obj.lastEditBy = user;

			/**
			 * extra chứa các thông tin đánh dấu phụ để phần __saveCallback thực hiện nếu có
             */
			let extra = {};

			if (that.syncCode !== 100) {
				obj.isDelete = true;
				obj.tokenDevice = that.__tokenDevice;
			} else {
				/**
				 * Wallet
				 */
				if (user == obj.owner) {
					//nếu người xoá là owner
					//đánh cờ isDelete luôn và ngay
					obj.isDelete = true;
					obj.tokenDevice = that.__tokenDevice;
					
					extra.restoreDefaultPermission = true;
					that.__kickSharedUser = true;
				} else {
					if (obj.listUser.length > 1) {
						obj.tokenDevice = 'moneylover';
						
						extra.kickUser = user; //đánh dấu để kick khỏi list quyền
					} else {
						obj.isDelete = true;
						obj.tokenDevice = that.__tokenDevice;
					}
				}
			}

			that.__saveCallback(item, obj, SyncContant.FLAG_DELETE, callback, extra);
		});
	}

	__saveCallback(item, obj, syncFlag, updateState, extra) {
		var that = this;

		obj.save(function(err, obj) {
			if (err) {
				handleError(err);
			} else {
				handleSuccess(obj);
			}
		});

		function handleError(err){
			if (typeof err != 'string') err = JSON.stringify(err);

			var failItem = {
				gid: item.gid,
				flag: syncFlag
			};

			if ((err.indexOf('11000') != -1) || (err.indexOf('11001') != -1)) {
				failItem.error = Error.SYNC_DUPLICATE_ITEM;
			} else if (err.indexOf('Cast to date failed') != -1) {
				failItem.error = Error.SYNC_DATETIME_ERROR;
			} else if (err.indexOf('No matching document found') != -1) {
				failItem.error = Error.SYNC_NO_RECORD_ON_DB;
			} else {
				failItem.error = Error.SYNC_UNKNOWN_ERROR;
			}

			updateState(false, null, failItem);
		}

		function handleSuccess(obj){
			var temp = {};
			// temp.i = item.i;
			temp.gid = item.gid;
			temp.f = syncFlag;

			if (that.syncCode === SyncCodes.WALLET) {
				that.__account_id = obj._id;
				
				if (syncFlag === SyncContant.FLAG_ADD) {
					that.syncCode += SyncContant.FLAG_ADD;
				} else {
					that.__changeAccount = obj._id;

					if (syncFlag === SyncContant.FLAG_DELETE) {
						//kiểm tra remote wallet, nếu đúng thông báo cho Finsify không crawling ví này nữa
						//if (obj.account_type && obj.rwInfo && obj.rwInfo.login_id) {
							//utils.finsifyWalletStopCrawl(obj.rwInfo.login_id);
						//}
					}
				}
			}

			if (syncFlag === SyncContant.FLAG_ADD && that.syncCode === SyncCodes.WALLET + SyncContant.FLAG_ADD){
				that.__updateUserTag(obj);

				Permission.setAccountPermission(that.__user_id, item.gid, true, true, function(status) {
					updateState(true, temp);
				});
			} else if (syncFlag === SyncContant.FLAG_DELETE && that.syncCode === SyncCodes.WALLET) {
				if (extra.kickUser) {
					Permission.setAccountPermission(extra.kickUser, obj._id, false, false, function(status, removeUserToAccountResult){
						updateState(true, temp);
					});
				} else if (extra.restoreDefaultPermission) {
					Permission.defaultPermission(obj._id, function(status){
						updateState(true, temp);
					});
				} else {
					updateState(true, temp);
				}
			} else {
				updateState(true, temp);
			}
		}
	}

	__pushTransactionNotification(){
		if (this.syncCode !== SyncCodes.TRANSACTION) {
			return 0;
		}

		if (!this.__walletInfo || !this.__walletInfo.transaction_notification) {
			return 0;
		}

		if (this.__transactionNotificationCount) {
			var language = null;

			if (this.__userInfo && this.__userInfo.client_setting && this.__userInfo.client_setting.l) {
				language = this.__userInfo.client_setting.l;
			}

			pushController.pushTransactionNotification({
				new_transaction_amount: this.__transactionNotificationCount,
				wallet_id: this.__account_id,
				user_id: this.__user_id,
				platform: platformCode.IOS,
				language: language,
				tokenDevice: this.__tokenDevice
			});
		}
	}

	__updateUserTag(obj){
		if (obj.account_type === 1 || obj.account_type === 2) {
			User.updateTags(this.__user_id, [sprintf(TagConstant.LINKEDWALLET, obj.rwInfo.p_code)], function(){

			});
		}
	}

	clearSub(datas){
		if(datas.length === 0) return [];

		var newData = [];
		var tmpData = null;
		datas.forEach(function(item){
			if(item.parent && item.parent.isDelete === false) {
				tmpData = item;
				tmpData.parent = item.parent._id;
				newData.push(tmpData);
			}
		});
		tmpData = undefined;
		return newData;
	}

	pullData(){
		throw new Error("pullData must be implemented");
	}

	validSyncItem(){
		throw new Error("validSyncItem must be implemented");
	}

	makeNewItem(){
		throw new Error("makeNewItem must be implemented");
	}

	makeEditItem(){
		throw new Error("makeEditItem must be implemented");
	}
}

exports.Sync = Sync;
