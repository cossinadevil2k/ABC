'use strict';

let env			= process.env.NODE_ENV;
let mongoose	= require('mongoose');
let UserSchema	= mongoose.model('User');
const config	= require('../../config/config')[env];
const Error		= require('../../config/error');
const _			= require('underscore');
let fs 			= require('fs');
const https = require('https');

class SyncIcon {
	constructor(req){
		this.syncCode = 900;
		this.__Schema = UserSchema;
		this.__request = null;
		this.__user_id = null;
		this.__req = req;
		this.__iconPackage = null;

		this.__setRequest(req);
	}
	
	__setRequest(req) {
		this.__request = req.body;
		this.__user_id = req.user_id;
	}
	
	__initIcon(){
		this.__iconPackage = require(config.iconPack);
	}

	__parseIcon(){
		let IconData = this.__request.p;
		let minListIcon = _.uniq(IconData);
	
		return minListIcon;
	}

	__getPublicIconInfo(callback){
		let requestOptions = {
			host: 'static.moneylover.me',
			path: '/icon_pack/icon_pack.json',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		};

		let request = https.request(requestOptions, function(response){
			response.setEncoding('utf8');
			let data = "";
			response.on('data', function (chunk) {
				data += chunk.toString();
			});
			response.on('end', function() {
				try {
					let parsedData = JSON.parse(data);
					callback(null, parsedData);
				} catch (e) {
					callback('ServerError');
				}
			});
		});

		request.end();
	}

	__pullIcon(iconPack, callback){
		let tmpPackage = [];

		// this.__getPublicIconInfo((err, data) => {
		fs.readFile(config.iconPack, (err, data) => {
			if (err) {
				return callback(Error.ERROR_SERVER);
			}

			let iconFile = JSON.parse(data.toString());

			iconPack.forEach(function(icon_product_id){
				iconFile.forEach(function(iconData){
					if (iconData.product_id == icon_product_id) {
						tmpPackage.push({product_id: iconData.product_id, name: iconData.name, link: iconData.link});
					}
				});
			});

			callback(null, tmpPackage);
		});
	}

	pushToDB(callback){
		let iconPack = this.__parseIcon();

		UserSchema.findById(this.__user_id, (err, data) => {
			if (err) {
				return callback(err);
			}

			if (!data) {
				return callback('User not found');
			}

			let old_list = data.icon_package;
			let new_list = old_list.concat(iconPack);
			let final_list = _.uniq(new_list);

			UserSchema.findByIdAndUpdate(this.__user_id, {$set: {'icon_package': final_list}}, (err2) => {
				if (err2) {
					return callback(err2);
				}

				callback();
			});
		});

	}

	pull(callback){
		UserSchema.findById(this.__user_id, 'icon_package', (err, data) => {
			if (err) {
				return callback(err);
			}

			if (!data) {
				return callback('User not found');
			}

			this.__pullIcon(data.icon_package, callback);
		});
	}
}

exports.SyncIcon = SyncIcon;