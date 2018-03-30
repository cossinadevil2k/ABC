/**
 * unsubscribe
 */


var express = require('express');
var router = express.Router();

var userService = require('../services/user');

var getUnsubcribe = function (req, res) {
	var UserSevice = new userService(req);
	UserSevice.unsubscribe(() => {
		res.redirect('https://moneylover.me');
	});
};

router.get('/', getUnsubcribe);
module.exports = router;
