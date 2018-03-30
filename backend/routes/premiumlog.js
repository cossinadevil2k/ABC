/**
 * Created by cuongpham on 11/5/14.
 */

var mongoose = require('mongoose');
var PremiumLog = mongoose.model('PremiumLog');

var getList = function(req, res){
    var postData = req.body;
    var limit = postData.limit, skip = postData.skip;

    PremiumLog.getList(limit, skip, function(err, result){
        if(!err || result){
            res.send({s:true, d:result});
        } else {
            res.send({s:false, msg:"get_premium_log_error"});
        }
    });
};

var saveLog = function(req, res){
    var info = req.body;

    var admin = req.session.adminName;

    PremiumLog.addNew(info.email, admin, info.action, function(result){
        if(result){
            res.send({s:true, d:result});
        } else {
            res.send({s:false, msg:"save_log_error"});
        }
    });
};

var search = function(req, res){
    var postData = req.body;
    if(postData.email){
       PremiumLog.find({email: postData.email}, function(err, result){
           if(err || !result){
               res.send({s:false, msg:"search_log_error"});
           } else {
               res.send({s:true, d:result})
           }
       });
    }
};

var searchEmail = function(req, res){
    var keyword = req.body.keyword;
    if(keyword){
        PremiumLog.searchByEmail(keyword, function(err, result){
            if(!err || result){
                res.send({s:true, d:result});
            } else {
                res.send({s:false, msg:"search_by_email_error"});
            }
        })
    } else {
        res.send({s:false});
    }
};

var searchAdmin = function(req, res){
    var keyword = req.body.keyword;
    if(keyword){
        PremiumLog.searchByAdmin(keyword, function(err, result){
            if(!err || result){
                res.send({s:true, d:result});
            } else {
                res.send({s:false, msg:"search_by_admin_error"});
            }
        })
    } else {
        res.send({s:false});
    }
};

var clear = function(req, res){
    if (!req.session.isAdminSystem) return res.send({s: false, msg:'Permission Error'});

    var postData = req.body;
    if(postData.ok === "ok clear"){
        PremiumLog.clearLog(function(err, result){
            if(!err || result){
                res.send({s:true});
            } else {
                res.send({s:false});
            }
        })
    } else {
        res.send({s:false, msg:"Failed"});
    }
};

module.exports = function(app, config){
    app.get('/premiumlog', staticsMain);
    app.post('/premiumlog/getlist', getList);
    app.post('/premiumlog/savelog', saveLog);
    app.post('/premiumlog/search-email', searchEmail);
    app.post('/premiumlog/search-admin', searchAdmin);
    app.post('/premiumlog/clear', clear);
};