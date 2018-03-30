/*
	Messages
*/

var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.Types.ObjectId;
var Mixed		= Schema.Types.Mixed;
var async		= require('async');
var utils		= require('../helper/utils');

var MsgSchema = new Schema({
	title: {type: String, required: true, trim: true},
	content: {type: String, trim: true, required: true},
	owner: {type: String, ref: 'Administrator', trim: true, required: true},
	lastEditBy: {type: String, ref: 'Administrator', trim: true},
	createdAt: { type: Date, default: Date.now },
    action: {type: String},
    link: {type: String, required: false},
    device:{type: Array},
	updateAt: { type: Date, default: Date.now },
	runDate: {type: Date, default: Date.now},
	option: {type: Mixed}
});

MsgSchema.pre('save', function(next){
	this.markModified('option');
	this.updateAt = new Date();
	next();
});

MsgSchema.statics = {
	addNew: function(obj, callback){
		var msg = new this(obj);
		msg.save(function(err, msg){
            if(err){
                callback(false);
            } else
            callback(msg);
        });
	},

	editMsg: function(id, obj, callback){
		this.findByIdAndUpdate(id, obj, function(err, msg){
			if(msg){
				if(err){
					callback(false);
				} else {
					callback(msg);
				}
			} else callback({errmsg:"This record is not available in database."});
		});
	},
	deleteMsg: function(objId, callback){
		this.findByIdAndRemove(objId, function(err){
			callback(!err);
		});
	}
};


mongoose.model('Message', MsgSchema);