/*
	Redeem
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var RedeemSchema = new Schema({
	event: {type: ObjectId, ref: 'Events', index: true},
	userName: {type: String, trim: true},
	userEmail: {type: String, trim: true, index: true},
	ipAddress: {type: String, trim: true},
	status: {type: Boolean, default: false},
	createAt: {type: Date, default: Date.now},
	metadata: {type: Schema.Types.Mixed}
});

RedeemSchema.methods = {
	activeRedeem: function(cb){
		this.status = true;
		this.save(function(err, data){
			if(err) cb(false);
			else cb(true);
		});
	}
};

RedeemSchema.statics = {
	saveRedeem: function(obj, cb){
		var redeem = new this(obj);
		redeem.save(function(err){
		});
	},
	checkExist: function(event, email, cb){
		this.findOne({event: event, userEmail: new RegExp('^' + email + '$', 'i')}, function(err, data){
			cb(!!data);
		});
	},
	findEmail: function(email, callback){
		this.findOne({userEmail: new RegExp('^' + email + '$', 'i'), status: false}, function(err, data){
			if(err || !data) callback(false, null);
			else callback(true, data);
		});
	}
};

mongoose.model('Redeem', RedeemSchema);