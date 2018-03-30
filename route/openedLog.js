/**
 * Created by cuongpham on 12/2/14.
 */

var mongoose = require('mongoose');
var OpenedLog = mongoose.model('OpenedLog');
var Device = mongoose.model('Device');

function checkServerMaintainLoginRequired(res){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
}

function checkServerMaintain(res){
    if (global.isServerMaintain){
        return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
    }
}

var appSave = function(req, res){
    checkServerMaintainLoginRequired(res);

    var postData = req.body;

    //var ip = req.headers['x-real-ip'];
    //var userId = postData.userId || null;
    //var versionCode = postData.versionCode || null;
    //var deviceId = postData.deviceId;
    //
    //if(deviceId){
    //    Device.findOne({deviceId: deviceId}, function(err, result){
    //        if(!err){
    //            if(result){
    //                OpenedLog.addNew(result._id, userId, versionCode, ip, function(err, result){
    //                    if(!err || result){
    //                        res.send({s:true, error: 0});
    //                    } else {
    //                        res.send({s:false, error: 2});
    //                    }
    //                });
    //            } else {
    //                res.send({s:false, error: 1});
    //            }
    //        } else {
    //            res.send({s:false, error: 2});
    //        }
    //    });
    //
    //} else {
    //    res.send({s:false, error: 1});
    //}
    res.send({s:true});
};

module.exports = function(app, config){
    app.post('/openedlog/save', appSave);
};
