/*
	Events
*/

'use strict';

let mongoose = require('mongoose');
let Events = mongoose.model('Events');
let Active = mongoose.model('Active');
let async = require('async');
let moment = require('moment');
let validator = require('../../helper/validators');
let utils = require('../../helper/utils');
let nodeExcel = require('excel-export');


function formatTime(timed, option){
	if(option) return moment(timed, 'DD-MM-YYYY').endOf('day').format();
	else return moment(timed, 'DD-MM-YYYY').format();
}

function addNewEvent(eventInfo, callback){
	// console.log(eventInfo);
	eventInfo.eventAt = moment(eventInfo.eventAt).format();
	eventInfo.endEventAt = moment(eventInfo.endEventAt).endOf('day').format();
	Events.addEvent(eventInfo, callback);
}

function editEvent(eventInfo, callback){
	eventInfo.eventAt = moment(eventInfo.eventAt).format();
	eventInfo.endEventAt = moment(eventInfo.endEventAt).endOf('day').format();
	Events.editEvent(eventInfo, callback);
}

function deleteEvent(eventInfo, callback){
	Events.deteleEvent(eventInfo._id, callback);
}

function stats(startDate, endDate, callback){
	Active.count({ 'activeAt': {$gte: startDate, $lte: endDate}, 'status': true }, callback);

	// Active.aggregate(
	// 	{
	// 		$match: {
	// 			'activeAt': {$gte: startDate, $lte: endDate},
	// 			'status': true
	// 		}
	// 	},
	// 	{
	// 		$group: {
	// 			_id: {
	// 				year: { $year : "$activeAt" },
	// 				month: { $month : "$activeAt" },
	// 				days: { $dayOfMonth : "$activeAt" }
	// 			},
	// 			total: {
	// 				$sum: 1
	// 			}
	// 		}
	// 	},
	// 	{
	// 		$group : {
	// 			_id : {
	// 				year: "$_id.year",
	// 				month: "$_id.month"
	// 			},
	// 			dailyStats: {
	// 				$push: {
	// 					ngay: "$_id.days",
	// 					count: "$total"
	// 				}
	// 			}
	// 		}
	// 	},
	// 	callback
	// );
}

let appList = function(req, res){
	Events.find({})
		.sort({'eventAt': -1})
		.select('-__v')
		.exec(function(err, events){
			if(err) res.send({error: true, msg: err});
			else res.send({error: false, data: events});
		});

};

let appUpdate = function(req, res){
	let eventInfo = req.body.event;
	let type = req.body.type;
	if (type === 1) {
		addNewEvent(eventInfo, function(status) {
			res.send({error: !status, data: status});
		});
	} else {
		editEvent(eventInfo, function(status) {
			res.send({error: !status, msg: null});
		});
	}
};

let appUpdateLang = function(req, res){
	let eventId = req.body.event;
	let language = req.body.language;
	if(eventId && language){
		Events.updateLanguage(eventId, language, function(status){
			res.send({error: status});
		});
	} else res.send({error: true});
};

let appDelete = function(req, res){
	let eventInfo = req.body.event;
	deleteEvent(eventInfo, function(status){
		res.send({error: !status});
	});
};

let appStats = function(req, res){
	let startDate = formatTime(req.body.startDate);
	let endDate = formatTime(req.body.endDate);
	stats(startDate, endDate, function(err, stat){
		if(err) res.send({error: true, msg: err});
		else res.send({error: false, data: stat});
	});
};

let appCodeList = function(req, res){
	let query = req.body.conditions;

	Active.find({"mlEvent": query.eventid})
		.sort('status')
		.limit(query.limit)
		.skip(query.offset)
		.exec(function(err, result){
			if(err){
				res.send({err:true});
			} else {
				res.send({err:false, data: result});
			}
		});
};

let appGenCode = function(req, res){
	let codeInfo = req.body.codeInfo;
	let hasNoDash = req.body.hasNoDash;
	let codes = "";

	if (!codeInfo.p) {
		codeInfo.p = "";
	} else {
		if (!hasNoDash) {
			codeInfo.p = codeInfo.p + "-";
		}
	}
	
	if (!codeInfo.s) {
		codeInfo.s = "";
	} else {
		if (!hasNoDash) {
			codeInfo.s = "-" + codeInfo.s;
		}
	}

	let i = 0;
	
	for (i; i < codeInfo.n ; i++){
		let codeStr = (codeInfo.p + utils.uid(codeInfo.l) + codeInfo.s).toLowerCase();
		let createActiveCode = new Active({
			code: codeStr,
			mlEvent: codeInfo.eventid,
			product: codeInfo.product
		});

		codes += createActiveCode.code+"\n";

		createActiveCode.save(function(err, data){

		});
	}
	
	res.send({codes:codes});
};

let appCodeUpdate = function(req, res){
	let code = req.body.code;
	Active.findOneAndUpdate({_id:code._id}, {status: code.status}, function(err,data){
		if(err){
			res.send({err:true, msg: 'something error'});
		} else {
			res.send({err:false, msg: "ok"});
		}
	})
};

let appCodeExport = function(req, res){
	let condition = req.query;
	let query = {};

	query.mlEvent = condition.eid;

	if (condition.isAll === 'false') {
		query.status = false;
	}

	Active.find(query, function(err,data){
		if (err) return res.send(403);

		let conf = {};
		conf.cols = [
			{
				caption: 'Code',
				type: 'string',
				width: 30
			},{
				caption: 'isUsed?',
				type: 'boolean',
				width: 10
			}
		];

		conf.rows=[];
		data.forEach(function(element){
			conf.rows.push([element.code, element.status]);
		});
		let result = nodeExcel.execute(conf);
		let fileName = "[Code]"+condition.ename+".xlsx";
		res.setHeader('Content-Type', 'application/vnd.openxmlformats');
		res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
		res.end(result, 'binary');
	});
};

let appCodeListInfo = function(req, res){
	let eventid = req.body.eventid;
	async.parallel({
		totalCode: function(callback){
			Active.count({"mlEvent": eventid}, function(err,data){
				if(err) {
					callback(null, null);
				}
				else callback(null, data);
			})
		},
		usedCodeAmount: function(callback){
			Active.count({"mlEvent": eventid, status: true}, function(err,data){
				if(err) callback(null, null);
				else callback(null, data);
			})
		}
	}, function(err, results){
		if(results.totalCode !==null && results.usedCodeAmount!==null)
			res.send({err:false, totalCode: results.totalCode, usedCodeAmount: results.usedCodeAmount});
		else res.send({err:true, msg: 'Event Code Counting Error'});
	});
	
	// Active.count({mlEvent: eventid}, function(err,data){
	// 	if(err) console.log(err);
	// 	else console.log(data);
	// })
};

module.exports = function(app, config){
	app.get('/events', staticsMain);
	app.post('/events/list', appList);
	app.post('/events/updatelang', appUpdateLang);
	app.post('/events/update', appUpdate);
	app.post('/events/delete', appDelete);
	app.post('/events/stats', appStats);
	app.post('/events/codelist', appCodeList);
	app.post('/events/gencode', appGenCode);
	app.post('/events/codeupdate', appCodeUpdate);
	app.get('/events/codeexport', appCodeExport);
	app.post('/events/getCodeListInfo', appCodeListInfo);
};
