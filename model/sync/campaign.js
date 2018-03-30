/*
	Campaign sync controller
	Converted to ES6 by cuongpham at 29/01/2016
 */

'use strict';

let Sync = require('./sync').Sync;
let moment = require('moment');
let async = require('async');
let mongoose = require('mongoose');
let CampaignSchema = mongoose.model('Campaign');
let SyncCodes = require('../../config/sync_codes');
let WalletSchema = mongoose.model('Account');

function checkDeletedWallet(campaign_list, callback){
	let output = [];

	async.each(campaign_list, (campaign, cb) => {
		if (!campaign.account) {
			output.push(campaign);
			return cb();
		}

		WalletSchema.findById(campaign.account)
			.select('isDelete')
			.exec((err, wallet) => {
				if (err) {
					return cb(err);
				}

				if (!wallet) {
					return cb();
				}

				if (!wallet.isDelete) {
					output.push(campaign);
				}

				cb();
			});
	}, (err) => {
		if (err) {
			return callback(err);
		}

		callback(null, output);
	});
}

class SyncCampaign extends Sync {
	constructor(request){
		super(request);

		this.syncCode = SyncCodes.CAMPAIGN;
		this.Schema = CampaignSchema;
		this.propertiesSelect = 'name icon type start_amount goal_amount isDelete account status end_date currency_id';
		this.syncByUser = true;
		this.skipCheckAccount = true;
	}

	pullData(params, callback){
		let that = this;

		this.Schema.find(that.pullCondition(params))
			// .populate('account', '_id isDelete')
			.select(that.propertiesSelect)
			.skip(params.skip)
			.limit(params.limit)
			.exec(function(err, results){
				if (!results) {
					return callback(true, results, err);
				}

				checkDeletedWallet(results, (err, checkedList) => {
					callback(true, checkedList, err);
				});
			});
	}

	makeNewItem(item, user, account, parent, callback){
		if (item.ed) {
			item.ed = moment(new Date(item.ed)).toISOString();
		}

		let data = {
			_id: item.gid,
			name: item.n,
			icon: item.ic,
			type: item.t,
			status: item.s,
			start_amount: item.sa,
			goal_amount: item.ga,
			owner: user,
			end_date: item.ed || undefined
		};

		if (item.ac) {
			data.account = item.ac;
		}

		if (item.ci) {
			data.currency_id = item.ci;
		}

		callback(data);
	}

	validSyncItem(obj){
		return (!obj || !obj.n || !obj.ic || !obj.t);
	}

	makeEditItem(item, obj, account, parent, callback){
		if (item.ed) {
			item.ed = moment(new Date(item.ed)).toISOString();
		}

		if (item.ac) {
			obj.account = item.ac;
		}

		if (item.ci) {
			obj.currency_id = item.ci;
		}

		obj.name = item.n;
		obj.icon = item.ic;
		obj.status = item.s;
		obj.goal_amount = item.ga;
		obj.start_amount = item.sa;
		obj.type = item.t;
		obj.end_date = item.ed || undefined;

		callback(obj);
	}
}

exports.SyncCampaign = SyncCampaign;
