var mongoose = require('mongoose');
var async = require('async');
var BackendNotification = mongoose.model('BackendNotification');

var getAndNewsCount = function(req,res){
    var adminId = req.session.adminId;
    var skip = req.body.skip;
    var limit = req.body.limit;
    if(adminId){
        async.parallel({
            notification: function(callback){
                BackendNotification.get(adminId, skip, limit, function(err, data){
                    if(err) callback(err);
                    else callback(null, data);
                });
            },
            news: function(callback){
                BackendNotification.countNew(adminId, function(err, data){
                    if(err) callback(err);
                    else callback(null, data);
                });
            }
        }, function(err, results){
            if(err) res.json({s: false});
            else res.json({s: true, d: results});
        })
    } else res.json({s: false});
};

var deleteOne = function(req, res){
    var adminId = req.session.adminId;
    var notificationId = req.body.nId;

    if(adminId && notificationId){
        BackendNotification.deleteOne(notificationId, function(err, result){
            if(err || !result) res.json({s: false, e: err});
            else res.json({s: true});
        });
    } else res.json({s: false});
};

var deleteAll = function(req, res){
    var adminId = req.session.adminId;

    if(adminId){
        BackendNotification.deleteAll(adminId, function(err, result){
            if(err || !result) res.json({s: false, e: err});
            else res.json({s: true});
        })
    } else res.json({s: false});
};

var markAllAsRead = function(req, res){
    var adminId = req.session.adminId;

    if(adminId){
        BackendNotification.markAllAsRead(adminId, function(err, result){
            if(err) res.json({s: false, e: err});
            else res.json({s: true});
        });
    } else res.json({s: false});
};

module.exports = function(app, config){
    app.post('/notification/get', getAndNewsCount);
    app.post('/notification/mark-all-as-read', markAllAsRead);
    app.post('/notification/delete-one', deleteOne);
    app.post('/notification/delete-all', deleteAll);
};