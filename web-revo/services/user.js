/**
 * User
 */
'use strict';

const graph = require('fbgraph');
const request = require('request');
const Service = require('./service');
const config = require('../config');
const Redis = require('../config/redis').redisClient;
const jwt = require('jsonwebtoken');
const moment = require('moment');
const uuid = require('node-uuid');
const debug = require('debug')('service:user');

var TagConstant = require('../../config/tag_constant');
var utils = require('../../helper/utils');
var Email = require('../../model/email');

class User extends Service {
	constructor(req) {
		super(req, ['User', 'Device']);

		this._socketRoomPrefix = '/web-notification/';
	}

	login(callback) {
		var userInfo = this.data;

		// console.log('UserInfo', userInfo);

		if (this._isLogin()) {
			this.callback(1, 'notification_center_message_already_logged_in', 'user_login')(callback);
		} else {
			this._login(userInfo, 'normal', callback);
		}
	}

	register(callback) {
		var userInfo = this.data;
		// console.log('UserInfo', userInfo);

		if (this._isLogin()) {
			this.callback(1, 'notification_center_message_already_logged_in', 'user_login')(callback);
		} else {
			this._register(userInfo, 'normal', callback);
		}
	}

	connect(callback) {
		var userInfo = this.data;
		// console.log('UserInfo', userInfo);

		switch (userInfo.social) {
			case 'google':
				this._googleConnect(userInfo, callback);
				break;
			case 'facebook':
				this._facebookConnect(userInfo, callback);
				break;
		}
	}

	logout(callback) {
		if (this.userId) {
			this._rmSession();
			this._rmDevice(this.userId);
			this.callback(0, 'web_you_have_logout', 'user_logout')(callback);
		} else {
			this.callback(1, 'web_you_have_not_logged', 'user_logout')(callback);
		}
	}

	forgotPassword(callback) {
		var self = this;
		let postData = this.data;

		if (this._validEmail(postData.email)) {
			this.schema['User'].findByEmail(postData.email, (err, user) => {
				if (user) {
					self._forgotPassword(user, callback);
				} else {
					self.callback(
						1, 'forgot_password_error_wrong_email', 'user_forgot_password'
					)(callback);
				}
			});
		} else {
			self.callback(
				1, 'forgot_password_error_wrong_email', 'user_forgot_password'
			)(callback);
		}
	}

	unsubscribe(callback) {
		var email = this.data.email;

		this.schema['User'].findByEmail(email, (error, user)=> {
			if (user) {
				callback(true);

				user.userSubscribe = false;
				user.save();
			} else {
				callback(false);
			}
		});
	}

	_forgotPassword(user, callback) {
		var expire = 7; // day;
		var self = this;
		var hashForgotPassword = this._generateHashForgotPassword(user, expire);
		this._savePinForgotPassword(hashForgotPassword.pin, user.email, expire, function (error, status) {
			if (error || !status) {
				self.callback(1, 'sync_error_server_busy', 'user_forgot_password')(callback);
			} else {
				self._sendMailForgotPassword(user, hashForgotPassword);
				hashForgotPassword = {};
				self.callback(0, 'forgot_pass_success', 'user_forgot_password', hashForgotPassword)(callback);
			}
		});
	}

	_sendMailForgotPassword(user, hashs) {
		var url = this._makeUrlForgotPassword(hashs.hash);
		var pin = hashs.pin;

		Email.forgotPassword2(user.email, url, pin, (status, data) => {
			// console.log(status, data);
		});
	}

	_makeUrlForgotPassword(hash) {
		return `${this.config.web_url}/forgot-password/${hash}`;
	}

	_savePinForgotPassword(pin, email, expire, callback) {
		var expireDay = (expire * 86400); // :)
		Redis.SETEX(this._generateKeyForgotPassword(pin), expireDay, email, callback);
	}

	_removePinForgotPassword(pin) {
		Redis.DEL(this._generateKeyForgotPassword(pin), () => {
		});
	}

	_generateKeyForgotPassword(pin) {
		return `ForgotPassword:${pin}`;
	}

	_generateHashForgotPassword(user, expireDay) {
		var pinCode = uuid.v4();
		return {
			pin: pinCode,
			hash: jwt.sign({
				email: user.email,
				userId: user._id,
				pin: pinCode
			}, this.config.secret, {
				expiresIn: `${expireDay}d`
			})
		};
	}

	_decodeHashForgotPassword(hash) {
		if (hash) {
			return jwt.verify(hash, this.config.secret);
		} else {
			return null;
		}
	}

	validPinCode(callback) {
		var self = this;
		var pinCode = this.data.pin;
		var email = this.data.email;

		this._validPinCode(pinCode, email, function (status) {
			if (status) {
				self.callback(0, 'web_confirm_pin_success', 'user_forgot_password')(callback);
			} else {
				self.callback(
					1, 'security_pin_title_wrong_password', 'user_forgot_password'
				)(callback);
			}
		});
	}

	_validPinCode(pinCode, email, callback) {
		Redis.GET(this._generateKeyForgotPassword(pinCode), function (error, data) {
			if (error || !data) callback(false);
			else callback(data === email);
		});
	}

	resetPassword(callback) {
		var userInfo = this.data;
		var self = this;

		if (!this.userId && userInfo.email && userInfo.password && userInfo.pin) {
			this._validPinCode(userInfo.pin, userInfo.email, function (status) {
				if (status) {
					self._resetPassword(userInfo, callback);
				} else {
					self.callback(
						1, 'sync_error_info', 'user_forgot_password'
					)(callback);
				}
			});
		} else {
		}
	}

	decode(callback) {
		var decoded = this._decodeHashForgotPassword(this.data.hash);
		if (decoded && decoded.userId) {
			this.callback(0, 'web_decode_success', 'user_forgot_password', {
				email: decoded.email,
				pin: decoded.pin
			})(callback);
		} else {
			this.callback(1, 'sync_error_data_invalid', 'user_forgot_password')(callback);
		}
	}

	_resetPassword(userInfo, callback) {
		var self = this;

		this.schema['User'].findByEmail(userInfo.email, function (error, user) {
			if (user) {
				// if (user.hashed_password === user.encryptPassword(userInfo.password, user.salt)) {
				// 	self.callback(
				// 		1, 'change_password_error_duplicate_pass', 'user_forgot_password'
				// 	)(callback);
				// } else {
				self._saveNewPassword(user, userInfo.password, userInfo.pin, callback);
				// }
			} else {
				self.callback(
					1, 'forgot_password_error_wrong_email', 'user_forgot_password'
				)(callback);
			}
		});
	}

	_saveNewPassword(user, password, pin, callback) {
		var self = this;

		user.hashed_password = user.encryptPassword(password, user.salt);
		user.save(err => {
			if (err) {
				self.callback(
					1, 'sync_error_server_busy', 'user_forgot_password'
				)(callback);
			} else {
				self._removePinForgotPassword(pin);
				self.callback(
					0, 'web_reset_password_success', 'user_forgot_password'
				)(callback);
			}
		});
	}

	_login(userInfo, type, callback) {
		switch (type) {
			case 'normal':
				this._loginNormal(userInfo, callback);
				break;
			case 'google':
				this._loginWithGoogle(userInfo, callback);
				break;
			case 'facebook':
				this._loginWithFacebook(userInfo, callback);
				break;
		}
	}

	_register(userInfo, type, callback) {
		switch (type) {
			case 'normal':
				this._registerNormal(userInfo, callback);
				break;
			case 'google':
				this._registerWithGoogle(userInfo, callback);
				break;
			case 'facebook':
				this._registerWithFacebook(userInfo, callback);
		}
	}

	_loginNormal(userInfo, callback) {
		var self = this;

		if (this._validEmail(userInfo.email) && this._validPassword(userInfo.password)) {
			this.schema['User'].userLogin(userInfo.email, userInfo.password, (err, user) => {
				if (user) {
					self._loggedCallback(user, 'web_login_success', 'user_login', callback);
				} else {
					self.callback(1, 'web_invalid_email_password', 'user_login')(callback);
				}
			});
		} else {
			console.log('valid fail');
			this.callback(1, 'web_invalid_email_password', 'user_login')(callback);
		}
	}

	_loginWithGoogle(userInfo, callback) {
		this._loggedCallback(userInfo, 'google_connect_success', 'user_connect', callback);
	}

	_loginWithFacebook(userInfo, callback) {
		this._loggedCallback(userInfo, 'facebook_connect_success', 'user_connect', callback);
	}

	_registerNormal(userInfo, callback) {
		var self = this;

		if (this._validEmail(userInfo.email) && this._validPassword(userInfo.password)) {
			this._emailExist(userInfo.email, function (status) {
				if (status) {
					self.callback(1, 'register_error_email_exists', 'user_register')(callback);
				} else {
					userInfo.ipRegistered = self.ip;
					self._createNewUser(userInfo, callback);
				}
			})
		} else {
			this.callback(1, 'sync_error_data_invalid', 'user_register')(callback);
		}
	}

	_registerWithGoogle(userInfo, callback) {
		var self = this;

		this.schema['User'].findByEmail(userInfo.email, function (error, user) {
			if (error) {
				self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
			} else if (user) {
				self._migrateUserGoogle(userInfo, user, callback);
			} else {
				self._createNewUserFromGoogle(userInfo, callback);
			}
		});
	}

	_registerWithFacebook(userInfo, callback, disableMigrate) {
		var self = this;

		this.schema['User'].findByEmail(userInfo.email, function (error, user) {
			if (error) {
				self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
			} else if (user) {
				if (disableMigrate) {
					self.callback(1, 'register_error_email_exists', 'user_connect')(callback);
				} else {
					self._migrateUserFacebook(userInfo, user, callback);
				}
			} else {
				self._createNewUserFromFacebook(userInfo, callback);
			}
		});
	}

	_createNewUser(userInfo, callback) {
		var self = this;

		var user = new this.schema['User'](this._makeNewUserInfo(userInfo));
		user.hashed_password = user.encryptPassword(userInfo.password, user.salt);

		user.save(function (error, user) {
			if (error) self.callback(1, 'sync_error_server_busy', 'user_register')(callback);
			else {
				self._loggedCallback(user, 'splash_screen__create_account__welcome', 'user_register', callback);
			}
		});
	}

	_createNewUserFromGoogle(userInfo, callback) {
		var self = this;
		userInfo.password = utils.uid(5);

		var user = new this.schema['User'](this._makeNewUserInfo(userInfo));
		user.hashed_password = user.encryptPassword(userInfo.password, user.salt);

		user.save(function (error, user) {
			if (error) self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
			else {
				self._loggedCallback(user, 'web_user_connect_success', 'user_connect', callback);
			}
		});
	}

	_createNewUserFromFacebook(userInfo, callback) {
		userInfo.password = utils.uid(5);

		var self = this;
		var user = new this.schema['User'](this._makeNewUserInfo(userInfo));
		user.hashed_password = user.encryptPassword(userInfo.password, user.salt);

		user.save(function (error, user) {
			if (error) {
				self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
			} else {
				self._loggedCallback(user, 'web_user_connect_success', 'user_connect', callback);
			}
		});
	}

	_migrateUserGoogle(userInfo, user, callback) {
		var self = this;
		user.googleId = userInfo.googleId;
		user.user_info = this._mapUserInfo(userInfo);

		user.save((error) => {
			if (error) {
				self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
			} else {
				self._loggedCallback(user, 'web_user_connect_success', 'user_connect', callback);
			}
		});
	}

	_migrateUserFacebook(userInfo, user, callback) {
		var self = this;
		if (user.facebookId) {
			self.callback(1, 'register_error_email_exists', 'user_connect')(callback);
		} else {
			user.facebookId = userInfo.facebookId;
			user.user_info = this._mapUserInfo(userInfo);

			user.save((error) => {
				if (error) {
					self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
				} else {
					self._loggedCallback(user, 'web_user_connect_success', 'user_connect', callback);
				}
			});
		}
	}

	_makeNewUserInfo(userInfo) {
		let user = {};
		user = Object.assign(user, userInfo);

		user.salt = utils.uid(5);
		user.acceptSync = true;
		user.ipRegistered = this.ip;
		user.user_info = this._mapUserInfo(userInfo);

		return user;
	}

	_linkWithGoogle(userInfo, callback, user) {
		var self = this;
		if (user) {
			if (userInfo.email === user.email) {
				self.callback(1, 'ERROR_SOCIAL_ID_AND_EMAIL_REGISTERED', 'user_connect')(callback);
			} else {
				self.callback(1, 'web_error_your_account_connect_to_email_other', 'user_connect')(callback);
			}
		} else {
			this.schema['User'].findById(this.userId, (error, user) => {
				if (error || !user) {
					self.callback(1, 'web_link_error', 'user_connect')(callback);
				} else {
					user.googleId = userInfo.googleId;
					user.save(error => {
						if (error) {
							self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
						} else {
							self.callback(0, 'web_link_user_success', 'user_connect')(callback);
						}
					});
				}
			});
		}
	}

	_linkWithFacebook(userInfo, callback, user) {
		var self = this;
		if (user) {
			if (userInfo.email === user.email) {
				self.callback(1, 'ERROR_SOCIAL_ID_AND_EMAIL_REGISTERED', 'user_connect')(callback);
			} else {
				self.callback(1, 'web_error_your_account_connect_to_email_other', 'user_connect')(callback);
			}
		} else {
			this.schema['User'].findById(this.userId, (error, user) => {
				if (error || !user) {
					self.callback(1, 'web_link_error', 'user_connect')(callback);
				} else {
					user.facebookId = userInfo.facebookId;
					user.save(error => {
						if (error) {
							self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
						} else {
							self.callback(0, 'web_link_user_success', 'user_connect')(callback);
						}
					});
				}
			});
		}
	}

	_mapUserInfo(userInfo) {
		var user_info = {};

		if (userInfo.name) {
			user_info.name = userInfo.name;
		}

		if (userInfo.birthday) {
			if (userInfo.social === 'facebook') {
				user_info.birthday = moment(userInfo.birthday, 'MM/DD/YYYY').format();
			}
		}

		return user_info;
	}

	_emailExist(email, callback) {
		this.schema['User'].findByEmail(email, function (err, result) {
			callback(!!result);
		});
	}

	_validEmail(email) {
		if (email) return utils.isEmail(email);

		return false;
	}

	_validPassword(password) {
		return password.length > 5;
	}

	_loggedCallback(userInfo, message, action, callback) {
		this._setSession(userInfo);
		this._addDevice(userInfo);
		this.callback(
			0, message, action, {
				_id: userInfo._id,
				email: userInfo.email,
				client_setting: userInfo.client_setting,
				icon_package: userInfo.icon_package,
				purchased: userInfo.purchased
			}
		)(callback);
	}

	_setSession(userInfo) {
		this.session.userId = userInfo._id;
	}

	_rmSession() {
		this.session.destroy();
	}

	_addDevice(userInfo) {
		var self = this;
		var socketRoom = this._generateSocketRoom(userInfo._id);

		this.schema['Device'].findOne({deviceId: socketRoom}, (err, device) => {
			if (err) {
				// console.log(err);
			} else {
				if (device) {
					if (!device.owner) {
						device.owner = userInfo._id;
						device.save(function (err) {
							// over write device
							// console.log(err);
						});
					}
				} else {
					self._addNewDevice(socketRoom, userInfo._id);
				}
			}
		});
	}

	_rmDevice(userId) {
		var self = this;
		var deviceId = this._generateSocketRoom(userId);
		var message = {
			dataMessage: {ac: 7}
		};

		this.schema['Device'].remove({deviceId: deviceId}, function () {
			self.io.emit(deviceId, JSON.stringify(message));
		});
	}

	_addNewDevice(deviceId, userId) {
		var self = this;
		var deviceInfo = new this.schema['Device']({
			name: "Web Browser",
			platform: 7,
			deviceId: deviceId,
			owner: userId,
			tokenDevice: 'web',
			appId: 7
		});

		deviceInfo.save((err, result) => {
			if (result) {
				self.schema['User'].updateTags(userId, [TagConstant.DEVICE_WEB], () => {
				});
			}
		});
	}

	_generateSocketRoom(userId) {
		return `${this._socketRoomPrefix}${userId}`;
	}

	socialConnect(callback) {
		callback(require('../api/social-connect.json'));
	}

	getUserInfo(callback) {
		var self = this;
		var userId = this.userId;

		if (userId) {
			this.schema['User'].findById(
				userId, 'email client_setting icon_package purchased', function (err, user) {
					if (err || !user) {
						self.callback(1, 'user_unauthenticated', 'user_info')(callback);
					} else {
						self.callback(0, 'get_info_success', 'user_info', user)(callback);
					}
				}
			);
		} else {
			this.callback(1, 'user_unauthenticated', 'user_info')(callback);
		}
	}

	accountInfo(callback) {
		var self = this;
		var userId = this.userId;
		this.schema['Device'].findByUser(userId, result => {
			if (result === false) {
				self.callback(1, 'sync_error_server_busy', 'user_info_device')(callback);
			} else {
				self.callback(0, 'get_list_device_success', 'user_info_device', result)(callback);
			}
		});
	}

	_facebookConnect(userInfo, callback) {
		var self = this;

		this._validFacebookData(userInfo.facebookId, userInfo.access_token, function (status) {
			if (status) {
				self.schema['User'].findByFacebookId(userInfo.facebookId, (error, user) => {
					if (error) {
						self.callback(1, 'sync_error_server_busy', 'user_connect')(callback);
					} else {
						if (userInfo.action === 'link') {
							self._linkWithFacebook(userInfo, callback, (user || {}));
						} else {
							if (user) {
								self._loggedCallback(user, 'web_user_connect_success', 'user_connect', callback);
							} else {
								if (self._validEmail(userInfo.email)) {
									self._registerWithFacebook(userInfo, callback, true);
								} else {
									self.callback(1, 'email_address_invalid', 'user_connect')(callback);
								}
							}
						}
					}
				});
			} else {
				self.callback(1, 'sync_error_data_invalid_format', 'user_connect')(callback);
			}
		});
	}

	_googleConnect(userInfo, callback) {
		var self = this;

		this._validGoogleData(userInfo.googleId, userInfo.access_token, function (status) {
			if (status) {
				self.schema['User'].findByGoogleId(userInfo.googleId, function (error, user) {
					if (user) {
						if (userInfo.action === 'link') {
							self._linkWithGoogle(userInfo, callback, user);
						} else {
							self._loggedCallback(user, 'web_user_connect_success', 'user_connect', callback);
						}
					} else {
						if (userInfo.action === 'link') {
							self._linkWithGoogle(userInfo, callback);
						} else {
							self._registerWithGoogle(userInfo, callback);
						}
					}
				});
			} else {
				self.callback(1, 'sync_error_data_invalid_format', 'user_connect')(callback);
			}
		});
	}

	_validFacebookData(userID, access_token, callback) {
		graph.setAccessToken(access_token);
		graph.get(userID, function (err, res) {
			if (err || !res) {
				callback(false);
			} else {
				callback(res.id == userID);
			}
		});
	}

	_validGoogleData(userID, id_token, callback) {
		request.get('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + id_token, function (err, res, body) {
			if (err || !body) callback(false);
			else {
				body = JSON.parse(body);
				callback(body.sub == userID);
			}
		});
	}

	_isLogin() {
		return !!this.userId;
	}
}

module.exports = User;
