/**
 * Icon
 */


var express = require('express');
var router = express.Router();

const IconService = require('../services/icon');

var dataPack = function (req, res) {
	var Service = new IconService(req);
	Service.dataPack(function (data) {
		res.send(data);
	});
};

router.post('/data', dataPack);

module.exports = router;