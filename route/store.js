var redisClient = require('../config/database').redisClient;
var _ = require('underscore');

var storeNewItemLog = "storeNewItemLog";

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

var checkNewItem = function(req, res){
    checkServerMaintain(res);

    var timestamp = req.body.t;

    if(timestamp === null || timestamp === undefined){
        res.send({status: false});
    } else {
        if(timestamp === 0) res.send({status: true, newItems: 0}); //open store first time
        else {
            redisClient.HGETALL(storeNewItemLog, function(err, result){
                if(err) {
                    res.send({status: false});
                } else {
                    if(!result) res.send({status: true, newItems: 0});
                    else {
                        var newItems = 0;
                        _.map(result, function(value, key){
                            if(key >= timestamp) newItems += parseInt(value);
                        });
                        res.send({status: true, newItems: newItems});
                    }
                }
            })
        }
    }
};

module.exports = function(server, config){
    server.post('/store/check-new', checkNewItem);
};