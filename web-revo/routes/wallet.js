/**
 * Wallet route
 */

var express = require('express');
var router = express.Router();

var wallet = require('../services/wallet');

var listWallet = function (req, res) {
	var WalletService = new wallet(req);
	WalletService.list(function (data) {
		res.send(data);
	});
};

var addWallet = function (req, res) {
	var WalletService = new wallet(req);
	WalletService.add(function (data) {
		res.send(data);
	});
};

var getBalance = function (req, res) {
	var WalletService = new wallet(req);
	WalletService.balance(function (data) {
		res.send(data);
	});
};

router.post('/list', listWallet);
router.post('/add', addWallet);
router.post('/balance', getBalance);

module.exports = router;
