var env	= process.env.NODE_ENV;
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Administrator = mongoose.model('Administrator');
var Issue = mongoose.model('HelpDeskIssue');
var Message = mongoose.model('HelpDeskMessage');
var HelpdeskIssueStats = mongoose.model('HelpDeskIssueStat');
var BackendNotification = mongoose.model('BackendNotification');
var Section = mongoose.model('HelpDeskFaqSection');
var Faq = mongoose.model('HelpDeskFaq');

var async = require('async');
var moment = require('moment');
var Slackbot = require('slackbot');

var Error = require('../../config/error');
var utils = require('../../helper/utils');
var slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');
var config = require('../../config/config')[env];
var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
var redisClient = require('../../config/database').redisClient;

/*************/

var checkLogin = function(req, res, next){
    if (!req.session.userId) return res.send({s: false, e: ERROR.USER_NOT_LOGIN});
    else next();
};

function slackPush(id, os, issue_title, first_message){
    var tag = '';
    switch(os){
        case 'Android':
            tag = '@z_scorpion @kent @minhhoang';
            break;
        case 'iOS':
            tag = '@thangpq @dungtv @minhhoang';
            break;
        case 'Windows':
            tag = '@help-14 @minhhoang';
            break;
        case 'Windows Phone':
            tag = '@help-14 @minhhoang';
            break;
        case 'Mac':
            tag = '@thangpq @dungtv @anhle @minhhoang';
            break;
        default:
            tag = '@channel';
            break;
    }

    var message = tag + ' *' + issue_title + '*: _'+ first_message + '_ at https://nsfw.moneylover.me/helpdesk/issue_details/' + id;

    slackbot.send("#helpdesk", message, function(err, response, body) {

    });
}

function getHelpdeskAutoMessages(callback){
    redisClient.GET(config.helpdeskAutoMessagesKey, function(err, result){
        if (err) callback(err);
        else if (!result) callback();
        else {
            try {
                var messages = JSON.parse(result);
                callback(null, messages);
            } catch (e) {
                callback(e);
            }
        }
    });
}

function pushMessageHelpdeskNoti(issue_id){
    var room = '/helpdesk/issue/' + issue_id;
    io.emit(room, 'PING');
}

/*************/

var addIssue = function(req, res){

    var postData = req.body;

    function checkParams(data){
        if (!data.n) return false;
        if (!data.c) return false;
        if (!data.m) return false;
        if (!data.m.os) return false;

        return true;
    }

    if (!checkParams(postData)){
        return res.send({s: false});
    }

    var prepareData = function(cb){
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        postData.m.p = req.session.userPremium;
        postData.m.s = req.session.userSync;
        var issue = {
            name: postData.n,
            user: req.session.userId,
            metadata: postData.m,
            ip: utils.realIP(ip)
        };

        var role = ['Support'];
        switch (postData.m.os) {
            case 'Android':
                role.push('Android');
                break;
            case 'iOS':
                role.push('iOS');
                break;
            case 'Windows Phone':
                role.push('Windows');
                break;
            case 'Windows':
                role.push('Windows');
                break;
            case 'Mac':
                role.push('iOS');
                break;
            case 'Web':
                role.push('Web/Backend');
                break;
            default:
                break;
        }

        Administrator.findByRole(role, function(err, result){
            if (result && result.length > 0) {
                var assigned = [];

                result.forEach(function(admin){
                    assigned.push(admin._id.toString());
                });

                issue.assigned = assigned;
            }

            cb(null, issue);
        });
    };

    var addNewIssue = function(issueInfo, callback){
        Issue.newIssue(issueInfo, function(err, result){
            if(err) callback(err);
            else callback(null, result);
        });
    };

    var addNewMessage = function(newIssue, callback){
        Message.newMessage(newIssue._id, false, req.session.userId, postData.c, function(err, msg){
            if(err) callback(err);
            else {
                var data = {
                    _id: newIssue._id,
                    name: newIssue.name,
                    metadata: newIssue.metadata,
                    report_date: newIssue.report_date
                };
                callback(null, data);

                //update stats
                var update = {
                    year: moment().year(),
                    month: moment().month(),
                    kind: 'amount'
                };
                HelpdeskIssueStats.updateRecord(update.year, update.month, update.kind);
                if(env == 'production') slackPush(newIssue._id, newIssue.metadata.os, newIssue.name, msg.content);
            }
        });
    };

    var checkSunday = function(data, callback){
        if (moment().format('ddd') === 'Sun') {
            getHelpdeskAutoMessages(function(err, messages){
                if (err) callback(null, data);
                else if (!messages) callback(null, data);
                else {
                    if (messages.VI && messages.EN) {
                        var reply = (data.metadata.l && data.metadata.l == 'vi')? messages.VI : messages.EN;
                        Message.newMessage(data._id, true, null, reply, function(createMessageErr, msg){
                            callback(null, data);
                        });
                    } else callback(null, data);
                }
            });
        } else {
            callback(null, data);
        }
    };

    async.waterfall([
        prepareData,
        addNewIssue,
        addNewMessage,
        checkSunday
    ], function(error){
        if (error) res.send({s: false, e: Error});
        else res.send({s: true});
    });
};

var getSection = function(req, res){
    Section.find()
        .sort({sortIndex: 1, created_date: 1})
        .exec(function(err, result){
            if(err || !result){
                res.send({s: false, e: Error.ERROR_SERVER});
            } else {
                res.send({s: true, d: result});
            }
        });
};

var getFaq = function(req, res){
    var postData = req.body;
    if (!postData.sid || !postData.lg || !postData.pl || !postData.limit){
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    var skip = postData.skip;
    var limit = postData.skip;

    if (skip) {
        skip = parseInt(skip, 10);
    }

    limit = parseInt(limit, 10);

    var info = {
        sectionId: postData.sid,
        language: postData.lg,
        platform: postData.pl,
        published: true,
        skip: skip,
        limit: limit
    };

    Faq.findFaq(info, function(err, result){
        if(err || !result){
            res.send({s: false, e:Error.ERROR_SERVER});
        } else res.send({s: true, d: result});
    });
};

var getIssues = function(req, res){
    var skip = req.body.skip;
    var limit = req.body.limit;

    if (skip) {
        skip = parseInt(skip, 10);
    }

    if (!limit) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    limit = parseInt(limit, 10);

    var findCallback = function(err, result){
        if(err) {
            res.send({s: false, e: Error.ERROR_SERVER});
        } else {
            res.send({s: true, d: result});
        }
    };

    Issue.findByUserPublic(req.session.userId, skip, limit, findCallback);
};

var getMessages = function(req, res){
    var postData = req.body;

    if(!postData.iid) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    Message.findByIssueIdForUser(postData.iid, function(err, result){
        if(err || !result) res.send({s: false, e: Error.ERROR_SERVER});
        else res.send({s: true, d: result});
    });
};

var addMessage = function(req, res){
    var postData = req.body;
    var user_id = req.session.userId;

    if(!user_id){
        res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    if(!postData.iid || !postData.c) {
        res.send({s: false, e: Error.PARAM_INVALID});
    }

    var metadata = null;

    if(postData.m) {
        metadata = postData.m;
    }

    Message.newMessage(postData.iid, false, user_id, postData.c, function(err, result){
        if(err || !result) {
            res.send({s: false, e: Error.ERROR_SERVER});
        } else {
            pushMessageHelpdeskNoti(result.issue);

            var data = {
                _id: result._id,
                issue: result.issue,
                user: result.user,
                content: result.content,
                metadata: result.metadata || null,
                send_date: result.send_date
            };

            res.send({s: true, d:data})
        }
    }, metadata);
};

module.exports = function(app, config){
    app.post('/helpdesk/section/get', getSection);
    app.post('/helpdesk/faq/get', getFaq);
    app.post('/helpdesk/issue/get', checkLogin, getIssues);
    app.post('/helpdesk/message/get', checkLogin, getMessages);
    app.post('/helpdesk/issue/add', checkLogin, addIssue);
    app.post('/helpdesk/message/add', addMessage);
};