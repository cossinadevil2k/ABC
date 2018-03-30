/**
 * MoneyLover Oauth
 */
var jwt = require('jsonwebtoken');

module.exports = function (config) {
	var _config = {
		authorization: 'AuthJWT',
		clientName: 'client_id',
		secret: '123456'
	};

	config = config || {};

	if (!config.secret) {
		throw "Secret is empty";
	}

	config = Object.assign(_config, config);

	var decodeJwt = function (token, callback) {
		jwt.verify(token, config.secret, function (err, decoded) {
			if (err) callback(false);
			else callback(decoded);
		});
	};

	var getToken = function (authorization) {
		if (authorization) {
			authorization = authorization.split(' ');
			if (authorization[0] === config.authorization) {
				return authorization[1];
			} else {
				return null;
			}
		} else {
			return null;
		}
	};

	var setTokenToReq = function (req, data) {
		req.user_id = data.userId;
		req.tokenDevice = data.tokenDevice;
	};

	return function (req, res, next) {
		var headers = req['headers'];
		var authenticate = getToken(headers['authorization']);
		var client_id = req.headers[config.clientName];

		if (authenticate) {
			decodeJwt(authenticate, function (decoded) {
				if (decoded && decoded.type === 'access-token' && decoded.client === client_id) {
					setTokenToReq(req, decoded);
					next();
				} else {
					res.send({
						s: false,
						e: 706,
						message: "Not authorized error"
					});
				}
			});
		} else {
			next();
		}
	}
};