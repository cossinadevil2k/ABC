/**
 *	Error Log
 * 	25/04/2014
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var errorSchema = new Schema({
	errorCode: {type: Number, default: 0},
	tableCode: {type: Number, default: 0},
	userId: {type: ObjectId, ref: 'User'},
	account: {type: String, ref: 'Account'},
	other: {type: String, trim: true},
	createAt: {type: Date, default: Date.now},
});

errorSchema.statics.addError = function(code, tableCode, userId, account, other){
	var log = new this({
		errorCode: code,
		tableCode: tableCode,
		userId: userId,
		account: account,
		other: other
	});
	log.save();
};

mongoose.model('errorLog', errorSchema);
