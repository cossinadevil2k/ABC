var env = process.env.NODE_ENV;
var fs = require('fs');
var config = require('../config/config')['production'];
var filename = config.provider_cache;
var Error = require('../config/error');
var mongoose = require('mongoose');
var ExtendRemoteWallet = mongoose.model('ExtendRemoteWallet');
var User = mongoose.model('User');

var checkLogin = function(req, res, next) {
    if (!req.user_id) res.send({s: false, e: Error.USER_NOT_LOGIN});
    else next();
};

var checkForUpdate = function(req, res) {
    fs.readFile(filename, function(err, result){
        if (err) res.json({s: false});
        else {
            var data = JSON.parse(result.toString());
            res.json({s: true, t: data.t});
        }
    });
};

var extendLimit = function(req, res){
    var userId = req.user_id;

    User.findById(userId, function(err, user){
        if (err || !user) res.send({s: false});
        else {
            var limit = 3;
            if (!user.rwLimit) limit += 3;
            else limit = user.rwLimit + 3;
            User.findByIdAndUpdate(userId, {rwLimit: limit}, function(error, result){
                if (error || !result) res.send({s: false});
                else {
                    res.send({s: true, w: result.rwLimit});
                    ExtendRemoteWallet.addNew({userId: userId, accepted: true, limit: result.rwLimit}, function(){})
                }
            });
        }
    });
};

module.exports = function(app, config) {
    app.post('/remote-wallet/check-for-update', checkLogin, checkForUpdate);
    app.post('/remote-wallet/extend-limit', checkLogin, extendLimit);
};