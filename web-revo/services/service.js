/**
 * Service
 */

'use strict';

const config = require('../config');
const request = require('request');
const queryString = require('querystring');
const MoneyError = require('../config/syncError');
const mongoose = require('mongoose');
const requestAction = require('../config/requestAction');
const Permission = require('../../model/permission');
const pushController = require('../../model/sync/push_controller');
const utils = require('../../helper/utils');
const io = require('socket.io-emitter')({host: config.socket.host, port: config.socket.port});
const SyncCodes = require('../../config/sync_codes');
const SyncFlags = require('../../config/sync_contant');

class Service {
	constructor(req, schemas) {
		this.schema = [];
		this.data = req.body || req.query;
		this.params = req.params;
		this.query = req.query;
		this.session = req.session;
		this.userAgent = (typeof req.headers === 'object') ? req.headers['user-agent'] : `Money Lover Web/${config.version} (Web; PC; ...)`;
		this.requestHeaders = {
			'User-Agent': this.userAgent,
			'Content-Type': 'application/json'
		};

		this.config = config;
		this.sessionID = req.sessionID;
		this.userId = this.session ? this.session.userId : null;
		this.requestAction = requestAction;
		this.ip = utils.realIP(req.headers['x-forwarded-for'] || req.connection.remoteAddress);

		this._initSchema(schemas);
		this.io = io;
	}

	_initSchema(schemas) {
		if (!schemas) return;

		var self = this;
		schemas.forEach(function (item) {
			self.schema[item] = mongoose.model(item);
		});
	}

	notify(userId, walletId, keyCode, keyExtra) {
		let notifData = {
			user_id: userId,
			wallet_id: walletId,
			flag: SyncCodes[keyCode]
		};

		if (keyExtra) notifData.flag += SyncFlags[keyExtra];

		return pushController.pushSyncNotification(notifData);
	}

	callback(error, message, action, data, walletId) {
		var self = this;

		return function (callback) {
			let result = {
				error: error,
				msg: message,
				action: self.requestAction[action] || action
			};
			if (data) result.data = data;
			if (walletId) result.walletId = walletId;

			callback(result);
		}
	}

	pull(uriName, options, callback) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}

		if (this.session.user_id) {
			var data = this._pullParams(options.account_id, options.limit, options.skip, options.lastUpdate);
			this.setAcessToken(this.session.access_token);

			this.request('POST', uriName, data, callback, true);
		} else {
			callback({status: false, message: 'login_confirm'});
		}
	}

	push(uriName, options, callback) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}

		if (this.session.user_id) {
			var data = this._pullParams(options.account_id, options.limit, options.skip, options.lastUpdate);
			this.setAcessToken(this.session.access_token);
			this.setHeaders("Accept-Language", "en-US;q=1");

			this.request('POST', uriName, data, callback);
		} else {
			callback({status: false, message: 'login_confirm'});
		}
	}

	request(method, uriName, data, callback, disableAuth) {
		let self = this;
		let url = this._makeUrl(uriName);

		if (!url) return callback({status: false, message: 'web_page_not_found'});

		let options = {
			url: url,
			method: method,
			timeout: 10000
		};

		options.headers = this.getHeaders();

		if (!disableAuth) {
			options.auth = {
				user: config.appApi.key,
				pass: config.appApi.secret
			}
		}

		if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
			options.json = data;
		} else {
			options.qs = queryString.stringify(data);
		}

		request(options, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				callback(self._fixedBody(body));
			} else {
				if (error && error.code === 'ETIMEDOUT') {
					callback({
						status: false,
						message: MoneyError.ERROR_TIMEOUT
					});
				} else {
					//noinspection JSDuplicatedDeclaration
					callback({
						status: false,
						e: (error || response.statusText),
						statusCode: response ? response.statusCode : 0,
						message: MoneyError.ERROR_SERVER_MAINTENANCE
					});
				}
			}
		});
	}

	_makeUrl(name) {
		return `${config.url.base}${config.url[name]}`;
	}

	_fixedBody(body) {
		if (body.hasOwnProperty('s')) {
			body.status = body.s;
			delete body.s;
		}

		return body;
	}

	getHeaders() {
		return this.requestHeaders;
	}

	setHeaders(key, value) {
		this.requestHeaders[key] = value;
	}

	setAcessToken(access_token) {
		this.setHeaders('Authorization', 'Bearer ' + access_token);
	}

	sendMessage(status, message) {
		if (typeof message === 'number') {
			return this.sendMessageCode(status, message);
		} else {
			return {status: status, message: message};
		}
	}

	sendMessageCode(status, code) {
		return {status: status, message: this._getMessageFromCode(code)};
	}

	readPessission(userId, walletId) {
		return new Promise((resolve, reject) => {
			if (!userId) {
				return reject(false);
			}

			Permission.checkReadPermission(userId, walletId, (error, status) => {
				if (status) resolve(true);
				else reject(false);
			});
		});
	}

	writePermission(userId, walletId) {
		return new Promise((resolve, reject) => {
			if (!userId) {
				return reject(false);
			}

			Permission.checkWritePermission(userId, walletId, (error, status) => {
				if (status) resolve(true);
				else reject(false);
			});
		});
	}

	setAccountPermission(userId, walletId, read, write) {
		return new Promise((resolve, reject) => {
			if (!userId) {
				return reject(false);
			}

			Permission.setAccountPermission(userId, walletId, read, write, status => {
				if (status) resolve(true);
				else reject(false);
			});
		});
	}

	preSendData(result) {
		if (result.status === true) {
			return result;
		} else {
			return self.sendMessageCode(false, result.message);
		}
	}

	_getMessageFromCode(code) {
		console.log('_getMessageFromCode: %s', code);

		var str = '';
		switch (code) {
			case MoneyError.ERROR_TIMEOUT:
				str = 'sync_error_server_busy';
				break;
			case MoneyError.ERROR_SERVER_MAINTENANCE:
				str = 'sync_error_maintenance';
				break;
			case MoneyError.ERROR_LOGIN_FAIL:
				str = 'login_fail';
				break;
			case MoneyError.ERROR_EMAIL_EXISTS:
				str = 'register_error_email_exists';
				break;
			case MoneyError.ERROR_EVENT_EXPIRE:
				str = 'promote_event_expire';
				break;
			case MoneyError.ERROR_SERIALS:
				str = 'promote_event_error_wrong_code';
				break;
			case MoneyError.ERROR_SERVER:
				str = 'register_error_server';
				break;
			case MoneyError.ERROR_WARNING_INFO:
				str = 'register_error_entered_info_not_enough';
				break;
			case MoneyError.ERROR_EMAIL_OR_PASSWORD_WRONG:
				str = 'login_fail';
				break;
			case MoneyError.ERROR_EMAIL_INVALID:
				str = 'forgot_password_error_wrong_email';
				break;
			case MoneyError.ERROR_USER_ID_NULL:
				str = 'sync_error_user_id_null';
				break;
			case MoneyError.ERROR_SECRET_FAIL:
				str = 'sync_error_secret_fail';
				break;
			case MoneyError.ERROR_LIMIT_DEVICE:
				str = 'login_error_limit_device';
				break;
			case MoneyError.ERROR_USER_NOT_LOGIN:
				str = 'error_user_not_login';
				break;
			case MoneyError.ERROR_INVITE_DATA:
				str = 'error_invite_data';
				break;
			case MoneyError.ERROR_REMOVE_DEVICE:
				str = 'sync_error_remove_device';
				break;
			case MoneyError.ERROR_BIG_DATA:
				str = 'sync_error_big_data';
				break;
			case MoneyError.ERROR_EMAIL_NOT_EXIST:
				str = 'sync_error_email_not_exist';
				break;
			case MoneyError.ERROR_WALLET_INVALID:
				str = 'sync_error_wallet_invalid';
				break;
			case MoneyError.ERROR_NOT_GEN_SHARE_CODE:
				str = 'sync_error_not_gen_share_code';
				break;
			case MoneyError.ERROR_DATA_INVALID:
				str = 'sync_error_data_invalid';
				break;
			case MoneyError.ERROR_NOT_SHARE_MYSELF:
				str = 'sync_error_not_share_myself';
				break;
			case MoneyError.ERROR_WALLET_NOT_EXIST:
				str = 'sync_error_wallet_not_exist';
				break;
			case MoneyError.ERROR_SHARE_CODE_INVALID:
				str = 'sync_error_code_invalid';
				break;
			case MoneyError.ERROR_SET_PERMISSION_FAIL:
				str = 'sync_error_set_permission_fail';
				break;
			case MoneyError.ERROR_USER_NOT_EXIT:
				str = 'sync_error_user_not_exist';
				break;
			case MoneyError.ERROR_USER_HAVE_NOT_PERMISSION:
				str = 'sync_error_have_not_permission';
				break;
			case MoneyError.ERROR_USER_UNAUTHORIZED:
				str = 'sync_error_user_unauthorized';
				break;
			case MoneyError.ERROR_DATA_INVALID_FORMAT:
				str = 'sync_error_data_invalid_format';
				break;
			case MoneyError.ERROR_WALLET_CAN_NOT_READ:
				str = 'sync_error_wallet_can_not_read';
				break;
			case MoneyError.ERROR_WALLET_CAN_NOT_WRITE:
				str = 'sync_error_wallet_can_not_write';
				break;
			case MoneyError.ERROR_INFO:
				str = 'sync_error_info';
				break;
			case MoneyError.ERROR_NOT_DEL_WALLET_SHARED:
				str = 'sync_error_del_wallet_shared';
				break;
			case MoneyError.ERROR_PARAM_PASSWORD_INVALID:
				str = 'change_password_error_new_pass';
				break;
			case MoneyError.NO_CONNECTION_ERROR:
				str = 'no_internet';
				break;
			case MoneyError.ERROR_SOCIAL_ID_NOT_FOUND:
				str = 'ERROR_SOCIAL_ID_NOT_FOUND';
				break;
			case MoneyError.ERROR_SOCIAL_ID_AND_EMAIL_REGISTERED:
				str = 'ERROR_SOCIAL_ID_AND_EMAIL_REGISTERED';
				break;
			case MoneyError.ERROR_SOCIAL_EMAIL_REGISTERED_WITH_ANOTHER_SOCIAL_ID:
				str = 'social_login__duplicate_entered_email';
				break;
			default:
				str = 'connect_error_unknown';
				break;
		}

		return str;
	}

	_pullParams(account_id, limit, skip, lastUpdate) {
		var params = {
			limit: limit || 40,
			skip: skip || 0,
			lastUpdate: lastUpdate || 946684800, // 0:0:0 01-01-2000 GMT
			pl: config.platform,
			av: config.apiVersion
		};

		if (account_id) params.account_id = account_id;

		return params;

	}

	_pushParams(account_id, data) {
		return {
			account_id: account_id,
			data: data,
			pl: config.platform,
			av: config.apiVersion
		}
	}

	_makePushAccount(data) {
		var tmpData = [];

		data.forEach(function (account) {
			tmpData.push({
				n: account.name,
				c: account.currency,
				gid: account.wallet_id,
				ic: account.icon,
				et: account.exclude_total,
				at: account.account_type,
				md: account.metadata,
				ar: account.archived,
				tn: account.transaction_notification,
				f: account.flag
			});
		});

		return tmpData;
	}
}

module.exports = Service;
