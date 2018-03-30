/*
	Active model
*/

var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.Types.ObjectId;

var ActiveSchema = new Schema({
	code: {type: String, default: '', trim: true, index: true},
	status: {type: Boolean, default: false, index: true},
	mlEvent: { type: ObjectId, ref: 'Events'},
	device: {type: String, trim: true, index: true},
	createAt: {type: Date, default: Date.now, index: true},
	activeAt: {type: Date, default: Date.now, index: true}
});

ActiveSchema.pre('save', function(next){
	this.activeAt = new Date();
	if(this.code) this.code = this.code.toLowerCase().replace(/ /g, '');
	next();
});

ActiveSchema.statics.createNewCode = function(code, events, callback){
	var that = this;
	var active = new that({
		code: code,
		mlEvent: events
	});
	active.save(function(err){
		if(err) callback(false);
		else callback(active);
	});
};

ActiveSchema.statics.addCode = function(code, status, events, device, callback){
	var active = new this({
		code: code,
		status: status,
		mlEvent: events,
		device: device
	});

	active.save(function(err){
		if(err) callback(false);
		else callback(active);
	});
};

ActiveSchema.statics.updateDevice = function(code, device, callback){
	this.update({code: code}, {$set: {device: device, status: true, activeAt: new Date()}}, callback);
};

ActiveSchema.statics.checkActive = function(user, callback){
	this.findOne({userActive: user}, function(err, active){
		if(err || !active) callback(false);
		else callback(true);
	});
};

ActiveSchema.statics.validateActive = function(activeId, callback){
	this.findOneById(activeId, function(err, active){
		if(err || !active) callback(false);
		else {
			if(active.status && !active.userActive) callback(true);
			else callback(false);
		}
	});
};

ActiveSchema.statics.findActive = function(code, callback){
	this.findOne({code: code, status: false}, function(err, active){
		if(err || !active) callback(false);
		else callback(active);
	});
};

ActiveSchema.statics.changeStatus = function(code, status){
	this.update({code: code}, {$set: {status: status, activeAt: new Date()}}, {multi: false}, function(err, numUp){
		// if(err || !numUp) callback(false);
		// else callback(true);
	});
};

mongoose.model('Active', ActiveSchema);