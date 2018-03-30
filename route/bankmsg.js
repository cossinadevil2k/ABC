'use strict';

const env = process.env.NODE_ENV;
const config = require('../config/config')[env];
const fs = require('fs');
const dataPath = config.bank;
const mongoose = require('mongoose');
const BankMsg = mongoose.model('BankMsg');

function checkServerMaintainLoginRequired(res){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
}

let saveBankMsg = function(mess, cb){
	let msg = {
        sender: mess.sender,
		bankname: mess.bankname,
		content: mess.content,
        email: mess.email,
        national: mess.national
	};
	
	BankMsg.addNew(msg, cb);
};

let appSave = function(req, res){
    checkServerMaintainLoginRequired(res);

	let rqst = req.body;
    
	saveBankMsg(rqst, function(err, result){
		res.json({s: !err});
	});
};

let appCheck = function(req, res){
    checkServerMaintainLoginRequired(res);

    /*
    * request = {count: number}
    */
    let request = req.body;
    let data = fs.readFileSync(dataPath);
    let datajson = JSON.parse(data.toString());
    if(request.count == datajson.data.length) res.send({changed: false});
    else res.send({changed: true});
};

let appUpdate = function(req, res){
    checkServerMaintainLoginRequired(res);
    /*
    * request = {okget: true}
    */
    let request = req.body;
    let data = fs.readFileSync(dataPath);
    let datajson = JSON.parse(data.toString());
    if(request.okget==='ok')
        res.send(datajson);
};

module.exports = function(app, config){
	app.post('/bankmsg/save', appSave);
    app.post('/bankmsg/check', appCheck);
    app.post('/bankmsg/update', appUpdate);
};