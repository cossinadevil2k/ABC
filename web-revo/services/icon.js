/**
 * Icon
 */

'use strict';

const Service = require('./service');

const request = require('request');
const path = require('path');
const fs = require('fs');

class Icon extends Service {
	constructor(req) {
		super(req, ['User']);
	}

	dataPack(callback) {
		var packName = this.data.pack;
		var userId = this.userId;
		var self = this;

		this.schema['User'].findById(userId, 'icon_package', function (error, result) {
			if (result) {
				if (packName !== 'default' && result.icon_package.indexOf(packName) === -1) {
					self.callback(1, 'get_pack_icon_error', 'icon_pack')(callback);
				} else {
					let packNameUrl = `${self.config.url.static}/img/icon/${packName}/package.json`;
					request({
						uri: packNameUrl,
						headers: {
							'content-type': 'application/json'
						}
					}, function (err, res, packData) {
						if (res.statusCode === 200) {
							if (typeof packData === 'string') packData = JSON.parse(packData);
							self.callback(0, 'get_pack_icon_success', 'icon_pack', packData)(callback);
						} else {
							console.log('Pack', packNameUrl, res.statusCode);
							self.callback(1, 'get_pack_icon_error', 'icon_pack')(callback);
						}
					});
				}
			} else {
				self.callback(1, 'get_pack_icon_error', 'icon_pack')(callback);
			}
		});
	}

	list(callback) {
		var userId = this.userId;
		var self = this;

		this.schema['User'].findById(userId, 'icon_package', function (error, result) {
			if (result) {
				self.callback(1, 'get_list_icon_error', 'icon_list', result.icon_package)(callback);
			} else {
				self.callback(1, 'get_list_icon_error', 'icon_list')(callback);
			}
		});
	}
}

module.exports = Icon;