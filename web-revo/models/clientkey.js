/**
 * Module dependencies.
 */
var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.ObjectId;
var restify		= require('restify');
var utils		= require('../helper/utils');

/*
 * Client Key Schema
 */
var ClientSchema = new Schema({
	clientName	: { type: String, trim: true },
	client		: { type: String, trim: true, index: true },
	secret		: { type: String, trim: true, index: true },
	isDisabled	: { type: Boolean, default: false},
	platform	: { type: String}
});

/**
 * Validations
 */
var validatePresenceOf = function (value){
	return value && value.length;
};

/**
 * Pre-save hook
 */
ClientSchema.pre('save', function(next) {
	if (!validatePresenceOf(this.client)) {
		next(new restify.MissingParameterError('Client cannot be blank'));
	}
	if (!validatePresenceOf(this.secret)) {
		next(new restify.MissingParameterError('Secret cannot be blank'));
	}
	next();
});

/**
 * Methods
 */

ClientSchema.statics = {
	addClient: function(info, callback){
		var ClientKey = new this({
			clientName	: info.name,
			platform	: info.platform,
			client		: utils.uid(12),
			secret		: utils.uid(30)
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
	enableClientByClient: function(){
		this.findOneAndUpdate({client: client}, {isDisabled: false}, callback);
	},
	regenerateSecret: function(id, callback){
		this.findByIdAndUpdate(id, {secret: utils.uid(30)}, callback);
	}
};


mongoose.model('ClientKey', ClientSchema);