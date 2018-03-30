'use strict';

let env			= process.env.NODE_ENV || 'dev';
let mongoose = require("mongoose");
let Schema		= mongoose.Schema;
let ObjectId	= Schema.ObjectId;
let Admin = mongoose.model('Administrator');

let listAdmin = ["tuancuong92", "bookmark", "cuong","loint"];

let appList = function(req, res){
    if(checkAdmin(req.session, listAdmin)){
        let query = {},
            select = '-hash_password -salt';
        Admin.findAdmins(query, select, function (err, result) {
            if (err) {
                res.send({error: true, msg: "Admin List Getting due to error"});
            } else {
                res.send({error: false, data: result});
            }
        });
    } else {
        res.send({error:true, msg:"Permission Error"});
    }
};

function checkAdmin(session, listSuperAdmin){
    let is = listSuperAdmin.indexOf(session.adminName);
    return (is >= 0 || session.adminSystem)
}

let appCreate = function(req, res){
    let adminInfo = req.body.adminInfo;
    if(adminInfo.username && adminInfo.password){
        if(!checkAdmin(req.session, listAdmin)){
            res.send({error: true, msg:"Permission Error"});
        } else {
            Admin.addAdmin(adminInfo, function(result){
                if(!result){
                    res.send({error: true, msg:"Admin Creation Due To Error"});
                } else {
                    res.send({error: false});
                }
            });
        }
    } else res.send({error: true});

};

let appDelete = function(req, res){
    let adminInfo = req.body.adminInfo;

    if(!checkAdmin(req.session, listAdmin)){
        res.send({error: true, msg:"Permission Error"});
    } else {
        if (adminInfo._id == req.session.adminId) return res.send({error: true, msg: 'You can not delete yourself'});

        Admin.deleteAdmin(adminInfo._id, function(status){
            if(status){
                res.send({error: false, msg:"Deleted"});
            } else {
                res.send({error: true, msg:"Deleting due to error"});
            }
        });
    }
};

let appUpdate = function(req, res){
    let adminId = req.body.adminId,
        updates = req.body.updates;

    if(adminId && updates){
        Admin.editAdmin(adminId, updates, function(err, result){
            if(err || !result) res.send({error: true});
            else res.send({error: false});
        });
    } else res.send({error: false});
};

let appEdit = function(req, res) {
  let adminId = req.body.adminId,
      updates = req.body.updates;

  Admin.editAdmin(adminId, updates, function(err, result){
      if(err || !result) res.send({error: true});
      else res.send({error: false});
  });
};

let appChangePassword = function(req, res){
    let passwords = req.body.passwords;
    let adminId = req.session.adminId;

    if(passwords.current || passwords.newPassword){
        Admin.findById(adminId, function(err, admin){
            if(!err){
                if(!admin || admin === {}) res.send({s: false, msg:'admin_not_exist'});
                else {
                    if(admin.authenticate(passwords.current)){
                        Admin.changePassword(admin, passwords.newPassword, function(result){
                            if(!result) res.send({s: false, msg:'change_password_failed'});
                            else res.send({s: true});
                        });
                    } else res.send({s: false, msg:'wrong_password'});
                }
            }
        });
    } else res.send({s: false});
};

let appGetAdminInfo = function(req, res){
    let id = req.body.id;

    if (!id) {
        return res.json({s: false});
    }

    Admin.findById(id, (err, admin) => {
        if (err) {
            return res.json({s: false});
        }

        res.json({s: true, d: admin});
    });
};

module.exports = function(app, config){
    app.get('/admin', staticsMain);
    app.post('/admin/add', appCreate);
    app.post('/admin/list', appList);
    app.post('/admin/delete', appDelete);
    app.post('/admin/update', appUpdate);
    app.post('/admin/edit', appEdit);
    app.post('/admin/change-password', appChangePassword);
    app.post('/admin/find-one', appGetAdminInfo);
};
