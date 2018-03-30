/*
	Upload file
 */

var env = process.env.NODE_ENV;
var config = require('../config/config')[env];
var fs = require('fs');
var Error = require('../config/error');
var uploadDir = config.root + '/app/public/data/';
var utils = require('../helper/utils');

var makeFileName = function(filename){
	return utils.uid(32) + '_' + filename;
};

var appUploadFile = function(req, res){
	var body = req.body;
	var user_id = req.user_id;
	if(user_id && body){
		var packages = req.files.file;

		if(file) {
			var fileName = makeFileName(packages.name);
			fs.rename(packages.path, uploadDir + fileName, function(err){
				if(err) res.send({s: false, e: Error.UPLOAD_ERROR });
				else res.send({s: true, file: fileName});
			});
		} else {
			res.send({s: false, e: Error.UPLOAD_ERROR });
		}
	} else {
		res.send({s: false, e: Error.UPLOAD_ERROR });
	}
};

module.exports = function(server, config){
	server.post('/money/upload', appUploadFile);
};