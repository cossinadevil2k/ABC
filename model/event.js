/*
	Event
*/

'use strict';

let mongoose	= require('mongoose');
let Schema		= mongoose.Schema;
let utils		= require('./helper/utils');
let moment		= require('moment');
let async		= require('async');

let EventSchema = new Schema({
	name: {type: String, trim: true, require: true, index: true},
	slug: {type: String, trim: true},
	code: {type: String, default: null, index: true, lowercase: true},
	typeEvent: {type: Number, default: 0, index: true},
	link_icon: {type: String, trim: true, require: true, index: true},
	description: {type: String, trim: true},
	eventAt: {type: Date, require: true, index: true},
	endEventAt: {type: Date, require: true, index: true},
	createAt: {type: Date, default: Date.now, trim: true},
	updateAt: {type: Date, default: Date.now},
	link: {type: String, trim: true, index: true},
	twitter: {type: String, trim: true},
	addLang: {type: Schema.Types.Mixed },
	codeRemain: {type: Number},
	isUnlimited: {type: Boolean, index: true},
	product: {type: String}
});

EventSchema.pre('save', function(next){
	this.updateAt = new Date();
	if (this.isModified('name')){
		this.slug = utils.textToSlug(this.name);
	}
	next();
});

let validEvent = function(startTime, endTime){
	let currentTime = moment().format('X');
	let eventTime = moment(startTime).format('X');
	let endEventTime = moment(endTime).format('X');

	if(eventTime <= currentTime && currentTime < endEventTime) return 1; // ok
	else if(eventTime > currentTime) return 2; // USER_ERROR_EVENT_EXPIRE
	else if(currentTime > endEventTime) return 3; // USER_ERROR_EVENT_EXPIRE
	else return 4; // USER_ERROR_EVENT_EXPIRE
};

EventSchema.methods.validateDateEvent = function(){
	if (this.isUnlimited || this.codeRemain == null || this.codeRemain > 0) {
		return validEvent(this.eventAt, this.endEventAt);
	} else {
		return 5;
	}
};

EventSchema.statics.addEvent = function(eventInfo, callback){
	let newEvent = new this({
		name: eventInfo.name,
		typeEvent: eventInfo.typeEvent || eventInfo.selectedProductType,
		link_icon: eventInfo.link_icon,
		description: eventInfo.description,
		eventAt: eventInfo.eventAt,
		endEventAt: eventInfo.endEventAt,
		link: eventInfo.link,
		twitter: eventInfo.twitter,
		isUnlimited: eventInfo.isUnlimited || false,
		product: eventInfo.product
	});
	if (eventInfo.code) newEvent.code = eventInfo.code;
	if (eventInfo.codeRemain) newEvent.codeRemain = eventInfo.codeRemain;
	newEvent.save(function(err){
		if(err) callback(false);
		else callback(newEvent);
	});
};

EventSchema.statics.editEvent = function(eventInfo, callback){
	this.findByIdAndUpdate(eventInfo._id, {$set: {
		name: eventInfo.name,
		code: eventInfo.code,
		typeEvent: eventInfo.typeEvent || eventInfo.selectedProductType,
		link_icon: eventInfo.link_icon,
		description: eventInfo.description,
		eventAt: eventInfo.eventAt,
		endEventAt: eventInfo.endEventAt,
		link: eventInfo.link,
		twitter: eventInfo.twitter || null,
		isUnlimited: eventInfo.isUnlimited || false,
		codeRemain: (eventInfo.isUnlimited)? null: eventInfo.codeRemain
	}}, function(err, event){
		if(err) {
			callback(false);
		}
		else callback(event);
	});
};

EventSchema.statics.deteleEvent = function(id, callback){
	this.remove({_id: id}, function(err){
		callback(!err);
	});
};

EventSchema.statics.findEvent = function(query, callback){
	this.findOne(query, function(err, events){
		if(err || !events) callback(false);
		else callback(events);
	});
};

EventSchema.statics.findEvents = function(query, callback){
	this.find(query, function(err, events){
		if(err) callback(false);
		else callback(events);
	});
};

EventSchema.statics.updateLanguage = function(eventId, language, callback){
	this.findById(eventId, function(err, event){
		if(event){
			event.addLang = language;
			event.markModified('addLang');
			event.save(function(err){
				callback(!!err);
			});
		} else callback(true);
	});
};

EventSchema.statics.valid = function(eventCode, callback, is_find_by_id){
	let self = this;
	let activeCode = mongoose.model('Active');

	async.parallel({
		event: function(callback){
			if (is_find_by_id){
				self.findOne({_id: eventCode }, function(err, event){
					if(err || !event) callback(null, false);
					else callback(null, event);
				});
			} else {
				self.findOne({code: new RegExp('^' + eventCode + '$', 'i')}, function(err, event){
					if(err || !event) callback(null, false);
					else callback(null, event);
				});
			}
		},
		active: function(callback){
			activeCode.findOne({code: new RegExp('^' + eventCode + '$', 'i'), status: false})
					.populate('mlEvent')
					.exec(function(err, active){
						if(err || !active) callback(null, false);
						else callback(null, active.mlEvent);
					});
		}
	}, function(err, events) {
		let event = events.event || events.active; // events.event ? events.event : events.active;

		if (err || !event) return callback(false, null);

		if (event.codeRemain || event.isUnlimited) {
			return callback(true, validEvent(event.eventAt, event.endEventAt), event);
		}

		callback(true, 5);
	});
};

EventSchema.methods.useCode = function(){
	this.codeRemain = this.codeRemain - 1;
	this.save();
};

mongoose.model('Events', EventSchema);
