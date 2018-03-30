/*
	Mail data
*/

'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let async = require('async');

let MailSchema = new Schema({
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
		let mail = new this(obj);
		mail.save(cb);
	},
	editMail: function(obj, cb){
		let id = obj._id;

		delete obj._id;

		this.findByIdAndUpdate(id, obj, cb);
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