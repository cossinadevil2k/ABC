/**
 * PDF Report Wallet, Campaign, Budget, etc
 */

var mongoose = require('mongoose');
var UserModel = mongoose.model('User');
var Error = require('../config/error');
var Mailer = require('../model/email');

function checkServerMaintainLoginRequired(req, res, next){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
    next();
}

var appRequest = function(req, res){
    var userId = req.user_id,
        eventId = req.body.eid;

    if(!userId) return res.json({s: false, e: Error.USER_NOT_LOGIN});
    UserModel.requestExport(userId, eventId, function(err, result){
        if (err || !result) return res.json({s: false});
        //send email có link chứa userid, eventid, hash
        var url = "https://web.moneylover.me/export?uid=" + userId + "&&eid=" + result.exportReport.eventId + "&&confirm=" + result.exportReport.hash;
        Mailer.sendLinkReportPDF(result, url, function(status){
            res.json({s: status});
        });
    });
};

module.exports = function(app, config){
    app.use(checkServerMaintainLoginRequired);
    app.post('/report/request', appRequest);
};