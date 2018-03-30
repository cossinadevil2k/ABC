/**
 * Passport auth jwt hook
 */

'use strict';

const mongoose = require('mongoose');
const uuid = require('node-uuid');
const jwt = require('jsonwebtoken');
const async = require('async');
const moment = require('moment');
const _ = require('lodash');

const PassportError = function (done, err) {
	if (err) {
		console.log(err);
	}

	return done({error: err}, false);
};

const ClientSchema = mongoose.model('ClientKey');
const UserSchema = mongoose.model('User');
const RefreshTokenSchema = mongoose.model('RefreshToken');

const Error = require('../config/error');

// restify get path;
var getPath = function (req) {
	return req.route ? req.route.path : req.path;
};

var urlRequireForRequestToken = ['/auth/token', '/facebook-register', '/google-register', '/register', '/forgot-password'];

var AuthJWTHook = {
	verify: function (config) {
		return function (req, jwt_payload, done) {
			// console.log('payload', jwt_payload);

			// Logic
			if (req.authenticate.client === jwt_payload.client_id) {
				switch (jwt_payload.type) {
					case 'request-token':
						AuthJWTHook._verifyRequestToken(req, jwt_payload, done, config);
						break;
					case 'refresh-token':
						AuthJWTHook._verifyRefreshToken(req, jwt_payload, done, config);
						break;
					case 'access-token':
						done(null, jwt_payload);
						break;
					default:
						PassportError(done);
				}
			} else {
				PassportError(done);
			}
		}
	},

	// Set userId to req
	passportCallback: function (req, res, next) {
		return function (err, user, info) {
			if (user) {
				req.userId = user.userId;
				req.tokenDevice = user.code;
				next();
			} else {
				next(err || info);
			}
		};
	},

	requestTokenCallback: function (req, res, next) {
		return function (error, token) {
			res.send(token);
		}
	},

	/*
	 more in req
	 req.authenticate = {
	 client: '14235l4tjgksdsjdlkfs',
	 secret: '3o432492rjfksdfjslkdfjsdkl'
	 };

	 */
	generateRequestToken: function (req, res, next, config) {
		var clientInfo = req.authenticate;

		ClientSchema.findOne({
			client: clientInfo.client,
			secret: clientInfo.secret,
			isDisabled: false
		}, function (error, client) {
			if (client) {
				var token = AuthJWTHook._generateJWTToken(
					'request-token', config.secret, `${config.requestTokenExpire}s`, {
						clientId: client._id,
						client_id: client.client
					}
				);
				res.send({status: true, request_token: token});
			} else {
				res.send({
					status: false,
					message: Error['OAUTH_ERROR_CLIENT_SECRET_NOT_VALIDATE']
				});
			}
		});
	},

	generateAccessToken: function (req, res, next, config) {
		// Logic for generate token
		return function (error, tokenInfo) {
			if (tokenInfo && tokenInfo.type === 'request-token') {
				var client_id = tokenInfo.client_id;
				var clientId = tokenInfo.clientId;
				var postData = req.body;

				AuthJWTHook._login(clientId, client_id, postData, config, function (error, data) {
					if (error) {
						res.send({
							status: false,
							message: error
						});
					} else {
						res.send({
							status: true,
							access_token: data.access_token,
							expire: data.expire,
							refresh_token: data.refresh_token
						});
					}
				});
			} else {

				res.send({
					status: false,
					message: Error['OAUTH_ERROR_CLIENT_SECRET_NOT_VALIDATE']
				});
			}
		};
	},

	generateRefreshToken: function (req, res, next, config) {
		return function (error, tokenInfo) {
			if (tokenInfo && tokenInfo.type === 'refresh-token') {
				AuthJWTHook._generateToken(
					tokenInfo.clientId,
					tokenInfo.client_id,
					tokenInfo.userId,
					config.secret,
					tokenInfo.key,
					config,
					function (error, results) {
						if (error) {
							res.send({
								status: false,
								message: Error['']
							});
						} else {
							res.send({
								status: true,
								access_token: results.access_token.token,
								expire: results.access_token.expire,
								refresh_token: results.refresh_token
							});
						}
					},
					tokenInfo.deviceKey
				);
			} else {
				res.send({
					status: false,
					message: Error['OAUTH_ERROR_CLIENT_SECRET_NOT_VALIDATE']
				});
			}
		};
	},

	_generateToken: function (clientId, client_id, userId, secret, key, config, callback, deviceKey) {
		async.parallel({
			refresh_token: function (callback) {
				AuthJWTHook._createRefreshToken(
					clientId, client_id, userId, secret, config, callback, deviceKey
				);
			},
			access_token: function (callback) {
				AuthJWTHook._createAccessToken(
					clientId, client_id, userId, secret, config, callback, deviceKey
				);
			},
			clean_refresh_token: function (callback) {
				if (key) {
					AuthJWTHook._cleanRefreshToken(key, callback);
				} else {
					callback(null, true);
				}
			}
		}, callback);
	},

	_createRefreshToken: function (clientId, client_id, userId, secret, config, callback, deviceKey) {
		var key = uuid.v4();

		var token = AuthJWTHook._generateJWTToken('refresh-token', secret, `${config.refreshTokenExpire}s`, {
			clientId: clientId,
			client_id: client_id,
			userId: userId,
			key: key,
			deviceKey: deviceKey
		});

		RefreshTokenSchema.addKey(key, clientId, userId, function (error) {
			if (error) callback(error, null);
			else callback(null, token);
		});
	},

	_cleanRefreshToken: function (key, callback) {
		RefreshTokenSchema.deleteKey(key, callback);
	},

	_createAccessToken: function (clientId, client_id, userId, secret, config, callback, deviceKey) {
		var attachInfo = {
			clientId: clientId,
			client_id: client_id,
			userId: userId,
			code: deviceKey
		};

		var token = AuthJWTHook._generateJWTToken('access-token', secret, `${config.accessTokenExpire}s`, attachInfo);

		callback(null, {
			token: token,
			expire: AuthJWTHook._getExpire(config.accessTokenExpire)
		});
	},

	_verifyRequestToken: function (req, jwt_payload, done, config) {
		if (urlRequireForRequestToken.indexOf(getPath(req)) > -1) {
			done(null, jwt_payload);
		} else {
			PassportError(done);
		}
	},

	_verifyRefreshToken: function (req, jwt_payload, done, config) {
		// Valid refresh token

		console.log('OK');

		if (config.refreshTokenEndpoint === getPath(req) && jwt_payload.deviceKey) {
			RefreshTokenSchema.findByKey(jwt_payload.key, function (error, token) {
				console.log(error, token);


				if (token && token.validInfo(jwt_payload.clientId, jwt_payload.userId)) {
					console.log('OK');
					done(null, jwt_payload);
				} else {
					console.log('Error');
					PassportError(done, error);
				}
			});
		} else {
			console.log(error);
			PassportError(done, error);
		}
	},

	_generateJWTToken: function (type, secret, expire, extraData) {
		extraData = extraData || {};

		var token_payload = {
			type: type,
			code: uuid.v4()
		};

		token_payload = Object.assign(token_payload, extraData);

		return jwt.sign(token_payload, secret, {
			expiresIn: expire
		});
	},

	_getExpire: function (day) {
		return moment().add(day, 's').format('X');
	},

	_login: function (clientId, client_id, postData, config, callback) {
		var condition = {};

		switch (postData.action) {
			case 'moneylover':
				condition.email = postData.email.toLowerCase();
				break;
			case 'google':
				condition.googleId = postData.ggId;
				break;
			case 'facebook':
				condition.facebookId = postData.fbId;
				break;

		}

		if (_.size(condition) === 1) {
			UserSchema.findOne(condition, function (error, user) {
				if (user) {
					var logged = false;

					if (condition.email) {
						logged = user.authenticate(postData.password);
					} else if (condition.googleId) {
						logged = true;
					} else if (condition.facebookId) {
						logged = true;
					}

					if (logged) {
						var deviceKey = uuid.v4();

						AuthJWTHook._generateToken(
							clientId,
							client_id,
							user._id,
							config.secret,
							null,
							config,
							function (error, results) {
								if (error) {
									callback(Error['ERROR_SERVER']);
								} else {
									callback(null, {
										access_token: results.access_token.token,
										expire: results.access_token.expire,
										refresh_token: results.refresh_token
									});
								}
							}, deviceKey
						);
					} else {
						callback(Error['USER_ERROR_EMAIL_OR_PASSWORD']);
					}
				} else {
					callback(Error['USER_ERROR_EMAIL_OR_PASSWORD']);
				}
			});
		} else {
			callback(Error['USER_ERROR_EMAIL_OR_PASSWORD'])
		}
	}
};

module.exports = AuthJWTHook;