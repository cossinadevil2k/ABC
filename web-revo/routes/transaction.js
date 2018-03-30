/**
 * Transaction route
 */
'use strict';

const express = require('express');
var router = express.Router();

const transactionService = require('../services/transaction');

var list = function (req, res) {
	var Service = new transactionService(req);
	Service.list(function (data) {
		res.send(data);
	});
};

var add = function (req, res) {
	var Service = new transactionService(req);
	Service.add(function (data) {
		res.send(data);
	});
};

var editTransaction = function (req, res) {
	var Service = new transactionService(req);
	Service.edit(function (data) {
		res.send(data);
	});
};

var delTransaction = function (req, res) {
	var Service = new transactionService(req);
	Service.del(function (data) {
		res.send(data);
	});
};

router.post('/list', list);
router.post('/add', add);
router.post('/edit', editTransaction);
router.post('/delete', delTransaction);

module.exports = router;