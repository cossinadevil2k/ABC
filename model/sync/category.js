/*
	Category sync controller
	Converted to ES6 by cuongpham at 29/01/2016
 */

'use strict';

var Sync = require('./sync').Sync;
var mongoose = require('mongoose');
var CategorySchema = mongoose.model('Category');
var SyncCodes = require('../../config/sync_codes');

class SyncCategory extends Sync{
	constructor(request){
		super(request);

		this.syncCode = SyncCodes.CATEGORY;
		this.Schema = CategorySchema;
		this.propertiesSelect = 'name icon isDelete metadata type parent';
	}

	pullData(params, callback){
		var that = this;
		this.Schema.find(that.pullCondition(params))
			.populate('parent', '_id isDelete')
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
			name: item.n,
			icon: item.ic,
			account: account,
			type: item.t,
			metadata: item.md,
			parent: parent || undefined
		});
	}

	validSyncItem(obj){
		return (!obj || !obj.t || !obj.ic || !obj.n);
	}

	makeEditItem(item, obj, account, parent, callback){
		obj.name = item.n;
		obj.icon = item.ic;
		obj.metadata = item.md;
		obj.type = item.t;
		obj.account = account;
		obj.parent = parent || undefined;
		callback(obj);
	}
}

exports.SyncCategory = SyncCategory;