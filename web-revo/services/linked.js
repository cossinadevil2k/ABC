/**
 * Linked
 */
'use strict';

const Service = require('./service');
const providerDataUrl = 'https://static.moneylover.me/data/rw-provider/provider_cache_production.json';
const request = require('request');
const finsify = require('./finsify');

class Linked extends Service {
	constructor(req) {
		super(req, ['User']);
	}

	provider(callback) {
		request.get(providerDataUrl, (err, res, body) => {
			body = (typeof body === 'string') ? JSON.parse(body) : body;
			callback({data: body.data});
		});
	}

	finsifyLink(callback) {
		var data = this.query;

		console.log('finsifyLink', data);

		var userId = this.userId;
		if (userId) {
			this._getFinsifyLinkConnect(data, userId).then(result => {
				console.log('finsifyLink data', result);
				this.callback(0, 'success', 'linked_finsify', result)(callback);
			}, error => {
				console.log('error', error);
				var provider_code = data.provider_code;
				var client = data.client;
				var errorData = {
					connect_url: this._getCallbackUrlError(client, provider_code)
				};
				this.callback(1, 'server_error', 'linked_finsify', errorData)(callback);
			});
		} else {
			this.callback(1, 'user_unauthenticated', 'user_info')(callback);
		}
	}

	_getFinsifyLinkConnect(data, userId) {
		var provider_code = data.provider_code;
		var client = data.client;

		return new Promise((resolve, reject) => {
			this._getCustomerId(userId).then(customer_id => {
				finsify.createToken(
					customer_id, provider_code, this._getCallbackUrl(client, provider_code)
				).then(result => {
					if (result.error) {
						reject(result);
					} else {
						resolve(result);
					}
				}, error => {
					reject(error);
				});
			}, error => {
				reject(error);
			});
		});
	}

	_getCustomerId(userId) {
		var userSchema = this.schema['User'];

		return new Promise((resolve, reject) => {
			userSchema.findById(userId, (err, user) => {
				if (err) {
					reject({error: 'InternalError', raw: err});
				} else {
					var customerId = user.client_setting ? user.client_setting['fi_id'] : null;
					if (customerId) {
						resolve(customerId)
					} else {
						finsify.createCustomer(user.email).then(data => {
							if (data.error) {
								reject(data);
							} else {
								if (!user.client_setting) {
									user.client_setting = {};
								}
								user.client_setting['fi_id'] = data.customer_id;
								user.save(err => {
									if (err) {
										reject({error: 'InternalError', raw: err});
									} else {
										resolve(data.customer_id);
									}
								});
							}
						});
					}
				}
			});
		});
	}

	finsifyCallback(callback) {
		var params = this.params;
		var socketId = params.socketId;
		var provider_code = params.provider_code;
		var finsifyData = params.data;

		if (socketId && provider_code && finsifyData) {
			if (finsifyData === 'cancel') {
				finsifyData = {
					status: 'cancel'
				};
			} else if (finsifyData === 'error') {
				finsifyData = {
					status: 'error'
				};
			} else {
				finsifyData = JSON.parse(finsifyData);
				finsifyData.provider_code = provider_code;
			}

			this.io.emit(`linked:data:${socketId}`, finsifyData);
			callback({d: true});
		} else {
			callback({d: false});
		}
	}

	accounts(callback) {
		var data = this.data;
		var userId = this.userId;

		if (userId) {
			if (data.login_id && data.login_secret) {
				this._accounts(data).then(result => {
					console.log('Linked _accounts', result);
					this.callback(0, 'remove_account__success', 'linked_accounts', result)(callback);
				}, error => {
					console.log('Linked _accounts err', error);

					this.callback(1, 'remote_account__error__unknown_error', 'linked_accounts')(callback);
				});
			} else {
				this.callback(1, 'remote_account__error__unknown_error', 'linked_accounts')(callback);
			}
		} else {
			this.callback(1, 'user_unauthenticated', 'linked_accounts')(callback);
		}
	}

	_accounts(data) {
		return new Promise((resolve, reject) => {
			//-H "Login-secret: LOGIN_SECRET"
			finsify.accounts(data.login_secret).then(data => {
				if (data.error) {
					reject(data);
				} else {
					resolve(data);
				}
			})
		});
	}

	_getCallbackUrl(client, provider_code) {
		return this.config.web_url + '/linked/callback/' + client + '/' + provider_code;
	}

	_getCallbackUrlError(client, provider_code) {
		return this.config.web_url + '/linked/callback/' + client + '/' + provider_code + '/error';
	}
}

module.exports = Linked;
