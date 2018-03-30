'use strict';

var mongoose = require('mongoose');
var PartnerDB = require('../../model/helper/mongodb_connect_partner');
var PartnerModel = PartnerDB.model('Partner');
var async = require('async');
var https = require('https');
var querystring = require('querystring');
var PUBLIC_KEY  = '6LeohPoSAAAAAEP1-VlqPbwMZ2p8V2SYRo7pmdfN',
	PRIVATE_KEY = '6LeohPoSAAAAADHRG7b990VChFE2PHGguFvXAlRb';
var env	= process.env.NODE_ENV;

var validateData = function(postData){
	if(postData){
		if(postData.account && postData.password && postData['g-recaptcha-response']) return true;
		else if (postData.account && postData.password && !postData['g-recaptcha-response']) {
			if (env === 'local') return true;
			else return 'Please check the recaptcha';
		}
		else return 'Please enter account & password';
	} else return 'Please enter account, password, recaptcha';
};

function verifyRecaptcha(key, callback) {
	if (env === 'local') return callback(true);

	var post_data = querystring.stringify({
		secret: PRIVATE_KEY,
		response: key
	});

	var post_options = {
		host: 'www.google.com',
		port: 443,
		path: '/recaptcha/api/siteverify',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	};

	//set up the post request
	var postReq = https.request(post_options, function(res){
		res.setEncoding('utf8');
		var data = "";
		res.on('data', function (chunk) {
			data += chunk.toString();
		});
		res.on('end', function() {
			var parsedData = JSON.parse(data);
			if (parsedData.success === true || parsedData.success === 'true') callback(true);
			else callback(false);
		});
	});

	//post the data
	postReq.write(post_data);
	postReq.end();
}

function setSession(req, data){
	req.session.partnerId = data._id;
	req.session.partnerEmail = data.email;
	req.session.partnerProvider = data.provider;
	req.session.partnerName = data.name;
	req.session.partnerIcon = data.provider.icon;
	req.session.partnerLastLogin = data.lastLogin;
	req.session.partnerProviderId = data.provider._id;
	req.session.partnerProviderRealId = data.provider.realId;
}

function removeSession(req){
	req.session.partnerId = null;
	req.session.partnerEmail = null;
	req.session.partnerProvider = null;
	req.session.partnerName = null;
	req.session.partnerIcon = null;
	req.session.partnerLastLogin = null;
	req.session.partnerProviderId = null;
	req.session.partnerProviderRealId = null;
}

var partnerLogin = function (email, password, callback) {
	PartnerModel.login(email, password, callback);
};

var renderLogin = function(res, error){
	res.render('login', {error: error}, function(err, html){
		res.send(html);
	});
};

var appLogin = function(req, res){
	renderLogin(res, false);
};

var appLoginPost = function(req, res){
	var postData = req.body;
	var link = req.headers.referer;
	var validate = validateData(postData);

	if (!validate){
		return renderLogin(res, validate);
	}

	verifyRecaptcha(postData['g-recaptcha-response'], function(status){
		if (!status) {
			return renderLogin(res, 'Wrong Recaptcha');
		}

		partnerLogin(postData.account, postData.password, function(err, data){
			if (err) {
				return renderLogin(res, 'Wrong email or password');
			}

			setSession(req, data);

			let i = link.indexOf('url=');

			if (i != -1) {
				res.redirect(link.slice(i+4));
			} else {
				res.redirect('/');
			}
		});
	});
};

var appLogout = function(req, res){
	removeSession(req);
	res.redirect('/login');
};

var appLogoutPost = function(req, res){
	removeSession(req);
	res.send({error: 0, msg: 'Done'});
};

var app404 = function(req, res){
	res.render('404', {env: env});
};

var appChangePassword = function(req, res){
	let oldPassword = req.body.op;
	let newPassword = req.body.np;

	if (!oldPassword || !newPassword) {
		return res.send({s: false});
	}

	let email = req.session.partnerEmail;

	let checkOldPassword = function(cb) {
		PartnerModel.login(email, oldPassword, function(err){
			cb(err);
		});
	};

	let changePassword = function(cb) {
		PartnerModel.changePassword(email, newPassword, function(err){
			cb(err);
		})
	};

	async.waterfall([
		checkOldPassword,
		changePassword
	], function(err){
		if (err) {
			res.send({s: false});
		} else {
			if (!req.session.partnerLastLogin) {
				req.session.partnerLastLogin = new Date();
			}

			res.send({s: true});
		}
	});
};

module.exports = function(app, config){
	app.get('/login', appLogin);
	app.post('/login', appLoginPost);
	app.get('/logout', appLogout);
	app.post('/logout', appLogoutPost);
	app.get('/404', app404);
	app.post('/change-password', appChangePassword);
};
