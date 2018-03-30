'use strict';

var PartnerDB = require('../../model/helper/mongodb_connect_partner');
var PartnerNotification = PartnerDB.model('PartnerNotification');
var async = require('async');

var appMarkAllRead = function(req, res){
    let partnerId = req.session.partnerId;

    PartnerNotification.markAllRead(partnerId, function(err){
        let response = {s: !err};

        res.json(response);
    });
};

var appDeleteAll = function(req, res){
    let partnerId = req.session.partnerId;

    PartnerNotification.deleteAllNotification(partnerId, function (err) {
        let response = {s: !err};

        res.json(response);
    })
};

var appDeleteOne = function(req, res){
    let notificationId = req.body.nId;

    PartnerNotification.deleteNotification(notificationId, function(err){
        let response = {s: !err};

        res.json(response);
    });
};

var appGet = function(req, res){
    let skip = req.body.skip;
    let limit = req.body.limit;
    let partnerId = req.session.partnerId;

    async.parallel({
        notification: function(callback){
            PartnerNotification.getAll(partnerId, skip, limit, function(err, data){
                if(err) callback(err);
                else callback(null, data);
            });
        },
        news: function(callback){
            PartnerNotification.countNew(partnerId, function(err, data){
                if(err) callback(err);
                else callback(null, data);
            });
        }
    }, function(err, results){
        if(err) res.json({s: false});
        else res.json({s: true, d: results});
    });
};

module.exports = function (app, config) {
    app.post('/partner_notification/mark-all-as-read', appMarkAllRead);
    app.post('/partner_notification/delete-all', appDeleteAll);
    app.post('/partner_notification/delete-one', appDeleteOne);
    app.post('/partner_notification/get', appGet);
};