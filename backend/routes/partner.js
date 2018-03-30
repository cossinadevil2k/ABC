'use strict';

let mongoose = require('mongoose');
let PartnerDB = require('../../model/helper/mongodb_connect_partner');

let Partner = PartnerDB.model('Partner');
let PromotionCategory = PartnerDB.model('CategoryPromotion');
let Provider = mongoose.model('Provider');

let EmailHook = require('../../model/email');
let utils = require('../../helper/utils');
let async = require('async');

let getPartnerList = function(req, res){
    let skip = req.body.skip,
        limit = req.body.limit;

    Partner.getList(skip, limit, function(err, result){
        res.json({s: !err, d: result});
    });
};

let addPartner = function(req, res){
    let postData = req.body;

    if (!postData) {
        return res.send({s:false});
    }

    let defaultPassword = utils.uid(6);

    function checkProvider(cb){
        if (!postData.provider) {
            return cb('ProviderNotFound');
        }

        Provider.findOne({realId: postData.provider}, function(err, provider){
            if (err) {
                return cb(err);
            }

            if (!provider) {
                return cb('ProviderNotFound');
            }

            postData.provider = provider._id;
            postData.name = provider.name;
            postData.country = provider.country_code;

            cb();
        });
    }

    function initPartner(cb){
        postData.password = defaultPassword;

        Partner.addNew(postData, function(err){
            if (err) {
                return cb(err);
            }

            cb();
        });
    }

    function addDefaultCategory(cb) {
        Partner.countByProviderId(postData.provider, (err, count) => {
            if (err) return cb(err);

            if (count > 1) return cb();

            let cates = [
                {
                    name: 'Message',
                    provider: postData.provider
                },
                {
                    name: 'Promotion',
                    provider: postData.provider
                }
            ];

            async.each(cates, function (category, callback) {
                PromotionCategory.addCategory(category, callback);
            }, cb);
        });
    }

    async.waterfall([
        checkProvider,
        initPartner,
        addDefaultCategory
    ], function (error) {
        if (error) {
            res.send({s: false});
        } else {
            EmailHook.sendPartnerDefaultPassword({email: postData.email, password: defaultPassword}, function(status, message){});
            // console.log(`DPP: ${defaultPassword}`);
            res.send({s: true});
        }
    });
};

let updatePartner = function(req, res){
    let postData = req.body;

    if (postData) {
        Partner.editPartner(postData, function(err, result){
            if (err || !result) res.json({s: false});
            else res.json({s: true});
        });
    } else {
        res.send({s:false});
    }
};

let removePartner = function(req, res){
    let pId = req.body.partnerId;
    if (pId) {
        Partner.findByIdAndRemove(pId, function(err, result){
            if(err || !result){
                res.send({s:false, msg:"delete_partner_error"});
            } else {
                res.send({s:true});
            }
        });
    } else {
        res.send({s:false, msg:"partnerId_not_found"});
    }
};

let appClear = function(req, res){
    let passphase = req.query.passphase;

    if (!passphase || passphase != '12369874') {
        res.json({s: false});
    }

    Partner.remove({}, err => {
        res.json({s: !err});
    });
};

module.exports = function(app, config){
    app.get('/partners', staticsMain);
    app.get('/partners/clear', appClear);
    app.post('/partners/get', getPartnerList);
    app.post('/partners/add', addPartner);
    app.post('/partners/update', updatePartner);
    app.post('/partners/remove', removePartner);
};