'use strict';

var mongoose    = require("mongoose");
var PartnerDB 	= require('../../model/helper/mongodb_connect_partner');
var Promotion   = PartnerDB.model('Promotion');
var Category    = PartnerDB.model('CategoryPromotion');

// PROMOTION
let listPromote = function(req, res){
	let data = req.body.options;
	let skip = data.skip || 0;
	let limit = data.limit || 0;
	let providerId = req.session.partnerProviderId;

    Promotion.getAll(providerId, skip, limit, function (err, result) {
        res.send({s: !err, d: result});
    });
};

let addPromote = function(req, res){
    let postData = req.body.info;

    if (!postData.content || !postData.title) {
		return res.send({s: false});
	}

	let info = {};

	info.provider = req.session.partnerProviderId;
	info.title = postData.title.trim();
	info.content = postData.content.trim();
	info.category = postData.category._id;
	info.status = postData.status.trim();
	info.owner = req.session.partnerId;
	info.shortDescription = postData.shortDescription.trim();
	info.expiredDate = postData.expiredDate;

	Promotion.addPromotion(info, function(err, result){
		let status = !(err || !result);
		res.send({s: status});
	});
};

let editPromote = function(req, res){
	let id = req.body.id;
    let postData = req.body.info;

	if (!postData.content || !postData.title) {
		return res.send({s: false});
	}

    let updates = {};

	updates.provider = req.session.partnerProviderId;
	updates.title = postData.title.trim();
	updates.content = postData.content.trim();
	updates.category = postData.category._id;
	updates.status = postData.status.trim();
	updates.owner = req.session.partnerId;
	updates.shortDescription = postData.shortDescription.trim();
	updates.updateAt = Date.now();
	updates.expiredDate = postData.expiredDate;

    Promotion.editPromote(id, updates, function(err, result){
        let status = !(err || !result);
        res.send({s: status, m: 'Edit Fails'});
    });
};

let changeStatusPromote = function(req, res){
	let id = req.body.id;
	let postData = req.body.info;
    let updates = {};

	if (postData === 'Public') {
		updates.status = 'Draft';
	} else if (postData === 'Draft') {
		updates.status = 'Public'
	}

    Promotion.editPromote(id, updates, function(err, result){
        let status = !(err || !result);
        res.send({s: status, m: 'Edit Fails'});
    });
};

let delPromote = function(req, res){
    let promotion = req.body.promote;
    Promotion.deleteByPromotionId(promotion._id, function(status){
        if(status){
            res.send({error: false, msg:"Deleted"});
        } else {
            res.send({error: true, msg:"Deleting due to error"});
        }
    });
};

// CATEGORY
let listCategory = function(req, res){
	let skip = req.body.skip;
	let limit = req.body.limit;

	let options = {};
	options.providerId = req.session.partnerProviderId;
	options.skip = skip;
	options.limit = limit;

    Category.getAll(options, function (err, result) {
        res.send({s: !err, d: result});
    });
};

let addCategory = function(req, res){

    let postData = req.body.info;

    if (!postData.category) {
		return res.send({s: false});
	}

	let info = {};

	info.provider = req.session.partnerProviderId;
	info.name = postData.category.trim();

	Category.addCategory(info, function(err, result){
		let status = !(err || !result);
		res.send({s: status, d: result});
	});
};

let editCategory = function(req, res){
	let id = req.body.id;
    let postData = req.body.info;

	if (!postData.category) {
		return res.send({s: false});
	}

    let updates = {};

	updates.provider = req.session.partnerProviderId;
	updates.category = postData.category.trim();

    Category.editCategory(id, updates, function(err, result){
        let status = !(err || !result);
        res.send({s: status, m: 'Edit Fails'});
    });
};

let delCategory = function(req, res){
    let category = req.body.category;
	let providerId = req.session.partnerProviderId;

	Promotion.deleteByCategoryId(category._id, providerId, function(status){});

    Category.deleteCategory(category._id, function(status){
        if(status){
            res.send({error: false, msg:"Deleted"});
        } else {
            res.send({error: true, msg:"Deleting due to error"});
        }
    });
};

module.exports = function(app, config){
    app.get('/promotion', staticsMain);

    app.post('/promotion/list', listPromote);
    app.post('/promotion/add', addPromote);
	app.post('/promotion/edit', editPromote);
	app.post('/promotion/delete', delPromote);
	app.post('/promotion/changeStatus', changeStatusPromote);

    app.post('/promotion/listCategory', listCategory);
    app.post('/promotion/addCategory', addCategory);
	app.post('/promotion/editCategory', editCategory);
	app.post('/promotion/deleteCategory', delCategory);
};
