/*
*
* Campaign Webapp Route by Tuan-Cuong Pham
*
* */


var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');
var Account = mongoose.model('Account');

var appGet = function(req, res){
    var accInfo = req.body.accInfo;


    Account.findById(accId, function(err,data){
        if(!err){
            if(data){
                Campaign.getCampaignListByAccountId(accInfo._id, 6, function(result){
                    res.send({error:0, msg:"get_event_success" ,data: result});
                });
            } else {
                res.send({error:1, msg:"get_event_error"});
            }
        }
    });
};

module.exports = function(app, config){
    app.post('/api/campaign/get', function(req,res){res.redirect('https://web.moneylover.me')});
};