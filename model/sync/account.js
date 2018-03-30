/*
	Account sync controller
	Converted to ES6 by cuongpham at 29/01/2016
*/

'use strict';

let Sync			= require('./sync').Sync;
let mongoose		= require('mongoose');
let AccountSchema	= mongoose.model('Account');
let SyncCodes		= require('../../config/sync_codes');

class SyncAccount extends Sync {
	constructor(request) {
		super(request);

		this.syncCode = SyncCodes.WALLET;
		this.Schema = AccountSchema;
		this.propertiesSelect = 'name isDelete currency_id icon exclude_total account_type metadata archived transaction_notification listUser balance sortIndex';
		this.skipCheckAccount = true;
	}

	pullData(params, callback){
		this.Schema.find(this.pullCondition(params))
			.select(this.propertiesSelect)
			.skip(params.skip)
			.limit(params.limit)
			.exec((err, results) => {
				callback(true, results || [], err);
			});
	}

	acceptShare(req, callback, Notify, Permission, Email, AccountShare, Error){
		let body = req.body;
		let user_id = req.user_id;
		let that = this;

		let mailAcceptShare = function(share){
			Email.walletSharingConfirm(share.owner.email, share.email, function(data,err){
			});
		};

		let notifyAcceptShare = function(share){
			//let data = {t: 'Account Share', ac: 10, wa: share.account.name};
			//let notif = new Notify(req);

			//notif.sharePush(user_id, data, function(data){
			//});
			Notify.pushAcceptShareWallet({
				userId: user_id,
				walletName: share.account.name,
				tokenDevice: that.__tokenDevice
			});
		};

		let acceptSyncNotif = function(share){
			mailAcceptShare(share);
			notifyAcceptShare(share);
		};

		if (!body || !user_id) {
			return callback(false, Error.SHARE_BODY_INVALID);
		}

		let shareCode = body.sc;
		let status = body.s;

		if (!shareCode) {
			return callback(false, Error.SHARE_BODY_INVALID);
		}

		if (status){
			AccountShare.findShare(shareCode, function(err, share){
				if (!share){
					return callback(false, Error.SHARE_CODE_INVAILD);
				}

				Permission.setAccountPermission(user_id, share.account._id, true, share.permission, function(stt){
					if (stt){
						share.status = false;
						share.save();
						acceptSyncNotif(share);
						callback(true, null);
					} else {
						callback(false, Error.SHARE_SET_PERMISSION_ERROR);
					}
				});
			});
		} else {
			AccountShare.deleteByCode(shareCode, function(stt){
				if (stt) {
					callback(true, null);
				} else {
					callback(false, Error.SHARE_CODE_INVAILD);
				}
			});
		}
	}

	makeNewItem(item, user_id, account, parent, callback){
		let data = {
			_id: item.gid,
			name: item.n,
			currency_id: item.c,
			icon: item.ic || 'icon',
			owner: user_id,
			exclude_total: item.et || false
		};

		if (item.at) data.account_type = item.at;
		if (item.md) {
			data.metadata = item.md;

			let parsedMetadata;

			try {
				parsedMetadata = JSON.parse(data.metadata);
			} catch(e) {
				parsedMetadata = null;
			}

			if (parsedMetadata) {
				data.rwInfo = {};
				if (parsedMetadata.acc_id) data.rwInfo.acc_id = parsedMetadata.acc_id;
				if (parsedMetadata.login_id) data.rwInfo.login_id = parsedMetadata.login_id;
				if (parsedMetadata.p_code) data.rwInfo.p_code = parsedMetadata.p_code;
				if (parsedMetadata.secret) data.rwInfo.secret = parsedMetadata.secret;
				if (parsedMetadata.balance) data.rwInfo.balance = parsedMetadata.balance;
				if (parsedMetadata.service_id) data.rwInfo.service_id = parsedMetadata.service_id;
			}
		}
		if (item.ar != undefined) data.archived = item.ar;
		if (item.tn != undefined) data.transaction_notification = item.tn;
		if (item.si != undefined && item.si != null) data.sortIndex = item.si;

		callback(data);
	}

	validSyncItem(obj){
		return (!obj || !obj.c || !obj.n || !obj.ic);
	}

	makeEditItem(item, obj, account, parent, callback){
		obj.name = item.n;
		obj.currency_id = item.c;
		obj.icon = item.ic || 'icon';
		obj.exclude_total = item.et || false;

		if (item.at) obj.account_type = item.at;
		if (item.md) {
			obj.metadata = item.md;

			let parsedMetadata;

			try {
				parsedMetadata = JSON.parse(obj.metadata);
			} catch(e) {
				parsedMetadata = null;
			}

			if (parsedMetadata) {
				obj.rwInfo = {};
				if (parsedMetadata.acc_id) obj.rwInfo.acc_id = parsedMetadata.acc_id;
				if (parsedMetadata.login_id) obj.rwInfo.login_id = parsedMetadata.login_id;
				if (parsedMetadata.p_code) obj.rwInfo.p_code = parsedMetadata.p_code;
				if (parsedMetadata.secret) obj.rwInfo.secret = parsedMetadata.secret;
				if (parsedMetadata.service_id) obj.rwInfo.service_id = parsedMetadata.service_id;
				obj.rwInfo.balance = parsedMetadata.balance || 0;
			}
		}
		if (item.ar != undefined) obj.archived = item.ar;
		if (item.tn != undefined) obj.transaction_notification = item.tn;
		if (item.si != undefined && item.si != null) obj.sortIndex = item.si;

		callback(obj);
	}
}

exports.SyncAccount = SyncAccount;