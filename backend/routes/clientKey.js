'use strict';

let mongoose = require('mongoose');
let OAuthDB = require('../../model/helper/mongodb_connect_oauth');
let ClientKey = OAuthDB.model('ClientKey');
let AdminLog = mongoose.model('PremiumLog');

let appGet = function(req, res){
	let rule = req.body.rule;

	if (!req.session.adminSystem) return res.send({s: false, e:'Permission Error'});
	if (rule === null || rule === undefined) return res.send({s: false});

	ClientKey.find({rule: rule})
		.sort({clientName: 1})
		.exec(function(err, data){
			res.send({s: !err, d: data});
		});
};

let appDelete = function(req, res){
	let ckid = req.body.ckid;
	ClientKey.findOneAndRemove({'_id':ckid}, function(err){
		if(err){
			res.send(err)
		} else {
			res.send({message: 'Delete Success'})
		}
	})
};

let appSave = function(req, res){
	let clientName = req.body.clientName;
	let platform = req.body.platform;
	let rule = req.body.rule;

	if (!clientName || rule === undefined || rule === null) {
		return res.send({s: false});
	}

	ClientKey.addClient({
		name: clientName,
		platform: platform,
		rule: rule
	}, (err, data) => {
		res.send({s: !err, d: data});
	});
};

let appDisable = function(req, res){
	let id = req.body.clientId;
	if (!id) return res.send({s: false});

	ClientKey.disableClientById(id, err => {
		res.send({s: !err});
	});
};

let appEnable = function(req, res){
	let id = req.body.clientId;
	if (!id) return res.send({s: false});

	ClientKey.enableClientById(id, err => {
		res.send({s: !err});
	});
};

let appEdit = function(req ,res){
	let id = req.body.clientId;
	let name = req.body.name;
	let platform = req.body.platform;

	if (!id || !name || !platform) return res.send({s: false});

	ClientKey.findByIdAndUpdate(id, {clientName: name, platform: platform}, err => {
		res.send({s: !err});
	});
};

let appRegenSecret = function(req, res){
	let id = req.body.clientId;

	if (!id) return res.send({s: false});

	ClientKey.regenerateSecret(id, (err, result) => {
		res.send({s: !err, d: result});

		if (!err) {
			AdminLog.addNew(null, req.session.adminName, 'Regen Secret of key ' + result.clientName, function () {
			});
		}
	});
};

let appChangeInternal = function(req, res) {
	let id = req.body.id;
	let status = req.body.status;

	if (!id || status === null) return res.json({s: false});

	ClientKey.findByIdAndUpdate(id, {$set: {internal: status}}, err => {
		res.json({s: !err});
	});
};

module.exports = function(app, config){
	app.get('/clientkey', staticsMain);
	app.post('/clientkey/get', appGet);
	//app.post('/clientkey/delete', appDelete);
	app.post('/clientkey/save', appSave);
	app.post('/clientkey/disable', appDisable);
	app.post('/clientkey/enable', appEnable);
	app.post('/clientkey/edit', appEdit);
	app.post('/clientkey/change-internal', appChangeInternal);
	app.post('/clientkey/regenerate-secret', appRegenSecret);
};
