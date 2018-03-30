'use strict';

var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;

var CampaignSchema = new Schema({
	_id: {type: String, index: true},
	name: {type: String, trim: true, require: true},
	icon: {type: String, required: true},
	account: { type: String, ref: 'Account'},
	start_amount: { type: Number},
	goal_amount: {type: Number},
	type: {type: Number, required: true},
	status: {type: Boolean, default: true},
	isDelete: { type: Boolean, default: false, index: true },
	updateAt: { type: Date, default: Date.now, index: true },
	createdAt: { type: Date, default: Date.now, index: true },
	lastEditBy: { type: Schema.Types.ObjectId, ref: 'User'},
	tokenDevice: {type: String, required: true},
	owner: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true},
	end_date: {type: Date},
	isPublic: {type: Boolean, default:false},
	currency_id: {type: Number}
});

CampaignSchema.index({isDelete: 1, account: 1});
CampaignSchema.index({account: 1, tokenDevice: 1, updateAt: 1});

CampaignSchema.pre('save', function(next){
	this.updateAt = new Date();
	next();
});

var propertiesSelect = 'name icon start_amount goal_amount type status end_date';

CampaignSchema.statics.getCampaignListByAccountId = function(account_id, type, callback){
	if(!account_id) return callback([]);

	var condition = [{'isDelete': false}, {'account': account_id}];

	if(type > 0) condition.push({'type': type});

	this.find({$and: condition}).select(propertiesSelect).sort({'type': 1,'name': 1}).exec(function(err, data){
		if(err || !data) callback([]);
		else callback(data);
	});
};

CampaignSchema.statics.deleteByAccountId = function(user_id, account_id, callback){
	this.update({account: account_id, isDelete: false},
	{isDelete: true, lastEditBy: user_id},
	{multi: true}, function(err){
		if(err) console.error(err);
		callback(!err);
	});
};


mongoose.model('Campaign', CampaignSchema);
