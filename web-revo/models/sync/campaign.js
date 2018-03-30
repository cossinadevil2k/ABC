/*
	Campaign sync controller
	Converted to ES6 by cuongpham at 29/01/2016
 */

'use strict';

var Sync = require('./sync').Sync;
var moment = require('moment');
var mongoose = require('mongoose');
var CampaignSchema = mongoose.model('Campaign');
var SyncCodes = require('../../config/sync_codes');

class SyncCampaign extends Sync {
	constructor(request){
		super(request);

		this.syncCode = SyncCodes.CAMPAIGN;
		this.Schema = CampaignSchema;
		this.propertiesSelect = 'name icon type start_amount goal_amount isDelete account status end_date';
		this.syncByUser = true;
		this.skipCheckAccount = true;
	}

	pullData(params, callback){
		var that = this;
		this.Schema.find(that.pullCondition(params))
			// .populate('account', '_id isDelete')
			.select(that.propertiesSelect)
			.skip(params.skip)
			.limit(params.limit)
			.lean(true)
			.exec(function(err, results){
				callback(true, results, err);
			});
	}

	makeNewItem(item, user, account, parent, callback){
		if(item.ed) item.ed = moment(new Date(item.ed)).toISOString();
		callback({
			_id: item.gid,
			name: item.n,
			icon: item.ic,
			type: item.t,
			account: item.ac,
			status: item.s,
			start_amount: item.sa,
			goal_amount: item.ga,
			owner: user,
			end_date: item.ed || undefined
		});
	}

	validSyncItem(obj){
		return (!obj || !obj.n || !obj.ic || !obj.t || !obj.ac);
	}

	makeEditItem(item, obj, account, parent, callback){
		if(item.ed) item.ed = moment(new Date(item.ed)).toISOString();
		obj.name = item.n;
		obj.icon = item.ic;
		obj.account = item.ac;
		obj.status = item.s;
		obj.goal_amount = item.ga;
		obj.start_amount = item.sa;
		obj.type = item.t;
		obj.end_date = item.ed || undefined;
		callback(obj);
	}
}

exports.SyncCampaign = SyncCampaign;
