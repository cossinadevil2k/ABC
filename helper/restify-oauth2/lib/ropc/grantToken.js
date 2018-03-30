// "use strict";

var restify = require("restify");
var _ = require("underscore");

function validateEmail(email) {
	var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}

module.exports = function grantToken(req, res, next, options) {
	function sendError(errorStatus) {
		//console.log('Token error: ' + errorStatus);
		res.send(200, {
			status: false,
			message: errorStatus
		});
	}

	function sendOAuthError(errorClass, errorType, errorDescription) {
		var body = {
			error: errorType,
			error_description: errorDescription
		};
		// var error = new restify[errorClass + "Error"]({ message: errorDescription, body: body });
		// next(error);
		res.send(200, body);
	}

	function sendBadRequestError(type, description) {
		sendOAuthError("BadRequest", type, description);
	}

	function sendUnauthorizedError(description) {
		res.header("WWW-Authenticate", "Basic realm=\"" + description + "\"");
		sendOAuthError("Unauthorized", "invalid_client", description);
	}

	var postData = req.body;

	if (!postData || typeof postData !== "object") {
		// return sendBadRequestError("invalid_request", "Must supply a body.");
		return sendError(202);
	}

	if (!_.has(postData, "grant_type")) {
		return sendError(202);
		// return sendBadRequestError("invalid_request", "Must specify grant_type field.");
	}

	if (postData.grant_type !== "password") {
		return sendError(202);
		// return sendBadRequestError("unsupported_grant_type", "Only grant_type=password is supported.");
	}

	var email = postData.email;
	var password = postData.password;
	var purchased = postData.purchased;
	//var lang = postData.lang;
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ip) {
		ip = ip.split(',')[0];
	}
	var activeId = postData.activeId;
	var deviceInfo = {
		deviceId: postData.did,
		version: postData.v || 0,
		platform: postData.pl,
		appId: postData.aid
	};

	if (postData.uc) deviceInfo.uniqueCode = postData.uc;
	if (postData.na) deviceInfo.name = postData.na;

	var apiVersion = req.headers.apiversion || 1;

	if (!email) {
		return sendError(202);
		// return sendBadRequestError("invalid_request", "Must specify email field.");
	} else {
		if (!validateEmail(email)) {
			return sendError(202);
		}
	}

	if (!password) {
		return sendError(202);
		// return sendBadRequestError("invalid_request", "Must specify password field.");
	}

	if (!req.authorization || !req.authorization.basic) {
		return sendError(202);
		// return sendBadRequestError("invalid_request", "Must include a basic access authentication header.");
	}

	var clientId = req.authorization.basic.username;
	var clientSecret = req.authorization.basic.password;

	try {
		apiVersion = parseInt(apiVersion, 10);
	} catch(e){
		apiVersion = 1;
	}

	options.hooks.validateClient(clientId, clientSecret, function(error, result) {
		if (error) return next(error);

		if (!result) {
			return sendError(210);
			// return sendUnauthorizedError("Client ID and secret did not validate.");
		} else {
			var info = {
				email: email,
				password: password,
				purchased: purchased,
				ip: ip,
				activeId: activeId,
				deviceInfo: deviceInfo,
				apiVersion: apiVersion
			};

			options.hooks.grantUserToken(info, function(error, token, expires, user_id, purchased, acceptSync, limitDevice, pending, expireDate, firstPurchase, lastPurchase, user_email, device) {
				if (error) {
					if(error === 904) return sendError(904);
					else return sendError(205);
					// return next(error);
				}

				if (!token) {
					return sendError(205);
					// return sendUnauthorizedError("Username and password did not authenticate.");
				}

				var oauth2Data = {
					status: true,
					purchased: purchased,
					access_token: token,
					expires: expires,
					token_type: "Bearer",
					user_id: user_id,
					sync: acceptSync,
					lm: limitDevice,
					pen: pending,
					ed: expireDate,
					fp: firstPurchase,
					lp: lastPurchase,
					user_email: user_email
				};

				if (device) oauth2Data.device_id = device._id;

				res.send(oauth2Data);
			});
		}
	});
};
