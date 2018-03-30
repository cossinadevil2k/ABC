'use strict';

var mongoose = require('mongoose');
var Device = mongoose.model('Device');

var infoDevice = function(req, res){
    var owner = req.params.owner;
    Device.findByUser(owner, function(data){
        if(data) res.json(data);
        else res.json([]);
    })
};

module.exports = function(app, config){
    app.get('/info/device/:owner', infoDevice);
};