var mongoose = require('mongoose');
var ActivityModel = mongoose.model('Activity');
var Error = require('../config/error');

function checkServerMaintainLoginRequired(res){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
}

var deleteActivity = function(req, res){
    checkServerMaintainLoginRequired(res);

    if (!req.user_id) return res.send({s: false, e: Error.USER_NOT_LOGIN});

    var activityId = req.body.ai;

    ActivityModel.remove(activityId, function(err, result){
        if (err || !result) res.send({s: false});
        else res.send({s: true});
    });
};

var getActivity = function(req, res){
    checkServerMaintainLoginRequired(res);

    var userId = req.user_id;
    if (!userId) return res.send({s: false, e: Error.USER_NOT_LOGIN});

    ActivityModel.findByUser(userId, function(err, result){
        if (err) res.send({s: false, e: Error.ERROR_SERVER});
        else res.send({s: true, d: result});
    });
};

module.exports = function(app, config){
    app.post('/activity/pull', getActivity);
    app.post('/activity/remove', deleteActivity);
};
