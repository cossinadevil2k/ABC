/*
	Mail data
*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var async = require('async');

var MailSchema = new Schema({
	subject: {type: String, require: true, trim: true},
	name: {type: String, require: true, trim: true},
	content: {type: String, require: true, trim: true},
	from_email: {type: String, require: true, trim: true},
	from_name: {type: String, require: true, trim: true},
	createDate: {type: Date, default: Date.now, index: true},
	owner: {type: ObjectId, ref: 'Administrator'},
    slug: {type: String, require: true, trim: true, index:true},
	lastUpdate: {type: Date, default: Date.now},
	metadata: {type: Schema.Types.Mixed}
});

MailSchema.pre('save', function(next){
	this.lastUpdate = new Date();
	next();
});


MailSchema.statics = {
	newMail: function(obj, cb){
		var mail = new this(obj);
		mail.save(cb);
	},
	editMail: function(obj, cb){
		this.findById(obj._id, function(err, mail){
			if(mail) {
				mail.subject = obj.subject;
				mail.name = obj.name;
				mail.from_name = obj.from_name;
				mail.from_email = obj.from_email;
				mail.content = obj.content;
				mail.slug = obj.slug;
				mail.save(cb);
			} else cb(true, null);
		});
	},
	updateMetadata: function(id, objContent){
		this.findById(id, function(err, mail){
			if (err) throw err;
			else {
				if (mail) mail.metadata = objContent;
				mail.save(function(e,r){

				});
			}
		});
	}
};

mongoose.model('Email', MailSchema);