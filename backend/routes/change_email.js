'use strict';

let mongoose = require('mongoose');
let UserModel = mongoose.model('User');
let async = require('async');

let checkAdmin = function(req, res, next){
    if (req.session.adminSystem) return next();

    let adminRole = req.session.adminRole;
    if (adminRole.indexOf('Support') !== -1 || adminRole.indexOf('Biz') !== -1) return next();

    res.send({s: false, m:"Permission Error"});
};

let changeEmail = function(req, res){
    let oldEmail = req.body.old,
        newEmail = req.body.new;

    if (!oldEmail || !newEmail) {
        return res.send({s: false});
    }

    oldEmail = oldEmail.toLowerCase();
    newEmail = newEmail.toLowerCase();

    async.series([
        function(cb){
            //check new email
            UserModel.findByEmail(newEmail, function(err, user){
                if (err) cb('Find new email error');
                else if (!user) cb();
                else {
                    //delete
                    UserModel.findByIdAndRemove(user._id, function(err2){
                        if (err2) cb('Delete new email error');
                        else cb();
                    })
                }
            });
        },
        function(cb){
            //check old email
            UserModel.findByEmail(oldEmail, function(err, user){
                if (err) cb('Find old email error');
                else if (!user) cb('Old email is not found');
                else {
                    UserModel.findByIdAndUpdate(user._id, {email: newEmail}, function(err2){
                        if (err2) cb('Change email error');
                        else cb();
                    });
                }
            });
        }
    ], function(error){
        if (error) {
            res.send({s: false, m: error});
        }
        else {
            res.send({s: true});
        }
    });
};

module.exports = function(app, config){
    app.get('/change-email', staticsMain);
    app.post('/change-email', checkAdmin, changeEmail);
};
