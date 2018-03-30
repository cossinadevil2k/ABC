/*
	Icons
*/

'use strict';

const env = process.env.NODE_ENV;
const mongoose = require('mongoose');
const config = require('../../config/config')[env];
const utils = require('../../helper/utils');
const fs = require('fs');
const folderPackPrefix = config.iconPackPrefix;
const async = require('async');
const DecompressZip = require('decompress-zip');
const formidable = require('formidable');
const storeNewItemLog = "storeNewItemLog";

let ItemModel = mongoose.model('Item');

function copyFile(from, to, callback){
	let src = fs.createReadStream(from);
	let dest = fs.createWriteStream(to);

	let cleanup = function(){
		dest.removeListener('finish', finish);
		dest.removeListener('error', error);
		src.removeListener('error', error);
	};
	let finish = function(){
		cleanup();
		callback(null);
	};
	let error = function(err){
		cleanup();
		callback(err);
	};

	dest.addListener('finish', finish);
	dest.addListener('error', error);
	src.addListener('error', error);

	src.pipe(dest);
}

function handleIconData(dataSet){
	return dataSet.map((item) => {
		item.isNew = item.isNewItem;
		delete item.isNewItem;
		item.canShare = !!item.canShare;
		item.canBuy = !!item.canBuy;
		item.discount = item.discount || 0;

		return item;
	});
}

let appGet = function(req, res){
    // let data = fs.readFileSync(icon_json_path);
    // let newContent = data.toString();
    //
    // //non-release icon list
    // let privateData = fs.readFileSync(private_icon_json_path);
    // let newPrivateContent = privateData.toString();
	const skip = 0;
	const limit = 999;

	async.parallel({
		data: function(cb) {
			ItemModel.findAll({type: 1, isPublic: true}, skip, limit, (error, dataSet) => {
				if (error) return cb(error);

				cb(null, handleIconData(dataSet));
			});
		},
		privateData: function (cb) {
			ItemModel.findAll({type: 1, isPublic: false}, skip, limit, (error, dataSet) => {
				if (error) return cb(error);

				cb(null, handleIconData(dataSet));
			});
		}
	}, (err, result) => {
		if (err) {
			res.send({error: err});
		} else {
			res.send({error: !!err, data: result.data, privateData: result.privateData});
		}
	});
};

let appUpdate = function(req, res){
	let data = req.body.data;

	if (!data) {
		return res.json({s: false});
	}

	let id = data._id;
	delete data._id;

	if (data.__v) {
		delete data.__v;
	}

	ItemModel.findByIdAndUpdate(id, {$set: data}, (err) => {
		res.json({s: !err});
	});
};

let appDelete = function(req, res){
	let id = req.body._id;
	let iconPackUrl = config.root+'/app/public/icon_pack/';
	let previewStr= (req.body.preview).split("/"),
		linkStr = (req.body.link).split("/"),
		thumbStr = (req.body.thumb).split("/"),
		previewPath = previewStr[4]+"/"+previewStr[5],
		linkPath = linkStr[4]+"/"+linkStr[5],
		thumbPath = thumbStr[4]+"/"+thumbStr[5];

	ItemModel.removeItemById(id, (err) => {
		if (err) return res.send({s: false});

		try {
            fs.unlinkSync(iconPackUrl + thumbPath);
            fs.unlinkSync(iconPackUrl + previewPath);
            fs.unlinkSync(iconPackUrl + linkPath);
            res.send({s: true});
        } catch (e) {
			
		}
	});
};

let appUploadPack = function(req, res){
	if(!req.session.adminId) return res.send(403);

	let copyFilesToStatics = function(info, callback){
		async.parallel([
			function(cb){
				copyFile(info.thumb.path, info.thumbPath, cb);
			},

			function(cb){
				copyFile(info.preview.path, info.previewPath, cb);
			},

			function(cb){
				copyFile(info.packages.path, info.packagePath, function(err){
					cb(err);
					//extract icon zip file
					if (!err) {
						decompressPack(info.iconDir2, info.packagePath, function(){});
						decompressPack(info.iconDir1, info.packagePath, (err, fileList) => {
                            if (fileList) {
                                let mapFile = require('../../app/public/icon_map.json');
                                let mapFilePath = config.root + '/app/public/icon_map.json';

                                let pkgInfoFileIndex = fileList.findIndex(file => file === 'package.json');
                                if (pkgInfoFileIndex !== -1) fileList.splice(pkgInfoFileIndex, 1);
                                mapFile.files[info.packageName] = fileList;

                                fs.writeFile(mapFilePath, JSON.stringify(mapFile), err => {

								});
                            }
						});
					}
				});
			}
		], callback);
	};

	let form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		if (err) {
			return res.json({s: false});
		}

		let packageName = fields.packagename;
		let thumb = files.thumb;
		let preview = files.preview;
		let packages = files.packages;
		let uploadDir = config.root + '/app/public/icon_pack/';
		let iconDir2 = config.root + '/app/public/img/icon/';
		let iconDir1 = config.root + '/app/public/img/icon/' + packageName;
		let packagePath = uploadDir + 'pack/'+ folderPackPrefix + packageName + '.zip';
		let thumbPath = uploadDir + 'thumb/'+ folderPackPrefix + packageName + '_thumb.png';
		let previewPath = uploadDir + 'thumb/'+ folderPackPrefix + packageName + '_preview.png';

		let info = {
			thumb: thumb,
			preview: preview,
			packages: packages,
			thumbPath: thumbPath,
			previewPath: previewPath,
			packagePath: packagePath,
			iconDir2: iconDir2,
			iconDir1: iconDir1,
			packageName: packageName
		};

		copyFilesToStatics(info, function(error){
			if (error) {
				res.json({s: false});
			} else {
				res.json({s: true, prefix: folderPackPrefix, t: (env !== 'production')});

				// Bỏ file temp
				fs.unlinkSync(thumb.path);
				fs.unlinkSync(preview.path);
				fs.unlinkSync(packages.path);
			}
		});
	});
};

let decompressPack = function(iconDir, packagePath, callback){
    let unzipper = new DecompressZip(packagePath);
	fs.mkdir(iconDir, function(mkdirErr){
		fs.readdir(iconDir,function(err, listFile){ //get icon files
			if(!err) {
				unzipper.on('error', function (err2) {
					// console.log(err2);
					callback(err2);
				});

				unzipper.extract({
					path: iconDir
				});

				callback(null, listFile);
			}
		});
	});
};

let appUpload = function(req, res){
	if(!req.session.adminId) {
		return res.send(403);
	}

	let form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		let packages = files.filedata;
		//let packageName = fields.packagename; //product id
		let packageName = packages.name.slice(0, packages.name.length - 4); //real file name without extension
		let uploadType = fields.uploadtype;
		let iconDir2 = config.root + '/app/public/img/icon/';
		let iconDir1 = config.root + '/app/public/img/icon/' + packageName;
		let uploadDir = config.root + '/app/public/icon_pack/';
		//let packagePath = uploadDir + uploadType + '/' + folderPackPrefix + packageName + '.zip';
		let packagePath = uploadDir + uploadType + '/' + folderPackPrefix + packages.name;

		//fs.createReadStream(packages.path).pipe(fs.createWriteStream(uploadDir + uploadType + '/' + folderPackPrefix + packageName + '.zip'));
		copyFile(packages.path, packagePath, function(err){
			if (!err) {
				if (packages.name.indexOf('.zip') !== -1) {
					decompressPack(iconDir2, packagePath, function () {});
					decompressPack(iconDir1, packagePath, function () {});
				}

				res.send({
					s: true,
					d: 'https:' + config.site.urlStatic3 + 'icon_pack/' + uploadType + '/' + folderPackPrefix + packages.name,
					t:(env != 'production')
				});

				fs.unlinkSync(packages.path);
			}
		});
	});
};

let appChangeFreeStatus = function(req, res){
	let id = req.body.id;
	let status = req.body.status;
	
	ItemModel.changeFreeStatusById(id, status, (err) => {
		if (err) return res.send({s: false});
		
		res.send({s: true});
	});
};

let appChangeNewStatus = function(req, res) {
	let id = req.body.id;
	let status = req.body.status;

	ItemModel.changeNewStatusById(id, status, (err) => {
		if (err) return res.send({s: false});

		res.send({s: true});
	});
};

let appChangeFeatureStatus = function(req, res) {
	let id = req.body.id;
	let status = req.body.status;

	ItemModel.changeFeatureStatusById(id, status, (err) => {
		if (err) return res.send({s: false});

		res.send({s: true});
	});
};

let appChangeTopDownloadStatus = function(req, res) {
	let id = req.body.id;
	let status = req.body.status;

	ItemModel.changeTopDownloadStatusById(id, status, (err) => {
		if (err) return res.send({s: false});

		res.send({s: true});
	});
};

let appChangeHideStatus = function(req, res) {
	let id = req.body.id;
	let status = req.body.status;

	ItemModel.changeHideStatusById(id, status, (err) => {
		if (err) return res.send({s: false});

		res.send({s: true});
	});
};

let appChangePublicStatus = function(req, res) {
	let id = req.body.id;
	let status = req.body.status;

	ItemModel.changePublicStatusById(id, status, (err) => {
		if (err) return res.send({s: false});

		res.send({s: true});
	});
};

let appCreate = function (req, res) {
	let icon = req.body.icon;
	
	if (!icon) return res.send({s: false});

	icon.type = 1;

	ItemModel.createItem(icon, (err, data) => {
		if (err) return res.send({s: false});

		data.isNew = data.isNewItem;

		res.send({s: true, d: data});
	});
};

let appBuild = function (req, res) {
	ItemModel.getIconDataForCache((err, list) => {
		if (err) return res.send({error: true, msg: err});

		fs.writeFile(config.iconPack, JSON.stringify(handleIconData(list)), (buildErr) => {
			res.json({s: !buildErr});
			// redisClient.HSET(storeNewItemLog, timeStamp, newItems);
		});
	});
};

module.exports = function(app, config){
	app.get('/icons', staticsMain);
	app.get('/icons/info-maker', staticsMain);
	app.post('/icons/get', appGet);
	app.post('/icons/update', appUpdate);
	app.post('/icons/build', appBuild);
	app.post('/icons/upload',appUpload);
	app.post('/icons/upload-package', appUploadPack);
	app.post('/icons/delete-pack', appDelete);
	app.post('/icons/change-free-status', appChangeFreeStatus);
	app.post('/icons/change-new-status', appChangeNewStatus);
	app.post('/icons/change-feature-status', appChangeFeatureStatus);
	app.post('/icons/change-top-download-status', appChangeTopDownloadStatus);
	app.post('/icons/change-hide-status', appChangeHideStatus);
	app.post('/icons/change-public-status', appChangePublicStatus);
	app.post('/icons/create', appCreate);
};
