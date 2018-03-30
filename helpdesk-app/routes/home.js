var mongoose    = require('mongoose');
var User        = mongoose.model('User');

var async       = require('async');

var Error       = require('../../config/error');

/****************/
var setSession = function(req, res, userInfo){
    req.session.userId = userInfo._id;
    req.session.userEmail = userInfo.email;
    req.session.userPremium = userInfo.purchased;
    req.session.userSync = userInfo.acceptSync;
};

var validatorInfo = function(userInfo){
    return (userInfo.email && userInfo.password);
};

var checkLogin = function(session){
    return !session.userId;
};

/****************/

var appLogin = function(req, res){
    var userInfo = req.body;

    async.waterfall([
        function (callback) { // check Login
            if (checkLogin(req.session)) callback();
            else callback('UserLoggedIn');
        },
        function (callback) { // check Info
            if (validatorInfo(userInfo)) callback();
            else callback('UserInfoInvalid');
        },
        function (callback) { // Login
            User.userLogin(userInfo.email, userInfo.password, function(err, user){
                if (err) return callback(Error.ERROR_SERVER);
                if (!user) return callback(Error.USER_NOT_EXIST);

                setSession(req, res, user);
                callback(null, {_id: user._id, email: user.email});
            });
        }
    ], function (err, result) {
        if (err) {
            res.send({s: false, e: err});
        } else {
            res.send({s: true, u: result});
        }
    });
};

var appLogout = function(req, res){
    req.session.destroy();
    res.redirect('/');
};

module.exports = function(app, config){
    app.post('/login', appLogin);
    app.get('/logout', appLogout);
};
