/*
	Sync
	version2
 */

'use strict';

const Error = require('../config/error');
const Utils = require('../helper/utils');
let SyncIcon = require('../model/syncv2/icon').SyncIcon;

function checkServerMaintainLoginRequired(req, res, next){
	if (global.isServerMaintain){
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}
	next();
}

module.exports = function(server, config){
	server.use(checkServerMaintainLoginRequired);

	server.post('/syncv2/icon/push', (req, res) => {
		let syncIcon = new SyncIcon(req);
		
		syncIcon.pushToDB(function(err) {
			if (err) {
				res.send({s: false, e: Error.ERROR_SERVER});
			} else {
				res.send({s: true});
			}
		});
	});

	server.post('/syncv2/icon/pull', (req, res) => {
		let syncIcon = new SyncIcon(req);
		
		syncIcon.pull(function(err, data) {
			if (err) {
				res.send({s: false, e: Error.ERROR_SERVER});
			} else {
				res.send({s: true, d: data, t: Utils.currentTimestamp()});
			}
		});
	});
};