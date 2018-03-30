'use strict';

let mongoose	= require('mongoose');
let OAuthDB		= require('./helper/mongodb_connect_oauth');
let Schema		= mongoose.Schema;
let utils		= require('./helper/utils');

/*
 * Client Key Schema
 */

let RULES = {
	FINSIFY: 0,
	CUSTOMER: 1,
	PARTNER : 2
};

let ClientSchema = new Schema({
	clientName: { type: String, trim: true, index: true },
	client: { type: String, trim: true, index: true },
	secret: { type: String, trim: true, index: true },
	isDisabled: { type: Boolean, default: false},
	platform: { type: String},
	rule: {type: Number, default: RULES.FINSIFY, index: true},
	rateLimit: {type: Number, default: 0}
});

/**
 * Validations
 */
let validatePresenceOf = function (value){
	return value && value.length;
};

/**
 * Pre-save hook
 */
ClientSchema.pre('save', function(next) {
	if (!validatePresenceOf(this.client)) {
		return next('Client cannot be blank');
	}
	
	if (!validatePresenceOf(this.secret)) {
		return next('Secret cannot be blank');
	}
	
	next();
});

/**
 * Methods
 */

ClientSchema.statics = {
	addClient: function(info, callback){
		let ClientKey = new this({
			clientName: info.name,
			platform: info.platform,
			rule: info.rule,
			client: utils.uid(12),
			secret: utils.uid(30)
		});
		ClientKey.save(callback);
	},
	disableClientById: function(id, callback){
		this.findByIdAndUpdate(id, {isDisabled: true}, callback);
	},
	disableClientByClient: function(client, callback){
		this.findOneAndUpdate({client: client}, {isDisabled: true}, callback);
	},
	enableClientById: function(id, callback){
		this.findByIdAndUpdate(id, {isDisabled: false}, callback);
	},
	enableClientByClient: function(client, callback){
		this.findOneAndUpdate({client: client}, {isDisabled: false}, callback);
	},
	regenerateSecret: function(id, callback){
		this.findByIdAndUpdate(id, {secret: utils.uid(30)}, callback);
	}
};


OAuthDB.model('ClientKey', ClientSchema);
