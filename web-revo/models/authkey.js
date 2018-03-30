/**
 * Module dependencies.
 */
var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var ObjectId 	= Schema.ObjectId;
var restify 	= require('restify');

/*
 * Client Key Schema
 */
var TokenSchema = new Schema({
	id: 		ObjectId,
	user_id: 	{ type: String, trim: true, require: true },
	token: 		{ type: String, trim: true, require: true }
});

/**
 * Validations
 */
var validatePresenceOf = function (value) 
{
	return value && value.length
};

/**
 * Pre-save hook
 */
TokenSchema.pre('save', function(next) 
{
	if (!validatePresenceOf(this.user_id)) {
		next(new restify.MissingParameterError('user_id cannot be blank'));
	}
	if (!validatePresenceOf(this.token)) {
		next(new restify.MissingParameterError('Token cannot be blank'));
	}
	next();
});

/**
 * Methods
 */

TokenSchema.methods = {

};

mongoose.model('AuthToken', TokenSchema);