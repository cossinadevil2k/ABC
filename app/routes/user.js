/*
	User
*/

var _			= require('underscore');
var mongoose	= require('mongoose');
var User		= mongoose.model('User');
var utils		= require('../../helper/utils');
var validators	= require('../../helper/validators');
var async		= require('async');
var Email		= require('../../model/email');
var env			= process.env.NODE_ENV || 'development';
var config		= require('../../config/config')[env];
var fs			= require('fs');

/*
	Validator User
	Input Object User
*/

var validatorBody = function(req){
	if(!req.body) return false;
	else return true;
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
	try {
		if(userInfo.email && userInfo.password) return true;
		else return false;
	} catch(e){
		return false;
	}
};

var checkLogin = function(session){
	if(session.userId) return false;
	else return true;
};

/*
	Email exists
*/

var checkEmailExists = function(email, callback){
	User.findByEmail(email, function(err, result){
		callback(!result);
	});
};

var createNewUser = function(userInfo, callback){
	var user = new User();
	user.email = userInfo.email;
	user.salt = utils.uid(5);
	user.hashed_password = user.encryptPassword(userInfo.password, user.salt);
	user.save(callback);
};


var userRegister = function(req, res){
	var userInfo = req.body.user;

	async.waterfall([
		function(callback){ // check Login
			if(checkLogin(req.session)) callback(null, utils.msgSuccess(''));
			else callback(null, utils.msgError('user_e_logged'));
		},
		function(arg, callback){ // check Info
			if(arg.error === 0) {
				if(validatorInfo(userInfo)) callback(null, utils.msgSuccess(''));
				else callback(null, utils.msgError('user_w_info'));
			} else callback(null, arg);
		},
		function(arg, callback){ // check mail exists
			if(arg.error === 0){
				checkEmailExists(userInfo.email, function(status){
					if(status) callback(null, utils.msgSuccess(''));
					else callback(null, utils.msgError('user_e_email_exists'));
				});
			} else callback(null, arg);
		},
		function(arg, callback){ // register
			if(arg.error === 0){
				createNewUser(userInfo, function(err){
					if(err) callback(null, utils.msgError('server_e'));
					else {
						callback(null, utils.msgSuccess('user_n_reg_success'));
					}
				});
			} else callback(null, arg);
		}
	], function(err, result){
		res.send(result);
	});
};

var userLogin = function(req, res) {
    var userInfo = req.body.user;

    if (config.lockLogin) {
        if (config.loginAccept.indexOf(userInfo.email) === -1) {
            res.send(utils.msgError('coming_soon'));
        } else {
            async.waterfall([
                function (callback) { // check Login
                    if (checkLogin(req.session)) callback(null, utils.msgSuccess(''));
                    else callback(null, utils.msgError('user_e_logged'));
                },
                function (arg, callback) { // check Info
                    if (arg.error === 0) {
                        if (validatorInfo(userInfo)) callback(null, utils.msgSuccess(''));
                        else callback(null, utils.msgError('user_w_info'));
                    } else callback(null, arg);
                },
                function (arg, callback) { // Login
                    if (arg.error === 0) {
                        User.findByEmail(userInfo.email, function (err, user) {
                            if (user) {
                                if (user.authenticate(userInfo.password)) {
                                    setSession(req, res, user);
                                    callback(null, utils.msgSuccess('user_n_login_success', {setting: user.settings, account_default: user.selected_account}));
                                } else callback(null, utils.msgError('user_e_no_find_user'));
                            } else callback(null, utils.msgError('user_e_no_find_user'));
                        });
                    } else callback(null, arg);
                }
            ], function (err, result) {
                res.send(result);
            });
        }
    }
};

var postUserLogout = function(req, res){
	async.waterfall([
		function(callback){ // check Login
			if(!checkLogin(req.session)) callback(null, utils.msgSuccess(''));
			else callback(null, utils.msgError('user_e_not_login'));
		},
		function(arg, callback){
			if(arg.error === 0){
				rmSession(req, res, function(){
					callback(null, utils.msgSuccess('user_n_logout_success'));
				});
			} else callback(null, arg);
		}
	], function(err, result){
		res.send(result);
	});
};

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
		var user = req.body.user;
		var password = user.password;
		if(email && user && password){
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
						res.redirect(301, config.site.urlHomePage + '/reset-password');
					//} else res.redirect(301, config.site.urlHomePage + '/reset-password?status=forgot_password_error_wrong_email_or_code');
					} else res.send("Wrong email or invalid confirmation code");
				//} else res.redirect(301, config.site.urlHomePage + '/reset-password?status=forgot_password_error_wrong_email_or_code');
				} else res.send("Wrong email or invalid confirmation code");
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

module.exports = function(app, config){
	app.post('/forgot-password', forgotPassword);

	app.get('/confirm-forgot-password', autoConfirm);
	app.post('/confirm-forgot-password', confirmReset);

	//app.get('/reset-password', staticsMain);
	app.get('/reset-password', function(req, res){
		res.render('reset_password', function(err, html){
			if(err){
				res.send(500, 'Internal Server Error');
			}
			else res.send(html);
		});
	});
	app.post('/reset-password', resetPassword);

	//app.get('/unsubscribe/:userId', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/unsubscribe/:userId', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/subscribe/:userId', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/unsubscribe', function(req, res){
		//res.send(req.query);
		var email = req.query.md_email;
		User.findByEmail(email, function(err, user){
			if (err) {
				// console.log(err);
				res.redirect('https://moneylover.me');
			} else {
				if (!user) res.redirect('https://moneylover.me');
				else {
					User.findByIdAndUpdate(user._id, {userSubscribe: false}, function(error, result){
						if (error) console.log(error);

						res.redirect('https://moneylover.me');
					});
				}
			}
		});
	});
};
