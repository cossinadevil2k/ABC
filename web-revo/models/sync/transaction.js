/*
	Transaction sync controller
 	Converted to ES6 by cuongpham at 29/01/2016
 */

'use strict';

var Sync = require('./sync').Sync;
var moment = require('moment');
var mongoose = require('mongoose');
var TransactionSchema = mongoose.model('Transaction');
var SyncCodes = require('../../config/sync_codes');

class SyncTransaction extends Sync {
	constructor(request){
		super(request);

		this.syncCode = SyncCodes.TRANSACTION;
		this.Schema = TransactionSchema;
		this.propertiesSelect = 'note displayDate amount longtitude latitude address category isDelete id parent with campaign remind exclude_report isPublic permalink images original_currency';
	}

	__clearTransaction(datas){
		if(datas.length === 0) return [];
		else {
			var newData = [];
			var tmpData = null;
			datas.forEach(function(item){
				if(item.category && item.category.isDelete === false) {
					tmpData = item;
					tmpData.category = item.category._id;
					newData.push(tmpData);
				}
			});
			tmpData = undefined;
			return newData;
		}
	}

	pullData(params, callback){
		var that = this;
		this.Schema.find(that.pullCondition(params))
			.select(that.propertiesSelect)
			.skip(params.skip)
			.limit(params.limit)
			.populate('parent', '_id isDelete')
			.populate('category', '_id isDelete', {account: params.account, isDelete: false})
			.lean(true)
			.exec(function(err, results){
				callback(true, results, err);
			});
	}

	makeNewItem(item, user, account, parent, callback){
		var data = {
			_id: item.gid,
			note: item.n,
			account: account,
			category: item.c,
			amount: item.a,
			lastEditBy: user,
			parent: parent || undefined,
			longtitude: item.lo,
			latitude: item.la,
			address: item.ad,
			with: item.p || [],
			campaign: item.cp,
			displayDate: moment(new Date(item.dd)).toISOString(),
			remind: item.rd,
			exclude_report: item.er,
			isPublic: item.pub,
			permalink: item.per
		};
		if (item.im) data.images = item.im;
		if (item.oc) data.original_currency = item.oc;
		callback(data);
	}

	validSyncItem(obj){
		return (!obj || !obj.dd || !obj.a || !obj.c);
	}

	makeEditItem(item, obj, account, parent, callback){
		obj.note = item.n;
		obj.account = account;
		obj.category = item.c;
		obj.amount = item.a;
		obj.parent = parent || undefined;
		obj.longtitude = item.lo;
		obj.latitude = item.la;
		obj.address = item.ad;
		obj.with = item.p || [];
		obj.campaign = item.cp;
		obj.displayDate = moment(new Date(item.dd)).toISOString();
		obj.remind = item.rd;
		obj.exclude_report = item.er;
		obj.isPublic = item.pub;
		obj.permalink = item.per;
		if (item.im) obj.images = item.im;
		if (item.oc) obj.original_currency = item.oc;
		callback(obj);
	}
}

exports.SyncTransaction = SyncTransaction;