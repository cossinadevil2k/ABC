/*
	File manager
 */

var fs = require('fs');
var env = process.env.NODE_ENV;
var config = require('../config/config')[env];
var Error = require('../config/error');
var _ = require('underscore');

var FileManager = function(req){
	this.__user_id = req.user_id;
	this.__allowFile = null;
};

FileManager.prototype = {
	__checkAllowFile: function(file){
		var self = this;
		if(!self.__allowFile) return true;
		else return (_.indexOf(self.__allowFile, file.type) >= 0);
	},
	__checkFileSize: function(file){
		var self = this;
		if(self.__setMaxUploadSize === 0) return true;
		else return file.size <= self.__setMaxUploadSize;
	},
	setAllowFile: function(ext){
		this.__allowFile = ext;
	},
	setMaxUploadSize: function(size){
		this.__setMaxUploadSize = size;
	},
	checkExistFolder: function(path){
		return fs.existsSync(path);
	},
	createFolder: function(path){
		fs.mkdirSync(path);
	},
	getExtend: function(fileName){
		var splitName = fileName.split('.');
		return splitName[splitName.length - 1];
	},
	saveFile: function(files, pathSave, callback){
		var self = this;
		if(!self.__checkAllowFile(files)){
			callback(false, Error.FILE_NOT_ALLOW);
		} else if(!self.__checkFileSize(files)){
			callback(false, Error.FILE_SIZE_OVER);
		} else {
			fs.rename(files.path, pathSave, function(err, data){
				if(err) callback(false, Error.FILE_SAVE_ERROR);
				else callback(true, null);
			});
		}
	},
	readFile: function(path, callback){
		fs.readFile(path, function(err, data){
			if(err) callback(false, Error.FILE_CAN_NOT_READ);
			else callback(true, data);
		});
	},
	removeFile: function(path, callback){
		fs.unlink(path, function(err, data){
			if(err) callback(false, Error.FILE_CAN_NOT_DELETE);
			else callback(true, null);
		})
	}
};

module.exports = FileManager;
