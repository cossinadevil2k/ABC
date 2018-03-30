'use strict';

let redisClient	= require('../config/database').redisClient;
let Utils		= require('./helper/utils');
let mongoose	= require('mongoose');
let async		= require('async');

function savePermissionIntoRedis(key, user){
	redisClient.SADD(key, user.toString());
}

function checkWalletPermission(key, user_id, array){
	// if (array[key]) {
	// 	let index = array[key].indexOf(user_id);
	// 	if (index !== -1) callback(true);
	// 	else callback(false);
	// } else callback(false);
	//
	if (!array[key]) return false;

	if (array[key].length === 0) return false;

	for (let i = 0; i < array[key].length; i++) {
		if (user_id.toString() === array[key][i].toString()) {
			return true;
		}
	}

	return false;
}

function checkPermissionFromMongo(walletId, userId, key, callback){
	let Account = mongoose.model('Account');
	Account.findById(walletId, 'permission', function(err, wallet){
		if (err) return callback(err);

		if (!wallet) return callback(null, false);

		if (wallet.permission) {
			// checkWalletPermission(key, userId, wallet.permission, function(result){
			// 	if (result) {
			// 		// savePermissionIntoRedis(key, userId);
			// 		callback(null, true);
			// 	} else {
			// 		callback(null, false);
			// 	}
			// });
			callback(null, checkWalletPermission(key, userId, wallet.permission))
		} else {
			callback(null, false);
		}
	});
}

let checkReadPermission = function(user_id, account_id, callback){
	let key = genPermissionKey(account_id, 'r');
	// redisClient.SISMEMBER(key, user_id.toString(), function(err, reply){
	// 	if (err) {
	// 		return callback(err);
	// 	}
    //
	// 	if (!reply) {
	// 		checkPermissionFromMongo(account_id, user_id, key, callback);
	// 	} else {
	// 		callback(null, reply);
	// 	}
	// });

	checkPermissionFromMongo(account_id, user_id, key, (error, right) => {
		if (error) return callback(error);

		if (right) return callback(null, right);

		redisClient.SISMEMBER(key, user_id.toString(), (err, reply) => {
			if (err) return callback(err);

			if (!reply) return callback(null, reply);

			setAccountPermission(user_id.toString(), account_id, true, true, function(){});
			callback(null, reply);
		});
	});
};

let checkWritePermission = function(user_id, account_id, callback){
	let key = genPermissionKey(account_id, 'w');
	// redisClient.SISMEMBER(key, user_id.toString(), function(err, reply){
	// 	if (err) return callback(err);
    //
	// 	if (!reply) {
	// 		checkPermissionFromMongo(account_id, user_id, key, callback);
	// 	} else {
	// 		callback(null, reply);
	// 	}
	// });

	checkPermissionFromMongo(account_id, user_id, key, (error, right) => {
		if (error) return callback(error);

		if (right) return callback(null, right);

		redisClient.SISMEMBER(key, user_id.toString(), (err, reply) => {
			if (err) return callback(err);

			if (!reply) return callback(null, reply);

			setAccountPermission(user_id.toString(), account_id, true, true, function(){});
			callback(null, reply);
		});
	});
};

let setAccountPermission = function(user_id, account_id, canRead, canWrite, callback){
	let Account = mongoose.model('Account');

	if (!user_id || !account_id) {
		return callback(false);
	}

	let readKey = genPermissionKey(account_id, 'r');
	let writeKey = genPermissionKey(account_id, 'w');

	async.series([
		function(cb){
			if (canRead) {
				// redisClient.SADD(readKey, user_id.toString());

				Account.updatePermission(account_id, user_id, 'add', readKey, function(status){
					if (status) cb();
					else cb("Can't save read permission to mongo");
				});
			}
			else {
				// redisClient.SREM(readKey, user_id.toString());

				Account.updatePermission(account_id, user_id, 'remove', readKey, function(status){
					if (status) cb();
					else cb("Can't save permission to mongo");
				});
			}
		}, function(cb){
			if (canWrite) {
				// redisClient.SADD(writeKey, user_id.toString());

				Account.updatePermission(account_id, user_id, 'add', writeKey, function(status){
					if (status) cb();
					else cb("Can't save write permission to mongo");
				});
			} else {
				// redisClient.SREM(writeKey, user_id.toString());

				Account.updatePermission(account_id, user_id, 'remove', writeKey, function(status){
					if (status) cb();
					else cb("Can't save read permission to mongo");
				});
			}
		}
	], function(error){
		let callbackFunction = function (err, result) {
			callback(!err, result);
		};

		if (!error) {
			if (canRead && canWrite) {
				Account.addUserToAccount(user_id, account_id, callbackFunction);
			} else if (!canRead && !canWrite) {
				Account.removeUserToAccount(user_id, account_id, callbackFunction);
			} else callback(true);
		} else {
			callback(false);
		}
	});
};

let genPermissionKey = function(account_id, permission){
	return 'a:' + account_id + ':' + permission;
};

let generateShareToken = function(user_id, account_id, canRead, canWrite, callback){
	if(!user_id || !account_id) return callback(false);
	let token = Utils.uid(32);
	let key = 'sa:' + token;
	let value = JSON.stringify({u: user_id, a:account_id, r:canRead, w:canWrite});
	let oneMonth = 2592000;

	redisClient.SETEX(key, oneMonth, value, function(err, reply){
		callback(!err && reply, token);
	});
};

let checkShareToken = function(token, callback){
	if(!token) return callback(false);

	let key = 'sa:' + token;
	let handler = function(err, reply){
		if(err || !reply) return callback(false);

		let data = JSON.parse(reply);
		setAccountPermission(data.u, data.a, data.r, data.w, function(status){
			if(status) callback(true, data.u, data.a);
			else callback(false);
		});
		redisClient.DEL(key);
	};

	redisClient.GET(key, handler);
};

let deleteKeyByAccountId = function(account_id, callback){
	redisClient.DEL(genPermissionKey(account_id, 'r'));
	redisClient.DEL(genPermissionKey(account_id, 'w'));

	callback(true);
};

let defaultPermission = function(wallet_id, callback) {
	let AccountModel = mongoose.model('Account');
	
	AccountModel.findById(wallet_id, 'owner listUser', function(err, wallet){
		if (err) {
			return callback(err);
		}
		
		if (!wallet || !wallet.owner || !wallet.listUser) {
			return callback('WalletError');
		}
		
		async.eachSeries(wallet.listUser, function(sharedUser, cb){
			if (sharedUser.toString() == wallet.owner.toString()) {
				return cb();
			}
			
			setAccountPermission(sharedUser, wallet_id, false, false, function(status){
				cb(!status);
			});
		}, callback);
	});
};

exports.checkWritePermission = checkWritePermission;
exports.checkReadPermission = checkReadPermission;
exports.setAccountPermission = setAccountPermission;
exports.generateShareToken = generateShareToken;
exports.checkShareToken = checkShareToken;
exports.deleteKeyByAccountId = deleteKeyByAccountId;
exports.defaultPermission = defaultPermission;
