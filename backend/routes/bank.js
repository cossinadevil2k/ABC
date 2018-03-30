/*
	Bank
*/

'use strict';

let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let fs = require('fs');
let dataPath = config.bank;
let lastUpdateBankPath = config.bankUpdateFile;

let appGet = function(req, res){
	let data = fs.readFileSync(dataPath);
	let newContent = data.toString();
	res.send({error: false, data: JSON.parse(newContent)});
};

let appUpdate = function(req, res){
	let lb = req.body.listBank;
	let timeStamp = parseInt(new Date().getTime()/1000, 10);
	let newData = {t: timeStamp, data: lb};
	let timestampData = {lastBankListUpdate: timeStamp};
	fs.writeFile(dataPath, JSON.stringify(newData), {flag: 'w+'}, function(err) {
		if (!err) {
			fs.writeFile(lastUpdateBankPath, JSON.stringify(timestampData), {flag: 'w+'}, function(err) {
				// console.log(err);
			});
		}

		res.send({error: !!err, msg: err});
	});
};

module.exports = function(app, config){
	app.get('/bank', staticsMain);
	app.post('/bank/get', appGet);
	app.post('/bank/update', appUpdate);
};