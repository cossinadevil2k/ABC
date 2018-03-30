
var http = require('http'),
	fs = require('fs'),
	path = require('path'),
	options;

options = {
	host: 'openexchangerates.org',
	port: 80,
	path: '/api/latest.json?app_id=9494469e45864792aedb71fe6e6b008d'
};

var getData = function (callback) {
	http.get(options, function (res) {
		var dataContent = '';
		res.setEncoding('binary');
		var statusCode = res.statusCode;

		res.on('data', function (chunk) {
			if (statusCode == 200) {
				dataContent += chunk;
			}
		});

		res.on('end', function () {
			if (statusCode == 200) {
				fs.writeFile('/home2/cuongle/Project/moneylover/landing-page/source/exchanger.json', dataContent, { flag: 'w+' }, function (err) {
					if (err) return callback(false, err);

					fs.writeFile('/home2/cuongle/Project/moneylover/app/public/data/exchanger.json', dataContent, { flag: 'w+' }, function (err) {
						if (err) return callback(false, err);
						callback(true, 'File saved.');
					});
				});
			} else {
				callback(false, null);
			}
		});
	});
};

var cronJob = require('cron').CronJob;
new cronJob('0 0 * * * *', function () {
	getData(function (stt, result) {
		var time = new Date();
		var current = time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
		// console.log("Cron: " + time + ' ' + result);
	});
}, null, true, 'America/Los_Angeles');
