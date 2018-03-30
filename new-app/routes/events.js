/*
	Events
*/

var mongoose = require('mongoose');
var Event = mongoose.model('Events');
var utils = require('../../helper/utils');

var redirectToDownload = function(req, res){
	var eventId = req.params.eventId;
	var eventSlug = req.params.eventSlug;

	Event.findEvent({_id: eventId}, function(events){
		if(events){
			if(events.link) res.redirect(301, events.link);
			else res.redirect(301, 'http://moneylover.me');
		} else res.redirect(301, 'http://moneylover.me');
	});
};

module.exports = function(app, config){
	app.get('/events/:eventSlug.:eventId', redirectToDownload);
};