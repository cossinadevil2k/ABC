/*
	Event
*/

var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.Types.ObjectId;
var utils		= require('../helper/utils');
var moment		= require('moment');
var async		= require('async');

var EventSchema = new Schema({
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
	isUnlimited: {type: Boolean, index: true}
});

EventSchema.pre('save', function(next){
	this.updateAt = new Date();
	if (this.isModified('name')){
		this.slug = utils.textToSlug(this.name);
	}
	next();
});

var validEvent = function(startTime, endTime){
	var currentTime = moment().format('X');
	var eventTime = moment(startTime).format('X');
	var endEventTime = moment(endTime).format('X');

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
	var newEvent = new this({
		name: eventInfo.name,
		typeEvent: eventInfo.typeEvent,
		link_icon: eventInfo.link_icon,
		description: eventInfo.description,
		eventAt: eventInfo.eventAt,
		endEventAt: eventInfo.endEventAt,
		link: eventInfo.link,
		twitter: eventInfo.twitter,
		isUnlimited: eventInfo.isUnlimited || false
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
		typeEvent: eventInfo.typeEvent,
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

EventSchema.statics.valid = function(eventCode, callback, status){
	var self = this;
	var activeCode = mongoose.model('Active');

	async.parallel({
		event: function(callback){
			if(status){
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
		var event = events.event || events.active; // events.event ? events.event : events.active;

		if(err || !event) callback(false, null);
		else callback(true, validEvent(event.eventAt, event.endEventAt), event);
	});
};

mongoose.model('Events', EventSchema);
