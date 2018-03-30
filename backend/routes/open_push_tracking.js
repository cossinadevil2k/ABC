let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
var mongoose = require('mongoose');
var Notif = mongoose.model('DeviceNotification');
var Error = require('../../config/error');
var _ = require('underscore');

function checkServerMaintain(req, res, next){
    if (global.isServerMaintain){
        // console.log('maintain');
        res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    } else next();
}

var markOpened = function(req, res){
    if (!req.body.did || !req.body.nid || !_.isString(req.body.nid)) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }
    
    var response = {};
    if (req.user_id) response = {s: true};
    else response = {status: true};
    res.send(response);

    var did = req.body.did;
    var nid = req.body.nid;

    // console.log('did ',did);
    // console.log('nid ',nid);

    var listSession = nid.split(',');
    listSession.forEach(function(session){
        Notif.notificationOpened({device: did, session: session}, function(err, result){
            if(result){
                // console.log('tracking open ',result);
            }
        });
    });
};

module.exports = function(app, config){
    app.post('/device-notification/mark-opened', checkServerMaintain, markOpened);
};