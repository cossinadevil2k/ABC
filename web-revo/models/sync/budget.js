/*
	Budget sync controller
	Converted to ES6 by cuongpham at 29/01/2016
 */

'use strict';

var Sync = require('./sync').Sync;
var moment = require('moment');
var mongoose = require('mongoose');
var BudgetSchema = mongoose.model('Budget');
var SyncCodes = require('../../config/sync_codes');

class SyncBudget extends Sync{
	constructor(request){
		super(request);

		this.syncCode = SyncCodes.BUDGET;
		this.Schema = BudgetSchema;
		this.propertiesSelect = 'name icon isDelete category start_date end_date amount account isRepeat';
		this.syncByUser = true;
		this.skipCheckAccount = true;
	}

	pullData(params, callback){
		var that = this;
		this.Schema.find(that.pullCondition(params))
			// .populate('account', '_id isDelete')
			// .populate('category', '_id isDelete', {account: params.account, isDelete: false})
			.select(that.propertiesSelect)
			.skip(params.skip)
			.limit(params.limit)
			.lean(true)
			.exec(function(err, results){
				callback(true, results, err);
			});
	}

	makeNewItem(item, user, account, parent, callback){
		callback({
			_id: item.gid,
			category: item.c || undefined,
			amount: item.a,
			account: item.ac,
			start_date: moment(new Date(item.sd)).toISOString(),
			end_date:moment(new Date(item.ed)).toISOString(),
			owner: user,
			isRepeat: item.rp || false
		});
	}

	validSyncItem(obj){
		return (!obj || !obj.a || !obj.sd || !obj.ed || !obj.ac);
	}

	makeEditItem(item, obj, account, parent, callback){
		obj.account = item.ac;
		obj.category = item.c || undefined;
		obj.start_date = moment(item.sd).toISOString();
		obj.end_date = moment(item.ed).toISOString();
		obj.amount = item.a;
		obj.isRepeat = item.rp || false;
		callback(obj);
	}
}

exports.SyncBudget = SyncBudget;
