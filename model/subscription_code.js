var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var async = require('async');

var subscriptionCodeSchema = new Schema({
	code: {type: String, trim: true, required: true, index: true},
	timeUnit: {type: String, trim: true, enum:["days", "weeks", "months", "years"], required: true},
	timeValue: {type: Number, required: true},
	product: {type: String, trim: true, required: true, index: true},
	expire: {type: Date, index: true},
	usedBy: {type: String, trim: true, ref:'User', index: true}
});

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genOneCode(len){
	var buf = [],
		chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
		charlen = chars.length;

	for (var i = 0; i < len; ++i) {
		buf.push(chars[getRandomInt(0, charlen - 1)]);
	}

	return buf.join('');
}

function generateCode(amount, code_length){
	var list = [];
	for (var i = 0; i < amount; i ++){
		list.push(genOneCode(code_length));
	}

	return list;
}

function convertProductToTime(product_id){
	//productId example: sub1_100_notrial
	var info = product_id.split('_');
	var withTrial = (info[2] !== 'notrial');
	var timeValue = 0;
	try {
		timeValue = parseInt(info[0].slice(3));
	} catch(e){
		return false;
	}
	return {unit: 'months', time: timeValue, withTrial: withTrial};
}

subscriptionCodeSchema.statics = {
	addCode: function(amount, productId, expire, callback){
		var that = this;
		var expireDate = (expire)? moment(expire).toISOString() : null;
		var listCode = generateCode(amount, 9);
		var productInfo = convertProductToTime(productId);

		if (!productInfo) return callback(true);

		async.each(listCode, function(code, cb){
			var scrbCode = new that({
				code: code,
				timeUnit: productInfo.unit,
				timeValue: productInfo.time,
				product: productId
			});

			if(expireDate) scrbCode.expire = expireDate;
			scrbCode.save(function(err){
				if(err) cb(err);
				else cb();
			});
		}, function(err){
			if (err) callback(err);
			else callback(null, listCode);
		});
	},

	checkAvailableCode: function(code, callback){
		var today = moment().startOf('day').format();

		var query = {
			code: code,
			usedBy: {$exists: false},
			$or: [
				{expire: {$exists: false}},
				{expire: {$exists: true, $gte: today}}
			]
		};

		this.findOne(query, callback);
	},

	findByCode: function(){

	},

	findByProduct: function(productId, skip, limit, option, callback){
		var query = (productId) ? {product: productId} : {};
		if (option && option.filter) {
			if (option.filter.used){
				if (option.filter.used === 'Used') query.usedBy = {$exists: true};
				else if (option.filter.used === 'New') query.usedBy = {$exists: false};
			}
			if (option.filter.expire){
				var thisTime = moment().format();
				if (option.filter.expire === 'Non Expire') query.expire = {$exists: false};
				else if (option.filter.expire === 'Has Expire') query.expire = {$exists: true, $gt: thisTime};
				else if (option.filter.expore === 'Expired') query.expire = {$exists: true, $lte: thisTime};
			}
		}
		this.find(query)
			.skip(skip)
			.limit(limit)
			.lean()
			.exec(callback);
	},

	findByExpireDate: function(){

	},

	getInfo: function(productId, callback){
		var that = this;
		var queryTotal = {};
		var queryUsed = {usedBy: {$exists: true}};

		if(productId) {
			queryTotal.product = productId;
			queryUsed.product = productId;
		}

		async.parallel({
			total: function(cb){
				that.count(queryTotal, function(err, amount){
					cb(null, amount);
				});
			},
			used: function(cb){
				that.count(queryUsed, function(err, amount){
					cb(null, amount);
				});
			}
		}, function(err, results){
			if (!err) callback(null, results);
		});
	}
};

mongoose.model('SubscriptionCode', subscriptionCodeSchema);
