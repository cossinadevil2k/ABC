/**
 * Created by cuongpham on 1/7/15.
 */
var env	= process.env.NODE_ENV;
var redisClient = require('../../config/database').redisClient;
var moment = require('moment');
var async = require('async');

var myHash = env + "-server-setting",
    settingKey = {
        isServerMaintain: 'isServerMaintain',
        endMaintainTime: 'endMaintainTime'
    };

var gcmHash = '-gcm-setting',
    gcmSettingKey = 'background-notification';

var appSaveMaintainStatus = function(req, res){
    var isServerMaintain = req.body.sm;
    var finishingTime = req.body.ft;

    if (!isServerMaintain) return res.json({s:false, e:"invalid_params"});

    async.parallel([
        function(cb){
            redisClient.HSET(myHash, settingKey.isServerMaintain, isServerMaintain, cb);
        },
        function(cb){
            var time = finishingTime || '';
            redisClient.HSET(myHash, settingKey.endMaintainTime, time, cb);
        }
    ], function(error){
        res.json({s: !error});
    });
};

var appGetSetting = function(req, res){
    redisClient.HGETALL(myHash, function(err, result){
        if(!err){
            res.send({s:true, data:result});
        } else {
            res.send({s:false});
        }
    });
};

var gcmStatus = function(req, res){
    var postData  = req.body;
    var adminId = req.session.adminId;
    redisClient.HSET(adminId + gcmHash, gcmSettingKey, postData.gcm, function(err){
        res.send({s: !err});
    });
};

var getGcmStatus = function(req, res){
    var adminId = req.session.adminId;
    redisClient.HGETALL(adminId + gcmHash, function(err, result){
        if(!err){
            if (result) res.send({s:true, data: result['background-notification']});
            else res.send({s:true, data: 'false'});
        } else {
            res.send({s:false});
        }
    });
};

module.exports = function(app, config){
    app.get('/server-setting', staticsMain);
    app.get('/server-setting/get', appGetSetting);
    app.post('/server-setting/maintain-status', appSaveMaintainStatus);
    app.post('/backend-setting/get-gcm-status', getGcmStatus);
    app.post('/backend-setting/gcm-status', gcmStatus);
};