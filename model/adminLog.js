/*
	Admin logs
*/

var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.Types.ObjectId;
var Mixed		= Schema.Types.Mixed;
var async		= require('async');

var adminLogSchema = new Schema({
	owner: {type: ObjectId, ref: 'Administrator', require: true},
	ip: {type: String, trim: true},
	action: {type: String, trim: true},
	other: {type: Mixed},
	createdAt: {type: Date, default: Date.now}
});


adminLogSchema.statics = {
	addNew: function(owner, ip, action, other){
		var log = new this();
		log.owner = owner;
		log.ip = ip;
		log.action = action;
		if(other) {
			log.other = other;
			log.markModified('other');
		}
		log.save(function(err){

		});
	}
};

mongoose.model('AdminLog', adminLogSchema);
