/**
 * Download
 */

'use strict';
const express = require('express');
var router = express.Router();
var urlDevice = {
	AndroidOS: 'http://bit.ly/1kGrkC2',
	WindowsPhone: 'https://www.microsoft.com/store/apps/9wzdncrdrg5v?ocid=badge',
    iOS: 'http://u.moneylover.me/ml-ios',
	WindowsDesktop: 'https://www.microsoft.com/store/apps/9wzdncrdrg5v?ocid=badge',
	defaults: 'http://moneylover.me'
};

var operatingSystems = {
	AndroidOS: /Android|android|/,
	WindowsMobileOS: /Windows CE.*(PPC|Smartphone|Mobile|[0-9]{3}x[0-9]{3})|Window Mobile|Windows Phone [0-9.]+|WCE;/,
	WindowsPhoneOS: /Windows Phone 8.0|Windows Phone OS|XBLWP7|ZuneWP7|Windows Phone 8.1|Windows 10 Mobile|WPDesktop/,
	iOS: /iPhone.*Mobile|iPhone|iPod|iPad/,
	WindowsDesktop: /Windows NT|WOW64/
};

function detectDevice(req) {
	var userAgent = req.headers['user-agent'].toString();

	if (!userAgent || userAgent === '') {
		return urlDevice.defaults;
	} else if (userAgent.match(operatingSystems.AndroidOS) && userAgent.match(/Linux/)) {
		return urlDevice.AndroidOS;
	} else if (userAgent.match(operatingSystems.iOS) && !userAgent.match(/IEMobile/)) {
		return urlDevice.iOS;
	} else if (userAgent.match(operatingSystems.WindowsPhoneOS) && (userAgent.match(/WPDesktop/) || userAgent.match(/IEMobile/))) {
		return urlDevice.WindowsPhone;
	} else if (userAgent.match(operatingSystems.WindowsMobileOS)) {
		return urlDevice.WindowsPhone;
	} else if (userAgent.match(operatingSystems.WindowsDesktop) && !userAgent.match(/WPDesktop/)) {
		return urlDevice.WindowsDesktop;
	} else return urlDevice.defaults;
}

var download = function (req, res) {
	res.redirect(301, detectDevice(req));
};

router.get('/', download);
module.exports = router;
