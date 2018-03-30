/*
 Cronjob
 Stat daily
 */

'use strict';

let env = process.env.NODE_ENV;

if (!env) {
	env = 'dev';
	process.env.NODE_ENV = env;
}

const mongoose = require('mongoose');
const config = require('../config/config')[env];
let CronJob = require('cron').CronJob;
let moment = require('moment');
let async = require('async');
let kue = require('kue');
let utils = require('../helper/utils');

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err.stack);
});

process.on('exit', function (code) {
	console.log('About to exit with code: ' + code);
});

require('../model/finsify_category_edited_log');
require('../model/statsDaily');
require('../model/account');
require('../model/account_share');
require('../model/budget');
require('../model/campaign');
require('../model/category');
require('../model/device');
require('../model/transaction');
require('../model/transaction_share');
require('../model/user');
require('../model/errorLog');
require('../model/purchasedstat');
require('../model/subscription_log');
require('../model/push_notification_session');
require('../model/device_notification');
require('../model/backend_notification');
require('../model/helpdesk_performance');
require('../model/helpdesk_issue_stat');
require('../model/helpdesk_issue');

let connectOptions = {
	server: {
		auto_reconnect: true
	}
};
// Connect to MongoDB
// mongoose.connect(config.db_url, connectOptions);
// let db = mongoose.connection;

// db.on('error', console.error.bind(console, ' Sync Database connection error:'));
// db.once('open', function callback () {
// 	console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
// });
// db.on('reconnected', function(){
// 	console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.')
// });
// db.on('disconnected', function(){
// 	console.log('Money DB DISCONNECTED');
// });

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
	mongoose.connection.close(function () {
		console.log('Mongoose default connection disconnected through app termination');
		process.exit(0);
	});
});


function connectDB(callback) {
	// Connect to MongoDB
	mongoose.Promise = require('bluebird');
	mongoose.connect(config.db_url, connectOptions);
	let db = mongoose.connection;

	db.on('error', console.error.bind(console, ' Sync Database connection error:'));
	db.once('open', function callback() {
		console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
	});
	db.on('reconnected', function () {
		console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
	});
	db.on('disconnected', function () {
		console.log('Money DB DISCONNECTED');
	});

	callback();
}

function closeDB(callback) {
	mongoose.connection.close();
	callback();
}



let statsDaily = mongoose.model('statsDaily');
let Account = mongoose.model('Account');
let AccountShare = mongoose.model('AccountShare');
let Budget = mongoose.model('Budget');
let Campaign = mongoose.model('Campaign');
let Category = mongoose.model('Category');
let Device = mongoose.model('Device');
let Transaction = mongoose.model('Transaction');
let TransactionShare = mongoose.model('transactionShare');
let User = mongoose.model('User');
let errorLog = mongoose.model('errorLog');
let Purchased = mongoose.model('PurchasedStat');
let SubscriptionLog = mongoose.model('SubscriptionLog');
let PushNotificationSession = mongoose.model('PushNotificationSession');
let DeviceNotification = mongoose.model('DeviceNotification');
let IssueModel = mongoose.model('HelpDeskIssue');
let BackendNotification = mongoose.model('BackendNotification');

let Monthly = '0 0 7 */1 * *';
let Daily = '0 0 7 * * *';
let Hourly = '0 0 * * * *';
let ActiveUserCountryCronTime = '0 0 3 * * *';
let UserCountryCountCronTime = '0 15 7 * * *';
let WeeklyEveryMondayAt4 = '0 0 4 * * 0';
let NineAmDaily = '0 0 9 * * *';

// let queue = kue.createQueue({
// 	prefix:'q',
// 	redis:{
// 		host: config.redis.host,
// 		port: config.redis.port,
// 		db: config.redis.kueDb,
// 		options:{}
// 	}
// });

let AccountCode = 100;
let BudgetCode = 400;
let CampaignCode = 500;
let CategoryCode = 200;
let TransactionCode = 600;
let TransactionDeleteCode = 603;
let AccountShareCode = 700;
let TransactionShareCode = 800;
let UserCode = 900;
let UserCountryCode = 901;
let UserRefCode = 902;
let UserWindowsAndMobile = 903;
let UserWindows = 904;
let UserWeb = 905;
let UserWebAndMobile = 906;
let UserMixedPlatform = 907;
let DeviceCode = 1000;
let DeviceCountryCode = 1001;
let AndroidDeviceCode = 1010;
let IosDeviceCode = 1020;
let WpDeviceCode = 1034;
let WindowsDeviceCode = 1035;
let MacDeviceCode = 1060;
let WebDeviceCode = 1070;
let ActiveSyncCode = 1100;
let errorLogCode = 1200;
let PurchasedCode = 1300;
let NewSubscriptionCode = 1400;
let ChurnSubscriptionCode = 1401;
let TrialEndNotSubscribeCode = 1402;
let RenewSubscriptionCode = 1403;
let DailySubscriptionCode = 1404;
let DailyTrialCode = 1405;
let RenewRemoteWalletCode = 1406;
let PremiumCode = 1500;
let Notification = {
	Total: 1600,
	Sent: 1601,
	Read: 1602,
	Error: 1603
};
let NotificationSession = {
	Total: 1610,
	Accepted: 1611,
	Denied: 1612,
	Pending: 1613
};
let ActiveUserCode = {
	7: 1700,
	30: 1701,
	100: 1702,
	country7: 1703,
	country30: 1704,
	country100: 1705
};

const LoyalUserUnit = {
	oneWeek: {
		unit: 'days',
		value: 7
	},
	oneMonth: {
		unit: 'months',
		value: 1
	},
	threeMonth: {
		unit: 'months',
		value: 3
	},
	sixMonth: {
		unit: 'months',
		value: 6
	},
	oneYear: {
		unit: 'years',
		value: 1
	}
};

const LoyalUserCode = {
	oneWeek: {
		total: 1810,
		android: 1811,
		iOS: 1812,
		windows: 1813,
		wp: 1814,
	},
	oneMonth: {
		total: 1820,
		android: 1821,
		iOS: 1822,
		windows: 1823,
		wp: 1824
	},
	threeMonth: {
		total: 1830,
		android: 1831,
		iOS: 1832,
		windows: 1833,
		wp: 1834
	},
	sixMonth: {
		total: 1850,
		android: 1851,
		iOS: 1852,
		windows: 1853,
		wp: 1854
	},
	oneYear: {
		total: 1860,
		android: 1861,
		iOS: 1862,
		windows: 1863,
		wp: 1864
	},
	longTime: {
		total: 1840,
		android: 1841,
		iOS: 1842,
		windows: 1843,
		wp: 1844
	}
};

const nsfwAdminRoom = '/backend/notification/admin/';
let io = require('socket.io-emitter')({ host: config.redis.host, port: config.redis.port });

function getOpenNoActiveHelpdesk() {
	return new Promise((resolve, reject) => {
		let endpoint = moment().subtract(3, 'day').format();
		let query = {
			status: null,
			assigned: { $exists: true, $nin: [null, []] },
			last_update: { $lt: endpoint },
			issueType: null
		};

		IssueModel.find(query, (err, issueList) => {
			return err ? reject(err) : resolve(issueList);
		});
	});
}

function sendHelpdeskNotification(adminId, url) {
	io.emit(nsfwAdminRoom + adminId, JSON.stringify({ type: "helpdesk_issue", url: url }));
}

function createHelpdeskNotificationContentAndUrl(issue) {
	let url = '/helpdesk/issue_details/' + issue._id;
	let content = 'Issue bạn theo dõi đã lâu chưa hoạt động: [' + issue.name + ']';

	return { content, url };
}

function countLoyalUserByPlatform(userList) {
	let result = {
		android: 0,
		iOS: 0,
		windows: 0,
		wp: 0
	};

	userList.forEach(user => {
		if (user.tags) {
			user.tags.forEach(tag => {
				if (tag === 'device:android') result.android++;
				else if (tag === 'device:ios') result.iOS++;
				else if (tag === 'device:windows') result.windows++;
				else if (tag === 'device:wp') result.wp++;
			});
		}
	});

	return result;
}

let AccountStat = function (startDate, endDate, types, callback) {
	Account.count({ $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(AccountCode, counter, types);
		callback();
	});
};

let AccountShareStat = function (startDate, endDate, types) {
	AccountShare.count({ $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(AccountShareCode, counter, types);
	});
};


let BudgetStat = function (startDate, endDate, types, callback) {
	Budget.count({ $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(BudgetCode, counter, types);
		callback();
	});
};

let CampaignStat = function (startDate, endDate, types, callback) {
	Campaign.count({ $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(CampaignCode, counter, types);
		callback();
	});
};


let CategoryStat = function (startDate, endDate, types, callback) {
	Category.count({ $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(CategoryCode, counter, types);
		callback();
	});
};

let DeviceStat = function (startDate, endDate, types, callback) {
	Device.count({ $and: [{ createdDate: { $gte: startDate } }, { createdDate: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(DeviceCode, counter, types);
		callback();
	});
};

let TransactionStat = function (startDate, endDate, types, callback) {
	let query = {
		createdAt: {
			$gte: startDate,
			$lt: endDate
		}
	};

	Transaction.count(query, function (err, counter) {
		statsDaily.saveStat(TransactionCode, counter, types);
		callback();
	});
};

let TransactionDeleteStat = function (startDate, endDate, types, callback) {
	let query = {
		isDelete: true,
		updateAt: {
			$gte: startDate,
			$lt: endDate
		}
	};

	Transaction.count(query, function (err, counter) {
		statsDaily.saveStat(TransactionDeleteCode, counter, types);
		callback();
	});
};

// let TransactionShareStat = function(startDate, endDate, types){
// 	TransactionShare.count({$and: [{createdAt: {$gte: startDate}}, {createdAt: {$lt: endDate}}]}, function(err, counter){
// 		statsDaily.saveStat(TransactionShareCode, counter, types);
// 	});
// };

let UserStat = function (startDate, endDate, types, callback) {
	User.count({ $and: [{ createdDate: { $gte: startDate } }, { createdDate: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(UserCode, counter, types);
		callback();
	});
};

let ActiveSync = function (startDate, endDate, types, callback) {
	User.count({ $and: [{ lastSync: { $gte: startDate } }, { lastSync: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(ActiveSyncCode, counter, types);
		callback();
	});
};

let loyalUser = function (callback) {
	async.eachSeries([1, 7, 30, 100], (date, cb) => {
		countLoyalUserByTimeUnitRange(date, cb);
	}, callback)
};

function classifyUserPlatform(userList, callback) {
	let result = {
		total: 0,
		android: 0,
		iOS: 0,
		windows: 0,
		wp: 0
	};

	async.eachSeries(userList, (user, cb) => {
		async.setImmediate(() => {
			result.total++;

			if (user.tags) {
				if (user.tags.indexOf('device:android') > -1) {
					result.android++;
				} else if (user.tags.indexOf('device:ios') > -1) {
					result.iOS++;
				} else if (user.tags.indexOf('device:windows') > -1) {
					result.windows++;
				} else if (user.tags.indexOf('device:wp') > -1) {
					result.wp++;
				}
			}

			cb();
		});
	}, err => {
		callback(err, result);
	});
}

function classifyUserCreateDate(userList, callback) {
	let sevenDayAgo = moment().subtract(7, 'days').startOf('day');
	let oneMonthAgo = moment().subtract(1, 'months').startOf('day');
	let threeMonthAgo = moment().subtract(3, 'months').startOf('day');
	let sixMonthAgo = moment().subtract(6, 'months').startOf('day');
	let oneYearAgo = moment().subtract(1, 'years').startOf('day');

	let result = {
		oneWeek: [],
		oneMonth: [],
		threeMonth: [],
		sixMonth: [],
		oneYear: [],
		longTime: []
	};

	async.eachSeries(userList, (user, cb) => {
		async.setImmediate(() => {
			let createdDate = moment(user.createdDate);

			if (createdDate.isSameOrBefore(oneYearAgo)) {
				result.longTime.push(user);
			} else if (createdDate.isSameOrBefore(sixMonthAgo)) {
				result.oneYear.push(user);
			} else if (createdDate.isSameOrBefore(threeMonthAgo)) {
				result.sixMonth.push(user);
			} else if (createdDate.isSameOrBefore(oneMonthAgo)) {
				result.threeMonth.push(user);
			} else if (createdDate.isSameOrBefore(sevenDayAgo)) {
				result.oneMonth.push(user);
			} else {
				result.oneWeek.push(user);
			}

			cb();
		});
	}, err => {
		callback(err, result);
	});
}

function countLoyalUserByTimeUnitRange(recentDate, callback) {
	let syncDateEnd = moment().startOf('day');
	let syncDateStart = moment().startOf('day').subtract(recentDate, 'days');
	let dateMode;
	let result = {};

	switch (recentDate) {
		case 7:
			dateMode = 1;
			break;
		case 30:
			dateMode = 2;
			break;
		case 100:
			dateMode = 3;
			break;
		case 1:
			dateMode = 4;
			break;
		default:
			break;
	}

	let query = {
		lastSync: { $gte: syncDateStart, $lt: syncDateEnd }
	};

	let timePoints = Object.keys(LoyalUserCode);
	timePoints.forEach(timePoint => {
		result[timePoint] = {
			total: 0,
			android: 0,
			iOS: 0,
			windows: 0,
			wp: 0
		};
	});

	getAndClassify(query, 0, result, (err, dataResult) => {
		if (err) return callback(err);

		timePoints.forEach(timePoint => {
			let tableCode = {
				total: (LoyalUserCode[timePoint].total * 10) + dateMode,
				android: (LoyalUserCode[timePoint].android * 10) + dateMode,
				iOS: (LoyalUserCode[timePoint].iOS * 10) + dateMode,
				windows: (LoyalUserCode[timePoint].windows * 10) + dateMode,
				wp: (LoyalUserCode[timePoint].wp * 10) + dateMode
			};

			statsDaily.saveStat(tableCode.total, dataResult[timePoint].total, 1);
			statsDaily.saveStat(tableCode.android, dataResult[timePoint].android, 1);
			statsDaily.saveStat(tableCode.iOS, dataResult[timePoint].iOS, 1);
			statsDaily.saveStat(tableCode.windows, dataResult[timePoint].windows, 1);
			statsDaily.saveStat(tableCode.wp, dataResult[timePoint].wp, 1);
		});

		callback();
	});

	function getAndClassify(query, skip, result, cb) {
		const LIMIT = 10000;

		User.find(query).skip(skip).limit(LIMIT).exec((err, userList) => {
			if (err) return cb(err);

			classifyUserCreateDate(userList, (err, data) => {
				if (err) return cb(err);

				let dateTypes = Object.keys(data);

				async.eachSeries(dateTypes, (dateType, next) => {
					async.setImmediate(() => {
						classifyUserPlatform(data[dateType], (err, { android, iOS, windows, wp, total }) => {
							if (err) return next(err);

							result[dateType].total += total;
							result[dateType].android += android;
							result[dateType].iOS += iOS;
							result[dateType].windows += windows;
							result[dateType].wp += wp;

							next();
						});
					});
				}, err => {
					if (err) return cb(err);

					if (userList.length < LIMIT) {
						return cb(null, result);
					}

					skip += LIMIT;

					return getAndClassify(query, skip, result, cb);
				});
			});
		});
	}
}

let PurchasedStat = function (startDate, endDate, types, callback) {
	Purchased.count({ $and: [{ buyAt: { $gte: startDate } }, { buyAt: { $lt: endDate } }] }, function (err, counter) {
		statsDaily.saveStat(PurchasedCode, counter, types);
		callback();
	});
};

function devicePlatformCount(platform, appId, startDate, endDate, callback) {
	let query = {
		$and: [
			{ createdDate: { $gte: startDate } },
			{ createdDate: { $lt: endDate } },
			{ platform: platform }
		]
	};

	if (appId) query['$and'].push({ appId: appId });

	Device.count(query, callback);
}

let AndroidDeviceStat = function (startDate, endDate, type, callback) {
	devicePlatformCount(1, 0, startDate, endDate, function (err, counter) {
		if (err) console.log(err);
		statsDaily.saveStat(AndroidDeviceCode, counter, type);
		callback();
	});
};

let IosDeviceStat = function (startDate, endDate, type, callback) {
	devicePlatformCount(2, 0, startDate, endDate, function (err, counter) {
		if (err) console.log(err);
		statsDaily.saveStat(IosDeviceCode, counter, type);
		callback();
	});
};

let WpDeviceStat = function (startDate, endDate, type, callback) {
	devicePlatformCount(3, 4, startDate, endDate, function (err, counter) {
		if (err) console.log(err);
		statsDaily.saveStat(WpDeviceCode, counter, type);
		callback();
	});
};

let WindowsDeviceStat = function (startDate, endDate, type, callback) {
	devicePlatformCount(3, 5, startDate, endDate, function (err, counter) {
		if (err) console.log(err);
		statsDaily.saveStat(WindowsDeviceCode, counter, type);
		callback();
	});
};

let MacDeviceStat = function (startDate, endDate, type, callback) {
	devicePlatformCount(6, 0, startDate, endDate, function (err, counter) {
		if (err) console.log(err);
		statsDaily.saveStat(MacDeviceCode, counter, type);
		callback();
	});
};

let WebDeviceStat = function (startDate, endDate, type, callback) {
	devicePlatformCount(7, 0, startDate, endDate, function (err, counter) {
		if (err) console.log(err);
		statsDaily.saveStat(WebDeviceCode, counter, type);
		callback();
	});
};

let SubscriptionNewStat = function (startDate, endDate, type, callback) {
	User.count({ firstPurchase: { $gt: startDate, $lt: endDate } }, function (err, counter) {
		if (err) console.log(err);
		else statsDaily.saveStat(NewSubscriptionCode, counter, type);
		callback();
	});
};

let RenewSubscriptionStat = function (startDate, endDate, type, callback) {
	User.count({ lastPurchase: { $gt: startDate, $lt: endDate } })
		.$where('this.firstPurchase < this.lastPurchase')
		.exec(function (err, counter) {
			if (err) console.log(err);
			else statsDaily.saveStat(RenewSubscriptionCode, counter, type);
			callback();
		});
};

let DailySubscriptionStat = function (today, type, callback) {
	User.count({ expireDate: { $gte: today }, firstPurchase: { $exists: true } }, function (err, counter) {
		if (err) console.log(err);
		else statsDaily.saveStat(DailySubscriptionCode, counter, type);
		callback();
	});
};

let SubscriptionChurnStat = function (startDate, endDate, type, callback) {
	User.count({ expireDate: { $gt: startDate, $lt: endDate }, lastPurchase: { $exists: true } }, function (err, counter) {
		if (err) console.log(err);
		else statsDaily.saveStat(ChurnSubscriptionCode, counter, type);
		callback();
	});
};

let TrialEndNotSubscribeStat = function (today, type, callback) {
	User.count({ expireDate: { $gt: today }, firstPurchase: { $exists: false } }, function (err, counter) {
		if (err) console.log(err);
		else statsDaily.saveStat(TrialEndNotSubscribeCode, counter, type);
		callback();
	});
};

let DailyTrialStat = function (today, type, callback) {
	User.count({ firstPurchase: { $exists: false }, expireDate: { $gte: today } }, function (err, counter) {
		if (err) console.log(err);
		else statsDaily.saveStat(DailyTrialCode, counter, type);
		callback();
	})
};

let RenewRemoteWalletStat = function (startDate, endDate, type, callback) {
	SubscriptionLog.count({ type: 1, purchaseDate: { $gt: startDate, $lt: endDate } }, function (err, counter) {
		if (err) console.log(err);
		else statsDaily.saveStat(RenewRemoteWalletCode, counter, type);
		callback();
	});
};

let PremiumCounter = function (type, callback) {
	User.count({ purchased: true }, function (err, result) {
		if (err) console.log(err);
		else statsDaily.saveStat(PremiumCode, result, type);
		callback();
	});
};

let NotificationStat = function (startDate, endDate, type, callback) {

	/***Count session***/
	sessionCount(startDate, endDate, function (err, results) {
		if (!err) {
			statsDaily.saveStat(NotificationSession.Total, results.total, type);
			statsDaily.saveStat(NotificationSession.Pending, results.pending, type);
			statsDaily.saveStat(NotificationSession.Accepted, results.accepted, type);
			statsDaily.saveStat(NotificationSession.Denied, results.denied, type);

			/***Count device***/
			notificationCount(startDate, endDate, function (err, results) {
				if (!err) {
					statsDaily.saveStat(Notification.Total, results.total, type);
					statsDaily.saveStat(Notification.Sent, results.sent, type);
					statsDaily.saveStat(Notification.Read, results.read, type);
					statsDaily.saveStat(Notification.Error, results.error, type);
				}

				callback();
			});
		} else {
			callback();
		}
	});

};

let ActiveUserStat = function (type, callback) {
	const days = [7, 30, 100];

	User.count((err, totalUser) => {
		if (err) return callback();

		async.eachSeries(days, (day, cb) => {
			activeUserCount(day, totalUser, (err, rate, count) => {
				if (rate && count) {
					let metadata = {
						total: totalUser,
						active: count
					};

					statsDaily.saveStat(ActiveUserCode[day], rate, type, metadata);
				}

				cb();
			});
		}, (error) => {
			callback();
		});
	});
};

let ActiveUserStat2 = function (type, callback) {

};

let ActiveUserCountry = function (type, callback) {
	countActiveUserByDay(7)
		.then((data) => {
			if (data) {
				statsDaily.saveStat(ActiveUserCode.country7, 0, type, data);
			}

			countActiveUserByDay(30);
		})
		.then((data) => {
			if (data) {
				statsDaily.saveStat(ActiveUserCode.country30, 0, type, data);
			}

			countActiveUserByDay(100);
		})
		.then((data) => {
			if (data) {
				statsDaily.saveStat(ActiveUserCode.country100, 0, type, data);
			}
		})
		.catch((err) => {
			console.log(err);
			callback();
		});
};

function activeUserCount(days, totalUser, callback) {
	let startTime = moment().subtract(days, 'day').startOf('day').format();

	let query = { lastSync: { $gte: startTime }, createdDate: { $lt: startTime } };

	User.count(query, (err, count) => {
		if (err) return callback(err);

		callback(null, ((count / totalUser) * 100).toFixed(2), count);
	});
}

function sessionCount(startDate, endDate, callback) {
	let query = { approvedDate: { $gte: startDate, $lt: endDate } };
	async.series({
		total: function (cb) {
			PushNotificationSession.count(query, cb);
		},
		pending: function (cb) {
			query.status = 'Pending';
			PushNotificationSession.count(query, cb);
		},
		accepted: function (cb) {
			query.status = 'Accepted';
			PushNotificationSession.count(query, cb);
		},
		denied: function (cb) {
			query.status = 'Denied';
			PushNotificationSession.count(query, cb);
		}
	}, callback);
}

function notificationCount(startDate, endDate, callback) {
	let query = { sentDate: { $gte: startDate, $lt: endDate } };
	async.series({
		total: function (cb) {
			DeviceNotification.count(query, cb);
		},
		read: function (cb) {
			query.state = 'read';
			DeviceNotification.count(query, cb);
		},
		sent: function (cb) {
			query.state = 'sent';
			DeviceNotification.count(query, cb);
		},
		error: function (cb) {
			query.state = 'error';
			DeviceNotification.count(query, cb);
		}
	}, callback);
}

function getActiveUser(days, callback) {
	let minimumDate = moment().subtract(days, 'day').startOf('day');

	let query = { lastSync: { $gte: minimumDate } };

	User.find(query)
		.exec(callback);
}

function countCountry(user_list, callback) {
	let result = {};

	function detectCountry(tags) {
		if (!tags || tags.length === 0) {
			if (result['Unknown'] === null || result['Unknown'] === undefined) {
				result['Unknown'] = 0;
			}

			result['Unknown'] += 1;
		} else {
			//đánh dấu user này đã xác định được quốc gia (theo ip) hay chưa
			let countryDetected = false;

			tags.forEach((tag) => {
				if (tag.indexOf('country:') != -1) {
					if (result[tag] === null || result[tag] === undefined) {
						result[tag] = 0;
					}

					result[tag] += 1;
					countryDetected = true;
				}
			});

			if (!countryDetected) {
				if (result['Unknown'] === null || result['Unknown'] === undefined) {
					result['Unknown'] = 0;
				}

				result['Unknown'] += 1;
			}
		}
	}

	async.eachSeries(user_list, (user, cb) => {
		async.setImmediate(() => {
			detectCountry(user.tags);
			cb();
		});
	}, (err) => {
		callback(err, result);
	});
}

function countRef(user_list, callback) {
	let result = {};

	function detectRef(tags) {
		if (!tags || tags.length === 0) {
			if (result['Unknown'] === null || result['Unknown'] === undefined) {
				result['Unknown'] = 0;
			}

			result['Unknown'] += 1;
		} else {
			//đánh dấu user này đã xác định được ref hay chưa
			let refDetected = false;

			tags.forEach((tag) => {
				// if (tag.indexOf('ref:') != -1) {
				// 	if (result[tag] === null || result[tag] === undefined) {
				// 		result[tag] = 0;
				// 	}

				// 	result[tag] += 1;
				// 	refDetected = true;
				// }
				if (tag.indexOf('utm_source') != -1) {
					if (result[tag] === null || result[tag] === undefined) {
						result[tag] = 0;
					}

					result[tag] += 1;
					refDetected = true;
				}
			});

			if (!refDetected) {
				if (result['Unknown'] === null || result['Unknown'] === undefined) {
					result['Unknown'] = 0;
				}

				result['Unknown'] += 1;
			}
		}
	}

	async.eachSeries(user_list, (user, cb) => {
		async.setImmediate(() => {
			detectRef(user.tags);
			cb();
		});
	}, (err) => {
		callback(err, result);
	});
}

function countActiveUserByDay(days) {
	return new Promise((resolve, reject) => {
		async.waterfall([
			function (cb) {
				getActiveUser(days, cb);
			},
			countCountry
		], (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

function countUserWindows(type, callback) {
	let query = 'device:windows';
	let searchQuery = utils.createUserQuery(query);

	User.search(searchQuery, { size: 500000 }, (err, result) => {
		if (err) return callback();

		statsDaily.saveStat(UserWindows, result.hits.total, type);

		let count = 0;

		async.eachSeries(result.hits.hits, (user, done) => {
			async.setImmediate(function () {
				if (!user || !user._source.tags || user._source.tags.length === 0) return done();

				let hasOtherMobilePlatform = false;

				user._source.tags.forEach(tag => {
					if (tag.indexOf('device:') !== -1) {
						let platform = tag.split(':')[1];

						if (platform !== 'windows' && platform !== 'web') {
							hasOtherMobilePlatform = true;
						}
					}
				});

				if (hasOtherMobilePlatform) count++;

				done();
			});
		}, err => {
			statsDaily.saveStat(UserWindowsAndMobile, count, type);

			callback();
		});
	});
}

function countUserWeb(type, callback) {
	let query = 'device:web';
	let searchQuery = utils.createUserQuery(query);

	User.search(searchQuery, { size: 500000 }, (err, result) => {
		if (err) return callback();

		statsDaily.saveStat(UserWeb, result.hits.total, type);

		let count = 0;

		async.eachSeries(result.hits.hits, (user, done) => {
			async.setImmediate(function () {
				if (!user || !user._source.tags || user._source.tags.length === 0) return done();

				let hasOtherMobilePlatform = false;

				user._source.tags.forEach(tag => {
					if (tag.indexOf('device:') !== -1) {
						let platform = tag.split(':')[1];

						if (platform !== 'windows' && platform !== 'web') {
							hasOtherMobilePlatform = true;
						}
					}
				});

				if (hasOtherMobilePlatform) count++;

				done();
			});
		}, err => {
			statsDaily.saveStat(UserWebAndMobile, count, type);

			callback();
		});
	});
}

let DeviceCountryStat = function (startDate, endDate, type, callback) {
	let query = {
		createdDate: {
			'$gte': startDate,
			'$lt': endDate
		}
	};

	Device.find(query, (err, devices) => {
		if (err) return 0;

		if (!devices) return 0;

		if (devices.length === 0) return 0;

		countCountry(devices, (error, result) => {
			if (result) {
				statsDaily.saveStat(DeviceCountryCode, 0, 1, result);
			}
			callback();
		});
	});
};

let userCountryAndRefCount = function (startTime, endTime, type) {
	let query = {
		createdDate: {
			$gte: startTime,
			$lt: endTime
		}
	};

	User.find(query)
		.select('tags')
		.exec((err, users) => {
			if (err) {
				console.log(err);
			}

			countCountry(users, (countErr, result) => {
				if (result) {
					statsDaily.saveStat(UserCountryCode, 0, type, result);
				}

				countRef(users, (countErr, result) => {
					if (result) {
						statsDaily.saveStat(UserRefCode, 0, type, result);
					}
				});
			});
		});
};

let kueFailedClear = function () {
	kue.Job.rangeByState('failed', 0, 100000, 'asc', function (err, jobs) {
		async.each(jobs, function (job, cb) {
			job.remove(function () {
				cb()
			});
		}, function (error) {
			// console.log('done');
		});
	});
};

let DailyJob = new CronJob({
	cronTime: Daily,
	onTick: function () {
		let startTime = moment().startOf('day').add(-1, 'days').format();
		let endTime = moment().startOf('day').format();
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) { PremiumCounter(1, cb); },
			function (cb) { AccountStat(startTime, endTime, 1, cb); },
			function (cb) { BudgetStat(startTime, endTime, 1, cb); },
			function (cb) { CampaignStat(startTime, endTime, 1, cb); },
			function (cb) { CategoryStat(startTime, endTime, 1, cb); },
			function (cb) { DeviceStat(startTime, endTime, 1, cb); },
			function (cb) { DeviceCountryStat(startTime, endTime, 1, cb); },
			function (cb) { TransactionStat(startTime, endTime, 1, cb); },
			function (cb) { TransactionDeleteStat(startTime, endTime, 1, cb); },
			function (cb) { UserStat(startTime, endTime, 1, cb); },
			function (cb) { ActiveSync(startTime, endTime, 1, cb); },
			function (cb) { AndroidDeviceStat(startTime, endTime, 1, cb); },
			function (cb) { IosDeviceStat(startTime, endTime, 1, cb); },
			function (cb) { WpDeviceStat(startTime, endTime, 1, cb); },
			function (cb) { WindowsDeviceStat(startTime, endTime, 1, cb); },
			function (cb) { MacDeviceStat(startTime, endTime, 1, cb); },
			function (cb) { WebDeviceStat(startTime, endTime, 1, cb); },
			function (cb) { PurchasedStat(startTime, endTime, 1, cb); },
			function (cb) { SubscriptionNewStat(startTime, endTime, 1, cb); },
			function (cb) { DailySubscriptionStat(startTime, 1, cb); },
			function (cb) { DailyTrialStat(startTime, 1, cb); },
			function (cb) { RenewSubscriptionStat(startTime, endTime, 1, cb); },
			function (cb) { SubscriptionChurnStat(startTime, endTime, 1, cb); },
			function (cb) { TrialEndNotSubscribeStat(startTime, 1, cb); },
			function (cb) { RenewRemoteWalletStat(startTime, endTime, 1, cb); },
			function (cb) { NotificationStat(startTime, endTime, 1, cb); },
			function (cb) { countUserWindows(1, cb); },
			function (cb) { countUserWeb(1, cb); },
			function (cb) { loyalUser(cb); },
			function (cb) { closeDB(cb); }
		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

let HourlyJob = new CronJob({
	cronTime: Hourly,
	onTick: function () {
		let startTime = moment().startOf('hour').add(-1, 'hours').format();
		let endTime = moment().startOf('hour').format();
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) { AccountStat(startTime, endTime, 2, cb); },
			function (cb) { BudgetStat(startTime, endTime, 2, cb); },
			function (cb) { CampaignStat(startTime, endTime, 2, cb); },
			function (cb) { CategoryStat(startTime, endTime, 2, cb); },
			function (cb) { DeviceStat(startTime, endTime, 2, cb); },
			function (cb) { TransactionStat(startTime, endTime, 2, cb); },
			function (cb) { TransactionDeleteStat(startTime, endTime, 2, cb); },
			function (cb) { ActiveSync(startTime, endTime, 2, cb); },
			function (cb) { AndroidDeviceStat(startTime, endTime, 2, cb); },
			function (cb) { IosDeviceStat(startTime, endTime, 2, cb); },
			function (cb) { WpDeviceStat(startTime, endTime, 2, cb); },
			function (cb) { WindowsDeviceStat(startTime, endTime, 2, cb); },
			function (cb) { MacDeviceStat(startTime, endTime, 2, cb); },
			function (cb) { WebDeviceStat(startTime, endTime, 2, cb); },
			function (cb) { PurchasedStat(startTime, endTime, 2, cb); },
			function (cb) { SubscriptionNewStat(startTime, endTime, 2, cb); },
			function (cb) { RenewRemoteWalletStat(startTime, endTime, 2, cb); },
			function (cb) { closeDB(cb); },

		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

let MonthlyJob = new CronJob({
	cronTime: Monthly,
	onTick: function () {
		let startTime = moment().startOf('month').add(-1, 'months').format();
		let endTime = moment().startOf('month').format();
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) { AccountStat(startTime, endTime, 3, cb); },
			function (cb) { BudgetStat(startTime, endTime, 3, cb); },
			function (cb) { CampaignStat(startTime, endTime, 3, cb); },
			function (cb) { CategoryStat(startTime, endTime, 3, cb); },
			function (cb) { DeviceStat(startTime, endTime, 3, cb); },
			function (cb) { TransactionStat(startTime, endTime, 3, cb); },
			function (cb) { TransactionDeleteStat(startTime, endTime, 3, cb); },
			function (cb) { UserStat(startTime, endTime, 3, cb); },
			function (cb) { RenewSubscriptionStat(startTime, endTime, 3, cb); },
			function (cb) { SubscriptionChurnStat(startTime, endTime, 3, cb); },
			function (cb) { AndroidDeviceStat(startTime, endTime, 3, cb); },
			function (cb) { IosDeviceStat(startTime, endTime, 3, cb); },
			function (cb) { WpDeviceStat(startTime, endTime, 3, cb); },
			function (cb) { WindowsDeviceStat(startTime, endTime, 3, cb); },
			function (cb) { MacDeviceStat(startTime, endTime, 3, cb); },
			function (cb) { WebDeviceStat(startTime, endTime, 3, cb); },
			function (cb) { RenewRemoteWalletStat(startTime, endTime, 3, cb); },
			function (cb) { PremiumCounter(3, cb); },
			function (cb) { NotificationStat(startTime, endTime, 3, cb); },
			function (cb) { countUserWindows(3, cb); },
			function (cb) { countUserWeb(3, cb); },
			function (cb) { closeDB(cb); },
		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

let ActiveUserCountryJob = new CronJob({
	cronTime: ActiveUserCountryCronTime,
	onTick: function () {
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) { ActiveUserStat(1, cb) },
			function (cb) { ActiveUserCountry(1, cb); },
			function (cb) { closeDB(cb); },
		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

let UserCountryJob = new CronJob({
	cronTime: UserCountryCountCronTime,
	onTick: function () {
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) {
				let startTime = moment().startOf('day').add(-1, 'days').format();
				let endTime = moment().startOf('day').format();
				userCountryAndRefCount(startTime, endTime, 1);
				cb();
			},
			function (cb) { closeDB(cb); }
		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

let WeeklyJob = new CronJob({
	cronTime: WeeklyEveryMondayAt4,
	onTick: function () {
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) {
				kueFailedClear();
				cb();
			},
			function (cb) { closeDB(cb); }
		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

let CheckHelpdeskIssueJob = new CronJob({
	cronTime: NineAmDaily,
	onTick: function () {
		async.series([
			function (cb) { connectDB(cb); },
			function (cb) {
				getOpenNoActiveHelpdesk()
					.then((issueList) => {
						if (!issueList || issueList.length === 0) {
							return;
						}

						issueList.forEach(issue => {
							let data = createHelpdeskNotificationContentAndUrl(issue);

							if (issue.assigned.length > 0) {
								issue.assigned.forEach(admin => {
									BackendNotification.addNew(admin, 'issue', data.content, data.url, (err) => {
										if (!err) {
											sendHelpdeskNotification(admin, data.url);
										}
									});
								});
							}
						});

						cb();
					})
					.catch(err => {
						console.log(err);
						cb();
					});
			},
			function (cb) { closeDB(cb); }
		], err => { });
	},
	start: false,
	timeZone: 'Asia/Ho_Chi_Minh'
});

DailyJob.start();
HourlyJob.start();
WeeklyJob.start();
MonthlyJob.start();
ActiveUserCountryJob.start();
UserCountryJob.start();
CheckHelpdeskIssueJob.start();
