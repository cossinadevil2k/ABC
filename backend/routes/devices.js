var mongoose = require('mongoose');
var DeviceModel = mongoose.model('Device');
var async = require('async');

var appGetList = function(req, res){
    var skip = req.body.skip;
    var limit = req.body.limit;

    if (!limit) return res.send({s: false});
    async.parallel({
        total: function(cb){
            DeviceModel.count(cb);
        },
        android: function(cb){
            DeviceModel.count({platform: 1}, cb);
        },
        iOS: function(cb){
            DeviceModel.count({platform: 2}, cb);
        },
        wp: function(cb){
            DeviceModel.count({platform: 3, appId: 4}, cb);
        },
        windows: function(cb){
            DeviceModel.count({platform: 3, appId: 5}, cb);
        },
        osx: function(cb){
            DeviceModel.count({platform: 6}, cb);
        },
        web: function(cb){
            DeviceModel.count({platform: 7}, cb);
        },
        list: function(cb){
            DeviceModel.find()
                .sort('-createdDate')
                .skip(skip)
                .limit(limit)
                .populate('owner')
                .lean()
                .exec(cb);
        }
    }, function(error, result){
        if (error) res.send({s: false});
        else res.send({s: true, d: result});
    });


};

var appSendNotification = function(req, res){
    var deviceId = req.body.device;
    var notificationId = req.body.notification;

    //TODO send notification and response
};

var appGetOne = function(req, res){
    var id = req.body.id;

    if (!id) return res.send({s: false});
    DeviceModel.findById(id, function(err, result){
        if (err) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

module.exports = function(app, config){
    app.get('/devices', staticsMain);
    app.post('/devices/get-list', appGetList);
    app.post('/devices/send-notification', appSendNotification);
    app.post('/devices/get-one', appGetOne);
};
