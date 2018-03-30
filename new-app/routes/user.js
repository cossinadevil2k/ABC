'use strict';

var _			= require('underscore');
var mongoose	= require('mongoose');
var User		= mongoose.model('User');
var Device      = mongoose.model('Device');
var utils		= require('../../helper/utils');
var validators	= require('../../helper/validators');
var async		= require('async');
var Email		= require('../../model/email');
var env			= process.env.NODE_ENV || 'development';
var config		= require('../../config/config')[env];
var fs			= require('fs');
var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
var TagConstant = require('../../config/tag_constant');
var RequestActions = require('./actions');


/*
Validator User
Input Object User
*/

var validatorBody = function(req){
    if(!req.body) return false;
    else return true;
};

var msgSuccess = function(msg, attr, action) {
    msg = msg || '';
    let returnData = {error: 0, msg: msg};

    if (attr) {
        returnData.data = attr;
    }

    if (action) {
        returnData.action = action;
    }

    return returnData;
};

var msgError = function(msg, action){
    msg = msg || '';

    let returnData = {error: 1, msg: msg};

    if (action) {
        returnData.action = action;
    }

    return returnData;
};

var validatorRegister = function(user){
    var error = 0;
    var params = [];
    var msg = '';
    try {
        if(validators.isEmail(user.email)){
            error += 1;
            msg += 'Email không hợp lệ, ';
            params.push('Email');
        }
        if(user.password != user.repassword){
            error += 1;
            msg += 'Hai mật khẩu không giống nhau';
            params.push('Password');
        }
        return {error: 0, params: params, msg: msg};
    } catch(e){
        return {error: 1, params: null, msg: null};
    }

};

var validatorInfo = function(userInfo){
        return (userInfo.email && userInfo.password);
};

var checkLogin = function(session){
    return !session.userId;
};

/*
Email exists
*/

var checkEmailExists = function(email, callback){
    User.findByEmail(email, function(err, result){
        callback(!result);
    });
};

var checkAcceptSync = function(userInfo){
    if (userInfo.acceptSync) return true;
    else return false;
};

var createNewUser = function(userInfo, callback){
    var user = new User();
    user.email = userInfo.email;
    user.salt = utils.uid(5);
    user.acceptSync = true;
    user.hashed_password = user.encryptPassword(userInfo.password, user.salt);
    user.ipRegistered = userInfo.ipRegistered;
    user.save(callback);
};

var userRegister = function(req, res){
    var userInfo = req.body;

    function checkUserLogin(callback){
        if (checkLogin(req.session)) {
            callback();
        } else {
            callback('user_e_logged');
        }
    }

    function checkInfo(callback){
        if (validatorInfo(userInfo)) {
            callback();
        } else {
            callback('user_w_info');
        }
    }

    function checkExists(callback){
        checkEmailExists(userInfo.email, function(status){
            if (status) {
                callback();
            } else {
                callback('user_e_email_exists');
            }
        });
    }

    function register(callback){
        userInfo.ipRegistered = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        userInfo.ipRegistered = utils.realIP(userInfo.ipRegistered);

        createNewUser(userInfo, function(err){
            if(err) {
                callback('server_e');
            } else {
                callback(null, 'user_n_reg_success');
            }
        });
    }

    async.waterfall([
        checkUserLogin,
        checkInfo,
        checkExists,
        register
    ], function(err, message){
        if (err) {
            res.send(msgError(err, RequestActions.user_register));
        } else {
            res.send(msgSuccess(message, null, RequestActions.user_register));
        }
    });
};

var userLogin = function(req, res) {
    var userInfo = req.body;

    function checkUserLogin(callback) {
        if (checkLogin(req.session)) {
            callback();
        } else {
            callback('user_e_logged');
        }
    }

    function checkInfo(callback) {
        if (validatorInfo(userInfo)) {
            callback();
        } else {
            callback('user_w_info');
        }
    }

    function login(callback) {
        User.userLogin(userInfo.email, userInfo.password, function(err, user){
            if (!user) {
                return callback('user_e_no_find_user');
            }

            setSession(req, res, user);
            addDevice(user);

            callback(null, {
                _id: user._id,
                email: user.email,
                client_setting: user.client_setting,
                icon_package: user.icon_package,
                purchased: user.purchased
            });
        });
    }

    async.waterfall([
        checkUserLogin,
        checkInfo,
        login
    ], function(err, result){
        if (err) {
            res.send(msgError(err, RequestActions.user_register));
        } else {
            res.send(msgSuccess, 'user_n_login_success', result, RequestActions.user_register);
        }
    });
};

var postUserLogout = function(req, res){
    async.waterfall([
        function(callback){ // check Login
            if(!checkLogin(req.session)) callback(null, utils.msgSuccess(''));
            else callback(null, utils.msgError('user_e_not_login'));
        },
        function(arg, callback){
            if(arg.error === 0){
                var message = {dataMessage:{ac:7}};
                var room = '/web-notification/' + req.session.userId;
                deleteDevice(req.session.userId);
                rmSession(req, res, function(){
                    callback(null, utils.msgSuccess('user_n_logout_success'));
                });
                io.emit(room, JSON.stringify(message));
            } else callback(null, arg);
        }
    ], function(err, result){
        res.send(result);
    });
};

function addDevice(userInfo) {
    var socketRoom = '/web-notification/' + userInfo._id;
    //check device exist
    Device.findOne({deviceId: socketRoom}, function(err, device){
        if (err) console.log(err);
        else {
            if(device) {
                if(!device.owner) {
                    device.owner = userInfo._id;
                    device.save(function(e, r){
                        if(e) console.log(e);
                    });
                }
            } else {
                //add new device
                var deviceInfo = new Device({
                    name: "Web Browser",
                    platform: 7,
                    deviceId: socketRoom,
                    owner: userInfo._id,
                    tokenDevice: 'web',
                    appId: 7
                });
                deviceInfo.save(function(err, result){
                    if (result) {
                        User.updateTags(userInfo._id, [TagConstant.DEVICE_WEB], function(){});
                    }
                })
            }
        }
    });
}

function deleteDevice(userId){
    var deviceId = '/web-notification/' + userId;
    Device.remove({deviceId: deviceId}, function(err, result){
        
    });
}

var setSession = function(req, res, userInfo){
    req.session.userId = userInfo._id;
    res.cookie('userLogin', 1, { path: '/', secure: false });
};

var rmSession = function(req, res, callback){
    req.session.userId = null;
    res.cookie('userLogin', 0, { maxAge: 0, path: '/' });
    callback();
};

var forgotPassword = function(req, res){
    if(validatorBody(req)){
        var email = req.body.email;
        if(validators.isEmail(email)){
            User.findByEmail(email, function(err, user){
                if(user){
                    User.generateHashPassword(user, function(user2){
                        if(user2){
                            Email.forgotPassword(user2, function(){});
                            res.send(utils.msgSuccess('forgot_pass_success'));
                        } else res.send(utils.msgError('internal_server_error'));
                    });
                } else res.send(utils.msgError('forgot_password_error_wrong_email'));
            });
        } else res.send(utils.msgError('forgot_password_error_wrong_email'));
    } else res.send(utils.msgError('no_data'));
};

var confirmReset = function(req, res){
    if(validatorBody(req)){
        var email = req.body.email,
            confirm = req.body.confirm;
        if(validators.isEmail(email)){
            User.findByEmail(email, function(err, user){
                if(user){
                    if(user.forgotPass.hash === confirm && user.forgotPass.expire >= new Date()){
                        req.session.emailResetPassword = email;
                        res.send(utils.msgSuccess(''));
                    } else res.send(utils.msgError('forgot_password_error_wrong_email_or_code'));
                } else res.send(utils.msgError('forgot_password_error_wrong_email_or_code'));
            });
        } else res.send(utils.msgError('forgot_password_error_wrong_email'));
    } else res.send(utils.msgError('no_data'));
};

var resetPassword = function(req, res){
    if(validatorBody(req)){
        var email = req.session.emailResetPassword;

        var password = req.body.password;

        if(email && password){
            if(validators.isEmail(email)){
                User.findByEmail(email, function(err, user){
                    if(user){
                        var salt = utils.uid(5);
                        password = user.encryptPassword(password, salt);

                        User.changePassword(email, salt, password, true, function(status){
                            if(status) {
                                req.session.emailResetPassword = null;
                                res.send(utils.msgSuccess('notice_forgot_password_success'));
                            }
                            else res.send(utils.msgError('forgot_password_fail'));
                        });
                    } else res.send(utils.msgError('forgot_password_error_wrong_email'));
                });
            } else res.send(utils.msgError('forgot_password_error_wrong_email'));
        } else res.send(utils.msgError('no_data'));
    } else res.send(utils.msgError('no_data'));
};

var autoConfirm = function(req, res){
    if(req.query){
        var id = req.query.id;
        var email = req.query.email;
        if(id && email){
            User.findByEmail(email, function(err, user){
                if(user){
                    if(user.forgotPass.hash == id && user.forgotPass.expire >= new Date()){
                        req.session.emailResetPassword = email;
                        res.redirect(301, config.site.urlNewApp + '/reset-password');
                    } else res.redirect(301, config.site.urlNewApp + '/?status=forgot_password_error_wrong_email_or_code');
                } else res.redirect(301, config.site.urlHomePage);
            });
        } else res.redirect(301, config.site.urlHomePage);
    } else res.redirect(301, config.site.urlHomePage);
};

var appGetUnsubscribe = function(req, res){
    if(req.params && req.query){
        var userId = req.params.userId;
        var password = req.query.hash;
        var errorMsg = null;
        var indexs = 1;
        async.waterfall([
            function(callback){
                User.findById(userId, 'email hashed_password userSubscribe', function(err, user){
                    if(user){
                        if(user.hashed_password == password){
                            callback(null, user);
                        } else {
                            callback(null, false);
                        }
                    } else callback(null, false);
                });
            }
        ], function(err, result){
            indexs = result ? 1 : 3;
            var email = result.email ? result.email : null;
            res.render('unsubscribe',{
                indexs: indexs,
                email: email,
                _csrf: req.csrfToken()
            }, function(err, html){
                res.send(html);
            });
        });
    } else res.redirect('http://moneylover.me/not-found');
};

var appPostUnsubscribe = function(req, res){
    if(req.params){
        var userId = req.params.userId;
        var password = req.query.hash;
        var errorMsg = null;
        var indexs = 2;
        async.waterfall([
            function(callback){
                User.findOne({_id: userId}, function(err, user){
                    if(user){
                        if(user.hashed_password == password){
                            callback(null, true);
                            user.userSubscribe = false;
                            user.save();
                        } else {
                            callback(null, false);
                        }
                    } else callback(null, false);
                });
            }
        ], function(err, result){
            indexs = result ? 2 : 3;
            res.render('unsubscribe',{
                indexs: indexs,
                userId: userId,
                password: password
            }, function(err, html){
                res.send(html);
            });
        });
    } else res.redirect('http://moneylover.me/not-found');
};

var appGetSubscribe = function(req, res){
    var userId = req.params.userId;
    if(userId){
        User.findOne({_id: userId}, function(err, user){
            if(user) {
                user.userSubscribe = true;
                user.save();
                res.redirect('http://moneylover.me');
            } else res.redirect('http://moneylover.me');
        });
    } else res.redirect('http://moneylover.me');
};

var checkDeviceLogin = function(req, res){
    var postData = req.body;

    if (!postData.deviceId || !postData.owner) return res.json({s: false});

    Device.findOne({deviceId: postData.deviceId, owner: postData.owner}, function(err, result){
        if(err) res.json({s: false});
        else res.json({s: true, d: result});
    })
};

module.exports = function(app){
    app.post('/forgot-password', forgotPassword);
    app.post('/register', userRegister);

    app.get('/confirm-forgot-password', autoConfirm);
    app.post('/confirm-forgot-password', confirmReset);

    //app.get('/reset-password', staticsMain);
    app.post('/reset-password', resetPassword);

    app.post('/login', userLogin);
    app.post('/logout', postUserLogout);
    
    app.post('/check-device-login', checkDeviceLogin);

    app.get('/unsubscribe/:userId', appGetUnsubscribe);
    app.post('/unsubscribe/:userId', appPostUnsubscribe);
    app.get('/subscribe/:userId', appGetSubscribe);
};
