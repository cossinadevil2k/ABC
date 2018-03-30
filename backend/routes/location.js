'use strict';

let mongoose = require('mongoose');
let Transaction = mongoose.model('Transaction');
let moment = require('moment');
// let Category = mongoose.model('Category');

let query = function(condition, skip, limit, callback) {
	Transaction.find(condition)
	// .populate('parent', '_id isDelete')
	.populate('category', 'icon name', {
		isDelete: false
	})
		.select('longtitude latitude address category amount')
		.skip(skip)
		.limit(limit)
		.sort('-updateAt')
	.lean(true)
	.exec(callback);
};

let getLocation = function(req, res) {
	let limit = req.params.limit || 100;
	let skip = req.params.skip || 0;
	let timeSend = req.params.time || 0;
	let timeNow = new Date().getTime();

	let timer = timeNow - (timeSend * 1000);
	query({
		$and: [{
			createdAt: {
				$gte: timer
			}
		}, {
			category: {
				$ne: null
			}
		}, {
			isDelete: false
		}, {
			$or: [{
				longtitude: {
					$ne: 0
				}
			}, {
				latitude: {
					$ne: 0
				}
			}]
		}, {parent: null}]
	}, skip, limit, function(err, results) {
		if (err) {
			res.jsonp({
				error: true,
				e: err
			})
		} else {
			res.jsonp(results);
		}
	})

};

let getLocationAll = function(req, res){
	let limit = req.params.limit || 100;
	let skip = req.params.skip || 0;
	let day = req.params.day || 'all';

	limit = parseInt(limit, 10);
	skip = parseInt(skip, 10);

	if (isNaN(skip)) {
		skip = 0;
	}

	if (isNaN(limit)) {
		limit = 100;
	}

	let q = {$and: [{
			isDelete: false
		},{
			$or: [{
				longtitude: {
					$ne: 0
				}
			}, {
				latitude: {
					$ne: 0
				}
			}]
		},{parent: null}]
	};

	if (day !== 'all') {
		let date_start = moment(day, 'YYYY-MM-DD').startOf('day');
		let date_end = moment(day, 'YYYY-MM-DD').endOf('day');

		if (date_start.isValid()) {
			q['$and'].push({
				createdAt: {
					$gte:date_start,
					$lte:date_end
				}
			});
		}
	}

	query(q, skip, limit, function(err, results) {
		if (err) {
			res.jsonp({
				error: true,
				e: err
			});
		} else {
			res.jsonp(results);
		}
	});
};

module.exports = function(app, config) {
	app.get('/location/:day/:limit/:skip', getLocationAll);
	// app.get('/location/:limit/:skip/:time/:padding', getLocation);
	// app.get('/location/count', getLocationCount);
};
