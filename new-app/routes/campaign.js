'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');
var Account = mongoose.model('Account');
var RequestActions = require('./actions');

var appGet = function(req, res){
    var accId = req.body.accId;

    Account.findById(accId, function(err,data){
        if (data){
            Campaign.getCampaignListByAccountId(accId, 6, function(result){
                res.send({
                    error:0,
                    msg:"get_event_success",
                    data: result,
                    action: RequestActions.event_list
                });
            });
        } else {
            res.send({
                error:1,
                msg:"get_event_error",
                action: RequestActions.event_list
            });
        }
    });
};

module.exports = function(app){
    app.post('/api/campaign/get', appGet);
};