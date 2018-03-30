/**
 * Linked route
 */
'use strict';

const express = require('express');
var router = express.Router();

const Linked = require('../services/linked');

var provider = function (req, res) {
	var Service = new Linked(req);
	Service.provider(function (data) {
		res.send(data);
	});
};

var finsifyLink = function (req, res) {
	var Service = new Linked(req);
	Service.finsifyLink(function (data) {
		res.send(data);
	});
};

var callback = function (req, res) {
	var Service = new Linked(req);
	Service.finsifyCallback(() => {
		res.send('');
	});
};

var accounts = function (req, res) {
	var Service = new Linked(req);
	Service.accounts(function (data) {
		res.send(data);
	});
};

router.post('/provider', provider);
router.post('/accounts', accounts);
router.post('/finsify', finsifyLink);
router.get('/callback/:socketId/:provider_code/:data', callback);

module.exports = router;
