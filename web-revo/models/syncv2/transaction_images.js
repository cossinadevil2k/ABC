/*
	Transaction images
 */

var env = process.env.NODE_ENV;
var pushHook = require('../sync/newhook');
//var pushHook = require('../sync/hook');
var config = require('../../config/config')[env];
var fileMG = require('../fileManager');
var allowFile = config.allowFileUpload;
var savePath = config.transactionSyncImagePath;
var maxUploadSize = config.maxUploadSize;
var mongoose = require('mongoose');
var TransactionSchema = mongoose.model('Transaction');
var Permission = require('../../model/permission');
var SyncContant = require('../../config/sync_contant');

var TransactionImage = function(req){
	this.syncCode = 600;
	this.skipCheckAccount = false;
	this.__user_id = req.user_id;
	this.__construct(req);
};

TransactionImage.prototype = {
	__construct: function(request) {
		this.__setRequest(request);
		this.__initFileMG(request);
	},
	__setRequest: function(req){
		this.__request = req;
		this.__postData = req.body || req.query;
		this.__files = req.files;
	},
	__validPush: function(obj, files){
		return (!obj || !obj.gid || !obj.account_id || !obj.img || !obj.f);
	},
	__validPull: function(obj){
		return (!obj || !obj.gid || !obj.account_id || !obj.img);
	},
	__initFileMG: function(req){
		this.__fileManager = new fileMG(req);
		this.__fileManager.setAllowFile(allowFile);
		this.__fileManager.setMaxUploadSize(maxUploadSize);
	},
	__readFileFromDisk: function(callback){
		var self = this;
		var fileName = self.__postData.img;
		var folder = self.__makePath();
		var saveFile = self.__makePathImage(folder, fileName);
		self.__fileManager.readFile(saveFile, callback);
	},
	__saveImage: function(callback){
		var self = this;
		var file = self.__files.file;
		var fileName = self.__postData.img;
		var folder = self.__makePath();
		var saveFile = self.__makePathImage(folder, fileName);
		if(!self.__fileManager.checkExistFolder(folder)){
			self.__fileManager.createFolder(folder);
		}
		self.__fileManager.saveFile(file, saveFile, callback);
	},
	__makePath: function(){
		return savePath + this.__user_id;
	},
	__makeFileName: function(fileName, rawFile){
		return fileName + this.__fileManager.getExtend(rawFile);
	},
	// __makePathImage: function(folder, fileName, rawFileName){
	// 	return folder + this.__makeFileName(fileName, rawFileName);
	// },
	__makePathImage: function(folder, fileName){
		return folder + fileName;
	},
	__notif: function(){
		var self = this;
		var data = {f: self.syncCode};
		var account_id = self.__postData.account_id;
		var pushObj = new pushHook(self.__request);
		pushObj.send(data, false, function(status, data){
			// console.log('Push: %j', data);
		}, account_id);
	},
	__makeObj: function(){
		var self = this;
		return {
			uuid: self.__postData.img,
			type: self.__files.file.type,
			ext: self.__fileManager.getExtend(self.__files.file.name)
		}
	},
	__saveToDB: function(callback){
		var self = this;
		self.__getTransaction(function(status, transaction){
			if(status){
				transaction.syncImage.push(self.__makeObj());
				transaction.save(function(err){
					if(err) callback(false, Error.ERROR_SERVER);
					else callback(true, true);
				});
			} else {
				callback(false, Error.TRANSACTION_NOT_FOUND);
			}
		});
	},
	__removeImage: function(callback){
		var self = this;
		var gid = self.__postData.gid;
		var img = self.__postData.img;
		async.parallel({
			image: function(callback){
				var fileName = self.__postData.img;
				var folder = self.__makePath();
				var saveFile = self.__makePathImage(folder, fileName);
				self.__fileManager.removeFile(saveFile, function(status, err){
					if(err) callback(true, Error.FILE_SYNC_INTERNAL_ERROR);
					else callback(null, true);
				});
			},
			transaction: function(callback){
				TransactionSchema.update({
					_id: gid
				},{
					$pull: { 'syncImage.uuid': img },
					$set: { 'updateAt': new Date() }
				}, {
					safe: true
				}, function(err, numUp){
					if(err) callback(true, Error.ERROR_SERVER);
					else callback(null, true)
				});
			}
		}, function(err, results){
			if(err.image || err.transaction) callback(false, null, Error.FILE_SYNC_INTERNAL_ERROR);
			else {
				callback(true, true, null);
				self.__notif();
			}
		});
	},
	__checkReadPermission: function(user_id, account_id, callback) {
		if (this.skipCheckAccount) return callback(true);
		Permission.checkReadPermission(user_id, account_id, callback);
	},
	__checkWritePermission: function(user_id, account_id, callback) {
		if (this.skipCheckAccount) return callback(true);
		Permission.checkWritePermission(user_id, account_id, callback);
	},
	__getTransaction: function(callback){
		var self = this;
		var gid = self.__postData.gid;
		TransactionSchema.findById(gid, function(err, transaction){
			if(err || !transaction) callback(false, null);
			else callback(true, transaction);
		});
	},
	__getImage: function(callback){
		var self = this;
		var gid = self.__postData.gid;
		var img = self.__postData.img;
		TransactionSchema.findOne({'_id': gid, 'syncImage.name': img}, 'syncImage', function(err, transaction){
			if(err || !transaction) callback(false, null);
			else callback(true, transaction);
		});
	},
	__makeAttachment: function(imgObj){
		return 'attachment; filename=' + imgObj.uuid + '.' + imgObj.ext;
	},
	__parseImage: function(imageObj, imageFile){
		var self = this;
		return {
			attachment: self.__makeAttachment(imageObj),
			body: imageFile,
			type: imageObj.type
		}
	},
	__makeCallback: function(){
		var self = this;
		return [{
			_id: self.__postData.gid
		}];
	},
	__addImage: function(callback){
		var self = this;
		async.waterfall([
			function(callback){
				self.__saveImage(function(status, err){
					if(status) callback(null, true);
					else callback(null, err);
				});
			},
			function(arg, callback){
				if(arg === true){
					self.__saveToDB(function(status, err){
						if(status) callback(null, true);
						else callback(true, err);
					});
				} else {
					callback(true, arg);
				}
			}
		], function(err, results){
			if(err) callback(false, null, results);
			else {
				callback(true, self.__makeCallback(), null);
				self.__notif();
			}
		});
	},
	pushToServer: function(callback){
		var self = this;
		var account_id = self.__postData.account_id;
		if(self.__validPush(self.__postData, self.__files)) {
			callback(false, null, Error.SYNC_DATA_INVAILD_FORMAT);
		} else {
			self.__checkWritePermission(self.__user_id, account_id, function(status){
				if(status){
					var syncFlag = parseInt(self.__postData.f, 10);

					switch (syncFlag) {
						case SyncContant.FLAG_ADD:
							self.__addImage(callback);
							break;
						case SyncContant.FLAG_DELETE:
							self.__removeImage(callback);
							break;
						default:
							callback(false, null, Error.SYNC_DATA_INVAILD_FORMAT);
					}
				} else {
					callback(false, null, Error.SYNC_ACCOUNT_CAN_NOT_WRITE);
				}
			});
		}
	},
	pull: function(callback){
		var self = this;
		var account_id = self.__postData.account_id;
		if(self.__validPull(self.__postData)) {
			callback(false, null, Error.SYNC_DATA_INVAILD_FORMAT);
		} else {
			self.__checkReadPermission(self.__user_id, account_id, function(status){
				if(status){
					async.parallel({
						transaction: function(callback){
							self.__getImage(function(status, data){
								if(status) callback(null, data);
								else callback(null, false);
							});
						},
						file: function(callback){
							self.__readFileFromDisk(function(status, file){
								if(status) callback(null, file);
								else callback(null, false);
							});
						}
					}, function(err, results){
						if(results.transaction && results.file) {
							callback(true, self.__parseImage(results.transaction.syncImage[0], results.file), null);
						} else {
							callback(false, null, Error.FILE_SYNC_INTERNAL_ERROR);
						}
					});
				} else {
					callback(false, null, Error.SYNC_ACCOUNT_CAN_NOT_READ);
				}
			});
		}
	}
};

module.exports = TransactionImage;

