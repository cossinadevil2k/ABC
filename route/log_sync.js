//var mongoose = require('mongoose');
//var Log = mongoose.model('LogSync');
var Error = require('../config/error');

function checkServerMaintainLoginRequired(req, res, next){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
    next();
}

var create = function(req, res){
    //var user_id = req.user_id,
    //    token = req.body.tk,
    //    content = req.body.ct,
    //    flag = req.body.fl,
    //    itemType = req.body.it,
    //    error = req.body.er || null,
    //    exception = req.body.ec || null,
    //    platform = req.body.pl;
    //
    //if (!user_id) return res.send({s: false, e: Error.USER_NOT_LOGIN});
    //if (!token || !content) return res.send({s: false, e: Error.PARAM_INVALID});
    //
    //var data = {
    //    user: user_id,
    //    token: token,
    //    content: content,
    //    flag: flag,
    //    itemType: itemType,
    //    error: error,
    //    exception: exception,
    //    platform: platform
    //};
    //
    //Log.createLog(data, function(err, result){
    //    if (err) res.send({s: false, e: Error.ERROR_SERVER});
    //    else res.send({s: true});
    //});
    res.json({s: true});
};


module.exports = function(app, config){
    app.use(checkServerMaintainLoginRequired);
    app.post('/log/push', create);
};