/**
 * Finsify
 */
'use strict';

const config = require('../config');
const request = require('request');

class Finsify {
	constructor() {
		this._config = config.finsify;
	}

	createCustomer(email) {
		return new Promise(resolve => {
			this._api('POST', '/customers', {}, {
				identifier: email
			}, data => {
				resolve(data);
			});
		});
	}

	createToken(customer_id, provider_code, callback_url) {
		return new Promise(resolve => {
			this._api('POST', '/tokens/create', {}, {
				customer_id: customer_id,
				provider_code: provider_code,
				callback_url: callback_url
			}, data => {
				resolve(data);
			});
		});
	}

	refreshLogin(login_secret) {
		return new Promise(resolve => {
			this._api('PUT', '/logins/refresh', {
				'Login-secret': login_secret
			}, {}, data => {
				resolve(data);
			});
		});
	}

	deleteLogin(login_secret) {
		return new Promise(resolve => {
			this._api('DELETE', '/logins', {
				'Login-secret': login_secret
			}, {}, data => {
				resolve(data);
			});
		})
	}

	accounts(login_secret) {
		return new Promise(resolve => {
			this._api('GET', '/accounts', {
				'Login-secret': login_secret
			}, {}, data => {
				resolve(data);
			});
		});
	}

	_api(method, url, headers, params, callback) {
		var options = {
			method: method,
			url: this._makeUrl(url),
			headers: this._getHeaders(headers)
		};


		if (method === 'GET') {
			options.qs = params;
		} else {
			options.body = params || {};
			options.json = true
		}

		console.log('options', options);

		request(options, (error, res, body) => {
			if (!error && res.statusCode === 200) {
				body = (typeof body === 'string') ? JSON.parse(body) : body;
				callback(body);
			} else {
				callback({
					error: 'ErrorFinsify',
					message: 'Request error',
					raw: error || body
				});
			}
		});
	}

	_makeUrl(url) {
		return `${this._config.apiUrl}${url}`;
	}

	_getHeaders(headers) {
		return Object.assign({
			'Accept': 'application/json',
			'Content-type': 'application/json',
			'Client-id': this._config.clientId,
			'Service-secret': this._config.serviceSecret
		}, headers);
	}
}

module.exports = new Finsify();
