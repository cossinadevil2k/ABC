/**
 * Main route
 */
'use strict';

var express = require('express');
var router = express.Router();
var config = require('../config');
const Linked = require('../services/linked');

var AppIndex = function (req, res, next) {
	if (req.path.indexOf('assets') > 0) next('route'); // for local

	res.render('index', {
		title: 'Money Lover Web',
		layout: config.layoutDefault || 'default'
	}, function (err, html) {
		if (err) next(err);
		else res.send(html);
	});
};

var Logout = function (req, res) {
	res.redirect('/api/user/logout');
};

var linkedCallback = (req, res) => {
	var Service = new Linked(req);
	Service.finsifyCallback(() => {
		res.send('<html></html>');
	});
};

var linkedFinsify = (req, res) => {
	var Service = new Linked(req);
	Service.finsifyLink((result) => {
		res.redirect(result.data.connect_url);
	});
};

router.get('/linked/finsify', linkedFinsify);
router.get('/linked/callback/:socketId/:provider_code/:data', linkedCallback);
router.get('/logout', Logout);
router.get('*', AppIndex);

module.exports = router;
