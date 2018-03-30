/**
 * User route
 */

var express = require('express');
var router = express.Router();

var userService = require('../services/user');

var AppIndex = function (req, res) {
	res.send({s: false});
};

var login = function (req, res) {
	var UserService = new userService(req);
	UserService.login(function (data) {
		res.send(data);
	});
};

var register = function (req, res) {
	var UserService = new userService(req);
	UserService.register(function (data) {
		res.send(data);
	});
};

var forgotPassword = function (req, res) {
	var UserService = new userService(req);
	UserService.forgotPassword(function (data) {
		res.send(data);
	});
};

var validPin = function (req, res) {
	var UserService = new userService(req);
	UserService.validPinCode(function (data) {
		res.send(data);
	});
};

var resetPassword = function (req, res) {
	var UserService = new userService(req);
	UserService.resetPassword(function (data) {
		res.send(data);
	});
};

var decodeHash = function (req, res) {
	var UserService = new userService(req);
	UserService.decode(function (data) {
		res.send(data);
	});
};

var socialConnect = function (req, res) {
	var UserService = new userService(req);
	UserService.connect(function (data) {
		res.send(data);
	});
};

var getUserInfo = function (req, res) {
	var UserSevice = new userService(req);
	UserSevice.getUserInfo(function (data) {
		res.send(data);
	});
};

var getAccountInfo = function (req, res) {
	var UserService = new userService(req);
	UserService.accountInfo(function (data) {
		res.send(data);
	});
};

var logout = function (req, res) {
	var UserService = new userService(req);
	UserService.logout(function (data) {
		res.send(data);
	});
};

router.post('/logout', logout);

router.post('/', AppIndex);
router.post('/login', login);
router.post('/register', register);
router.post('/social-connect', socialConnect);
router.post('/info', getUserInfo);
router.post('/account', getAccountInfo);


router.post('/forgot-password', forgotPassword);
router.post('/valid-pin', validPin);
router.post('/reset-password', resetPassword);
router.post('/decode-hash', decodeHash);

module.exports = router;
