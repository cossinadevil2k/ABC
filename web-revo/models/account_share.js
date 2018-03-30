/*
	Share account table
*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var utils = require('../helper/utils');

var ShareSchema = new Schema({
	owner: {type: ObjectId, ref: 'User', require: true},
	email: {type: String, trim: true, require: true, index: true},
	account: {type: String, ref: 'Account'},
	permission: {type: Boolean, require: true},
	shareCode: {type: String, trim: true, require: true, index: true},
	createdAt: {type: Date, default: Date.now},
	status: {type: Boolean, default: true},
	note: {type: String, trim: true},
	isDelete: {type: Boolean, default: false}
});

ShareSchema.methods = {
	deleteShare: function(obj, cb){
		this.remove({_id: obj._id}, cb);
	}
};

ShareSchema.statics = {
	generateShare: function(owner, email, account, permission, note, cb){
		var that = this;
		that.checkExist(email, account, function(shareData){
			if(!shareData){
				var share = new that({
					owner: owner,
					email: email,
					account: account,
					note: note,
					permission: permission,
					shareCode: utils.uid(16)
				});
				share.save(function(err){
					cb(true, err, share);
				});
			} else {
				that.update({email: email, account: account}, {$set: {permission: permission, note: note, status: true, isDelete: false}}, function(err, numUp){
					//if(status.isDelete || !status.status) cb(true, err, numUp);
					//else cb(false, err, numUp);
					cb(true, err, shareData);
				});
			}
		});
	},
	checkExist: function(email, account, cb){
		this.findOne({email: email, account: account}, function(err, share){
			cb(share);
		});
	},
	findShare: function(code, cb){
		this.findOne({shareCode: code})
			.populate('owner', 'email')
			.populate('account', 'name')
			.select('owner email account permission shareCode createdAt note')
			.exec(cb);
	},
	countShare: function(email, cb){
		this.count({email: email, status: true, isDelete: false}, cb);
	},
	deleteShare: function(obj, cb){
		this.remove({_id: obj._id}, cb);
	},
	deleteByCode: function(shareCode, cb){
		this.update({shareCode: shareCode}, {$set: {isDelete: true}}, function(err, numUp){
			if(err) cb(false);
			else cb(numUp);
		});
	}
};


mongoose.model('AccountShare', ShareSchema);