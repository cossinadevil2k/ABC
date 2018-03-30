'use strict';

var env			= process.env.NODE_ENV;
var mongoose    = require("mongoose");
var PartnerDB 	= require('../../model/helper/mongodb_connect_partner');
var Promotion   = PartnerDB.model('Promotion');

let listPromote = function(req, res){
	let data = req.body.options;
	let options = {};

	options.skip =  data.skip;
	options.limit = data.limit;
	options.providerId = 'saltedge_2344';
	// options.providerId = data.partnerProviderId;

    Promotion.getPublicPromotion(options, function (err, result) {
        res.send({s: !err, d: result});
    });
};

module.exports = function(app, config){
    app.post('/promotion/list', listPromote);
};
