/**
 * Category route
 */
'use strict';

const express = require('express');
var router = express.Router();

const categoryService = require('../services/category');

var list = function (req, res) {
	var Service = new categoryService(req);
	Service.list(function (data) {
		res.send(data);
	});
};

var add = function (req, res) {
	var Service = new categoryService(req);
	Service.add(function (data) {
		res.send(data);
	});
};

router.post('/list', list);
router.post('/add', add);
module.exports = router;