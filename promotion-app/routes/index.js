'use strict';

var mongoose    = require("mongoose");
var Provider    = mongoose.model('Provider');
var PartnerDB 	= require('../../model/helper/mongodb_connect_partner');
var Promotion   = PartnerDB.model('Promotion');
var moment 		= require('moment');



let getProviderIdByServiceId = function(serviceId) {
    return new Promise(function(resolve, reject) {
        Provider.findOne({realId: serviceId}, function(err, provider){
            if (err) {
                reject(err);
            } else if (!provider) {
                reject('ProviderNotFound');
            } else {
                resolve(provider._id);
            }
        });
    });
};

let listPromote = function(req, res){
	let options = {
        skip: 0,
        limit: 10
    };
	let serviceId = req.params.serviceId;

    getProviderIdByServiceId(serviceId)
        .then((providerId) => {
            options.providerId = providerId;

            renderSuccess();
        })
        .catch((err) => {
            res.redirect('/404');
        });

    function renderSuccess(){
        Promotion.getPublicPromotion(options, function (err, result) {
            if (result || !err) {
                res.render('index', {
                    moment: moment,
                    result: result,
                    providerCode: serviceId
                });
            } else {
                res.redirect('/404');
            }
        });
    }
};

let postDetail = function(req, res){
    let postId = req.params.postId;
    let serviceId = req.params.serviceId;
	let info = {};

    Promotion.getDetailByPostId(postId, function(err, result){
        if (result || !err) {
			info.views = result.views + 1;
			Promotion.updateViewsPromote(result._id, info, function(err, result){});

            res.render('posts', {
                moment: moment,
                result: result,
                providerCode: serviceId
            });
        } else {
            res.redirect('/404');
        }
    });
};

module.exports = function(app, config){
    // require('./promotion')(app, config);

    app.get('/404', function(req, res){
		res.render('page404')
	});
    app.get('/:serviceId/', listPromote);
    app.get('/:serviceId/:postId', postDetail);

    app.use(function(req, res, next) {
        res.status(404);
        if (req.accepts('html')) {
            res.redirect('/404');
            return;
        }
        if (req.accepts('json')) {
            res.send({ error: 'Not found' });
            return;
        }
        res.type('txt').send('Not found');
    });

};
