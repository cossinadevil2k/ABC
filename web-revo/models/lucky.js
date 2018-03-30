/*
* Quay quà may mắn
*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var luckySchema = new Schema({
	productId: {type: String, trim: true, unique: true, required: true, index: true},
	name: {type: String, trim: true, required: true},
	remain: {type: Number, default: 0},
	createDate: {type: Date, default: Date.now},
	hasExpireDate: {type: Boolean, default: false, index: true},
	startDate: {type: Date, index: true},
	expireDate: {type: Date, index: true},
	drop: {type: Number, required: true}, // 10000 means 100%, 69 means 0,69%
	isGlobal: {type: Boolean, default: false, index: true},
	language: {type: String, trim: true, index: true},
	country: {type: String, trim: true, index: true}
});

luckySchema.statics = {
	addNew: function(item, callback){
		var newItem = new this({
			productId: item.productId,
			name: item.name,
			remain: item.remain,
			drop: item.drop,
			hasExpireDate: item.hasExpireDate,
			isGlobal: item.isGlobal,
			startDate: item.startDate || null,
			expireDate: item.expireDate || null,
			language: item.language || null,
			country: item.country || null
		});
		
		newItem.save(callback);
		
	}
};

mongoose.model('Lucky', luckySchema);
