/*
	Sync Icon package
 */

var env			= process.env.NODE_ENV || 'development';
var mongoose	= require('mongoose');
var UserSchema	= mongoose.model('User');
var config		= require('../../config/config')[env];
var _			= require('underscore');
//var pushHook = require('../sync/hook');
var pushHook = require('../sync/newhook');
var fs 			= require('fs');

var SyncIcon = function(req){
	this.syncCode = 900;
	this.__Schema = UserSchema;
	this.__request = null;
	this.__user_id = null;
	this.__req = req;
	this.__iconPackage = null;
	this.__construct(req);
};

SyncIcon.prototype = {
	__construct: function(request) {
		this.__setRequest(request);
		//this.__initIcon();
	},

	__setRequest: function(req){
		this.__request = req.body;
		this.__user_id = req.user_id;
	},
	__initIcon: function(){
		this.__iconPackage = require(config.iconPack);
	},
	__parseIcon: function(){
		var IconData = this.__request.p;
		var minListIcon = _.uniq(IconData);
		return minListIcon;
	},
	__notif: function(){
		var self = this;
		var data = {f: self.syncCode};
		var account_id = null;
		var pushObj = new pushHook(self.__req);
		pushObj.send(data, false, function(status, data){
			// console.log('Push: %j', data);
		}, account_id);
	},
	__pullIcon: function(iconPack, callback){
		var self = this;
		var tmpPackage = [];

		var iconFile = fs.readFileSync(config.iconPack);
		iconFile = JSON.parse(iconFile.toString());

		iconPack.forEach(function(icon_product_id){
			//self.__iconPackage.forEach(function(iconData){
			iconFile.forEach(function(iconData){
				if(iconData.product_id === icon_product_id.toLowerCase()) {
					tmpPackage.push({product_id: iconData.product_id, name: iconData.name, link: iconData.link});
				}
			});
		});
		callback(true, tmpPackage, null);
	},
	pushToDB: function(callback){
		var self = this;
		var iconPack = self.__parseIcon();
        UserSchema.findById(self.__user_id, function(err, data){
            if(err || !data){
                callback(false, null, Error.ERROR_SERVER);
            } else {
                var old_list = data.icon_package;
                var new_list = old_list.concat(iconPack);
                var final_list = _.uniq(new_list);
                UserSchema.findByIdAndUpdate(self.__user_id, {$set: {'icon_package': final_list}}, function(err, numUp){
                    if(err || !numUp) callback(false, null, Error.ERROR_SERVER);
                    else {
                        callback(true, numUp, null);
                        self.__notif();
                    }
                });
            }
        });

	},
	pull: function(callback){
		var self = this;
		UserSchema.findById(self.__user_id, 'icon_package', function(err, data){
			if(err || !data) callback(false, null, Error.USER_NOT_EXIST);
			else self.__pullIcon(data.icon_package, callback);
		});
	}
};

module.exports = SyncIcon;