/*
	Home page
*/

'use strict';

let mongoose = require('mongoose');
let Admin = mongoose.model('Administrator');
let async = require('async');
let https = require('https');
let querystring = require('querystring');
let PUBLIC_KEY = '6LeohPoSAAAAAEP1-VlqPbwMZ2p8V2SYRo7pmdfN',
	PRIVATE_KEY = '6LeohPoSAAAAADHRG7b990VChFE2PHGguFvXAlRb';
let env = process.env.NODE_ENV;

let validateData = function (postData) {
	if (postData) {
		if (postData.account && postData.password && postData['g-recaptcha-response']) return true;
		else if (postData.account && postData.password && !postData['g-recaptcha-response']) {
			if (env === 'local') return true;
			else return 'Please check the recaptcha';
		}
		else return 'Please enter account & password';
	} else return 'Please enter account, password, recaptcha';
};

function verifyRecaptcha(key, callback) {
	if (env === 'local') return callback(true);

	let post_data = querystring.stringify({
		secret: PRIVATE_KEY,
		response: key
	});

	let post_options = {
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
	let postReq = https.request(post_options, function (res) {
		res.setEncoding('utf8');
		let data = "";
		res.on('data', function (chunk) {
			data += chunk.toString();
		});
		res.on('end', function () {
			let parsedData = JSON.parse(data);
			if (parsedData.success === true || parsedData.success === 'true') callback(true);
			else callback(false);
		});
	});

	//post the data
	postReq.write(post_data);
	postReq.end();
}

let adminLogin = function (username, password, callback) {
	Admin.findAdmin({ username: username.toLowerCase() }, 'hash_password salt isAdminSystem role permission', function (err, admin) {
		if (admin) {
			if (admin.authenticate(password)) {
				admin.updateLastLogin();
				callback(true, { id: admin._id, username: username, isAdminSystem: admin.isAdminSystem, role: admin.role, permission: admin.permission });
			}
			else callback(false, 'Invalid account or password');
		} else callback(false, 'Invalid account or password');
	});
};

let renderLogin = function (res, error) {
	res.render('login', { error: error }, function (err, html) {
		res.send(html);
	});
};

let appLogin = function (req, res) {
	renderLogin(res, false);
};

let appLoginPost = function (req, res) {
	let postData = req.body;
	let link = req.headers.referer;
	let validate = validateData(postData);
	if (validate === true) {
		verifyRecaptcha(postData['g-recaptcha-response'], function (status) {
			if (status) {
				adminLogin(postData.account, postData.password, function (status, data) {
					if (status) {
						Admin.setSession(req, data.id, data.username, data.isAdminSystem, data.role, data.permission);
						let i = link.indexOf('url=');
						if (i != -1) {
							res.redirect(link.slice(i + 4));
						} else res.redirect('/');
					} else renderLogin(res, data);
				});
			} else renderLogin(res, 'Wrong Recaptcha');
		});
	} else renderLogin(res, validate);
};

let appLogout = function (req, res) {
	Admin.removeSession(req);
	res.redirect('/login');
};

let appLogoutPost = function (req, res) {
	Admin.removeSession(req);
	res.send({ error: 0, msg: 'Done' });
};

let app404 = function (req, res) {
	res.render('404', { env: env });
};


module.exports = function (app, config) {
	app.get('/login', appLogin);
	app.post('/login', appLoginPost);
	app.get('/logout', appLogout);
	app.post('/logout', appLogoutPost);
	app.get('/404', app404);
};