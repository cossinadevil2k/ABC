var mongoose    = require("mongoose");
var Schema		= mongoose.Schema;
var Admin       = mongoose.model('Administrator');
var Milestone   = mongoose.model('Milestone');
var moment      = require('moment');

var getMilestone = function(req, res){
    var callback = function (err, result) {
        res.send({s: !err, d: result});
    };
    Milestone.getAll(callback);
};

var addMilestone = function(req, res){
    var postData = req.body.info;
    if (!postData.eventDate || !postData.title || !req.session.adminId) return res.send({s: false});

    var info = {};

    info.eventDate = postData.eventDate;
    info.owner = req.session.adminId;
    info.title = postData.title;
    if (postData.content) info.content = postData.content;

    Milestone.addMilestone(info, function(err, result){
        var status = !(err || !result);
        res.send({s: status, m: 'Create Fails!'});
    });
};

var delMilestone = function(req, res){
    var milestone = req.body.milestone;
    Milestone.deleteMilestone(milestone._id, function(status){
        if(status){
            res.send({error: false, msg:"Deleted"});
        } else {
            res.send({error: true, msg:"Deleting due to error"});
        }
    });
};

var editMilestone = function(req, res) {
    var id = req.body.id;
    var postData = req.body.info;
    if (!postData.eventDate || !postData.title || !req.session.adminId) return res.send({s: false});

    var updates = {};

    updates.eventDate = postData.eventDate;
    updates.owner = req.session.adminId;
    updates.title = postData.title;
    updates.content = postData.content;

    Milestone.editMilestone(id, updates, function(err, result){
        var status = !(err || !result);
        res.send({s: status, m: 'Edit Fails'});
    });
};


module.exports = function(app, config){
    app.get('/milestone', staticsMain);
    app.post('/milestone/add', addMilestone);
    app.post('/milestone/get', getMilestone);
    app.post('/milestone/delete', delMilestone);
    app.post('/milestone/edit', editMilestone);
};
