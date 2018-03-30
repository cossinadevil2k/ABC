/*
	Transaction share sync controller
*/

var Bitly = require('../bitly');
var Utils = require('../../helper/utils');
var Error = require('../../config/error');
var Notify = require('./newhook');
var moment = require('moment');
var mongoose = require('mongoose');
var ShareSchema = mongoose.model('transactionShare');

var ShareTransaction = function(req){
	this.__Schema = ShareSchema;
	this.__request = null;
	this.__user_id = null;
	this.__req = req;
	this.__construct(req);
};

ShareTransaction.prototype = {
	__construct: function(request) {
		this.__setRequest(request);
	},

	__setRequest: function(req){
		this.__request = req.body;
		this.__user_id = req.user_id;
	},

	__makeNewItem: function(item, user, callback){
		callback({
			transaction: item.gid,
			owner: user,
			note: item.n,
			account: item.ac,
			category: {
				name: item.cn,
				icon: item.ci,
				type: item.ct
			},
			amount: item.a,
			address: item.ad || null,
			longtitude: item.lo,
			latitude: item.la,
			with: item.p,
			campaign: item.cp || null,
			displayDate: moment(new Date(item.dd)).toISOString(),
			image: item.img || null,
			currency: {
				type: item.cut,
				symbol: item.cus
			},
			timezone: item.tz || 0
		});
	},
	__pushNotif: function(data, uri){
		var that = this;
		var notif = new Notify(that.__req);

		notif.pushd([{deviceId: data.did, platform: data.pl, appId: data.aid}], '1', {t: '', m: '', gid: data.gid, l: uri, ac: 11}, function(status, data){
		});
	},
	__validSyncItem: function(obj){
		return (!obj || !obj.gid || !obj.dd || !obj.a || !obj.ci || !obj.cn || !obj.ac || !obj.cus);
	},
	__genPermalink: function(id, cb){
		Bitly.shortlink(Utils.transactionPermalink(id), cb);
	},
	share: function(callback){
		var that = this;
		if(!that.__user_id) callback(false, null, Error.USER_NOT_LOGIN);
		else {
			if(that.__validSyncItem(that.__request)){
				callback(false, null, Error.SYNC_DATA_INVAILD_FORMAT);
			} else {
				that.__add(that.__request, that.__user_id, callback);
			}
		}
	},
	__add: function(obj, user, callback){
		var that = this;
		that.__makeNewItem(obj, user, function(newItem){
			that.__Schema.addNew(newItem, function(status, data){
				if(status){
					that.__genPermalink(data._id, function(uri){
						callback(true, uri);
						that.__pushNotif(that.__request, uri);
					});
				} else {
					callback(false, null, Error.ERROR_SERVER);
				}
			});
		});
	}
};

module.exports = ShareTransaction;
