/*
	Statics
*/

'use strict';

var mongoose = require('mongoose');
var Events = mongoose.model('Events');
var moment = require('moment');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var Error = require('../config/error');

var ACTION = {

};

var linkedWalletActions = {
	"cgv_vn": [
		{
			"type": 2,
			"name": "Homepage",
			"icon": "https://static.moneylover.me/img/icon/icon.png",
			"color": "#EB4637",
			"metadata": {
				"link": "https://www.cgv.vn/"
			}
		},
		{
			"type": 1,
			"name": "Showing",
			"icon": "https://static.moneylover.me/img/icon/icon_3.png",
			"color": "#e2918a",
			"metadata": {}
		}
	],
	"vietcombank_vn": [
		{
			"type": 2,
			"name": "Homepage",
			"icon": "https://static.moneylover.me/img/icon/icon_2.png",
			"color": "#6ABE3F",
			"metadata": {
				"link": "http://vietcombank.com.vn/"
			}

		},
		{
			"type": 1,
			"name": "Login",
			"icon": "https://static.moneylover.me/img/icon/icon_9.png",
			"color": "#589b34",
			"metadata": {}
		}
	]
};

function checkServerMaintainLoginRequired(res) {
	if (global.isServerMaintain) {
		return res.send({ s: false, e: Error.SYNC_SERVER_MAINTAINCE });
	}
}

function checkServerMaintain(res) {
	if (global.isServerMaintain) {
		return res.send({ status: false, message: Error.SYNC_SERVER_MAINTAINCE });
	}
}

function parseEvent(event, lang) {

	var tmp = { status: true, data: { link: event.link, name: event.name, description: event.description, linkIcon: event.link_icon } };
	if (event.addLang) {
		event.addLang.forEach(function (eventLang) {
			if (eventLang.lang == lang) {
				tmp.data.link = eventLang.link || event.data.link;
				tmp.data.name = eventLang.title || event.data.name;
				tmp.data.description = eventLang.description || event.data.description;
				tmp.data.linkIcon = eventLang.link_icon || event.data.link_icon;
			}
		});
	}
	return tmp;
}

function findEvent(events, today) {
	var tmpEvent = null;
	events.forEach(function (event) {
		if (moment(event.eventAt).unix() === today) {
			tmpEvent = event;
		} else if (moment(event.eventAt).unix() <= today && today <= moment(event.endEventAt).unix()) {
			tmpEvent = event;
		}
	});
	return tmpEvent;
}

var providerActions = function (req, res) {
	let user_id = req.user_id;

	if (!user_id) {
		return res.send({ s: false, e: Error.USER_NOT_LOGIN });
	}

	let providerCode = req.body.pc;

	if (!providerCode) {
		return res.send({ s: false, e: Error.PARAM_INVALID });
	}

	var data = linkedWalletActions[providerCode] || [];
	res.send({ s: true, d: data });
};

var eventInfo = function (req, res) {
	checkServerMaintain(res);

	var lang = req.body.l;
	if (lang) lang = lang.toLowerCase().split('-')[0];
	var startDate = moment().add(-3, 'd').startOf('day').format();
	var endDate = moment().add(3, 'd').endOf('day').format();
	var today = moment().startOf('day').unix();

	Events.find({ eventAt: { $gte: startDate, $lte: endDate } })
		.sort({ eventAt: 1 })
		.exec(function (err, events) {
			var event = findEvent(events, today);
			if (event) res.send(parseEvent(event, lang));
			else res.send({ status: false });
		});
};

var appAnhLeTest = function (req, res) {
	res.json({
		"last_update": 1470627846,
		"missions": [
			{
				"id": 1,
				"name": "Adding",
				"category": "Transaction",
				"description": "Add a transaction",
				"hint": "",
				"cover_file_path": "https://image.flaticon.com/sprites/new_packs/138198-business-collection.png",
				"hidden_mission": false,
				"reward": 2,
				"available_period": 0,
				"bonus": {
					"limited_times": 2,
					"point": 2,
					"factor": 1
				}
			},
			{
				"id": 2,
				"name": "Adding",
				"category": "Budget",
				"description": "Add a budget",
				"hint": "Maximum time-range from first created date is 2 weeks",
				"cover_file_path": "http://www.pngmart.com/files/2/Yoshi-PNG-File.png",
				"hidden_mission": false,
				"reward": 2,
				"available_period": 14,
				"bonus": {
					"limited_times": 3,
					"point": 2,
					"factor": 1
				}
			},
			{
				"id": 3,
				"name": "Adding",
				"category": "Event",
				"description": "Add 1 budget right after finished one",
				"hint": "Maximum time-range from first created date is 2 weeks",
				"cover_file_path": "http://www.pngmart.com/files/2/Yoshi-PNG-File.png",
				"hidden_mission": false,
				"reward": 2,
				"available_period": 14,
				"bonus": {
					"limited_times": 3,
					"point": 2,
					"factor": 2
				}
			}
		]
	});
};

module.exports = function (server, config) {
	server.post('/lw-provider-actions', providerActions);
	server.post('/info/event', eventInfo);
	server.post('/test/anhle', appAnhLeTest);
};
