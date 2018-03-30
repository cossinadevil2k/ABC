/**
 * Created by cuongpham on 2/5/15.
 */

'use strict';

let env	= process.env.NODE_ENV || 'dev';
let mongoose = require('mongoose');
let Section = mongoose.model('HelpDeskFaqSection');
let Faq = mongoose.model('HelpDeskFaq');
let Issue = mongoose.model('HelpDeskIssue');
let Message = mongoose.model('HelpDeskMessage');
let HelpdeskIssueStats = mongoose.model('HelpDeskIssueStat');
let BackendNotification = mongoose.model('BackendNotification');
let Administrator = mongoose.model('Administrator');
let User = mongoose.model('User');
let Error = require('../config/error');
let Slackbot = require('slackbot');
let moment = require('moment');
let async = require('async');
let utils = require('../helper/utils');

let slackbot = new Slackbot('moneylover', 'yDxX4mYbOBlvNsIKMhR7sZOo');
let config = require('../config/config')[env];
let io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
let redisClient = require('../config/database').redisClient;

function getHelpdeskAutoMessages(callback){
    redisClient.GET(config.helpdeskAutoMessagesKey, function(err, result){
        if (err) callback(err);
        else if (!result) callback();
        else {
            try {
                let messages = JSON.parse(result);
                callback(null, messages);
            } catch (e) {
                callback(e);
            }
        }
    });
}

function checkServerMaintainLoginRequired(res){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
}

function pushMessageHelpdeskNoti(issue_id){
    let room = '/helpdesk/issue/' + issue_id;
    io.emit(room, 'PING');
}

function slackPush(id, os, issue_title, first_message){
    let tag = '@minhhoang';
    // switch(os.toLowerCase()){
    //     case 'android':
    //         tag = '@z_scorpion @kent @minhhoang';
    //         break;
    //     case 'ios':
    //         tag = '@thangpq @dungtv @minhhoang';
    //         break;
    //     case 'windows':
    //         tag = '@help-14 @minhhoang';
    //         break;
    //     case 'windows phone':
    //         tag = '@help-14 @minhhoang';
    //         break;
    //     case 'windowsphone':
    //         tag = '@help-14 @minhhoang';
    //         break;
    //     case 'mac':
    //         tag = '@thangpq @dungtv @anhle @minhhoang';
    //         break;
    //     default:
    //         tag = '@channel';
    //         break;
    // }
    

    let message = tag + '[' + os + ']' + ' *' + issue_title + '*: _'+ first_message + '_ at https://nsfw.moneylover.me/helpdesk/issue_details/' + id;

    slackbot.send("#helpdesk", message, function(err, response, body) {

    });
}

function updateLastUpdateIssue(issue_id){
    Issue.updateLastUpdate(issue_id, function(err){

    });
}

let getSection = function(req, res){
    checkServerMaintainLoginRequired(res);

    Section.find()
        .sort({sortIndex: 1, created_date: 1})
        .exec(function(err, result){
        if(err || !result){
            res.send({s: false, e: Error.ERROR_SERVER});
        } else res.send({s: true, d: result});
    });
};

let getSection2 = function(req, res){
    checkServerMaintainLoginRequired(res);

    Section.find()
        .sort({sortIndex: 1, created_date: 1})
        .exec(function(err, result){
            if(err || !result){
                res.send({s: false, e: Error.ERROR_SERVER});
            } else res.send({s: true, d: result});
        });
};

let getFaq = function(req, res){
    checkServerMaintainLoginRequired(res);

    let postData = req.body;

    if(!postData.sid || !postData.lg || !postData.pl) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    let info = {
        sectionId: postData.sid,
        language: postData.lg,
        platform: postData.pl,
        published: true,
        skip: 0,
        limit: 9999
    };

    Faq.findFaq(info, function(err, result){
        if(err || !result){
            res.send({s: false, e:Error.ERROR_SERVER});
        } else res.send({s: true, d: result});
    });
};

let getFaq2 = function(req, res){
    checkServerMaintainLoginRequired(res);

    let postData = req.query;
    if(postData.sid && postData.lg && postData.pl){
        Faq.findFaq(postData.sid, postData.lg, true, postData.pl, function(err, result){
            if(err || !result){
                res.send({s: false, e:Error.ERROR_SERVER});
            } else res.send({s: true, d: result});
        })
    } else res.send({s: false, e: Error.PARAM_INVALID});
};

let getIssues = function(req, res){
    checkServerMaintainLoginRequired(res);

    let user_id = req.user_id;

    if(!user_id){
        return res.send({s: false, e:Error.USER_NOT_LOGIN});
    }

    Issue.findByUserPublic(user_id, 0, 9999, function(err, result){
        if(err || !result) res.send({s: false, e: Error.ERROR_SERVER});
        else res.send({s: true, d: result});
    })
};

let getMessages = function(req, res){
    checkServerMaintainLoginRequired(res);

    let postData = req.body,
        user_id = req.user_id;

    if(user_id){
        if(postData.iid){
            Message.findByIssueIdForUser(postData.iid, function(err, result){
                if(err || !result) res.send({s: false, e: Error.ERROR_SERVER});
                else res.send({s: true, d: result});
            });
        } else res.send({s: false, e: Error.PARAM_INVALID});
    } else res.send({s: false, e: Error.USER_NOT_LOGIN});
};

let addIssue = function(req, res){
    checkServerMaintainLoginRequired(res);

    let postData = req.body,
        user_id = req.user_id;

    if(user_id){
        if(postData.n && postData.m && postData.m.av && postData.m.os && postData.m.osv && postData.m.dn && postData.m.l && postData.c){
            async.waterfall([
                function(cb){
                    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    let issue = {
                        name: postData.n,
                        user: user_id,
                        metadata: postData.m,
                        ip: utils.realIP(ip)
                    };

                    let role = ['Support'];
                    // switch (postData.m.os) {
                    //     case 'Android':
                    //         role.push('Android');
                    //         break;
                    //     case 'iOS':
                    //         role.push('iOS');
                    //         break;
                    //     case 'Windows Phone':
                    //         role.push('Windows');
                    //         break;
                    //     case 'Windows':
                    //         role.push('Windows');
                    //         break;
                    //     case 'Mac':
                    //         role.push('iOS');
                    //         break;
                    //     case 'Web':
                    //         role.push('Web/Backend');
                    //         break;
                    //     default:
                    //         break;
                    // }

                    Administrator.findByRole(role, function(err, result){
                        if (result && result.length > 0) {
                            let assigned = [];

                            result.forEach(function(admin){
                                assigned.push(admin._id.toString());
                            });

                            issue.assigned = assigned;
                        }
                        cb(null, issue);
                    });
                },
                function(issueInfo, callback){
                    Issue.newIssue(issueInfo, function(err, result){
                        if(err) callback(err);
                        else callback(null, result);
                    });
                },
                function(newIssue, callback){
                    Message.newMessage(newIssue._id, false, user_id, postData.c, function(err, msg){
                        if(err) callback(err);
                        else {
                            let data = {
                                _id: newIssue._id,
                                name: newIssue.name,
                                metadata: newIssue.metadata,
                                report_date: newIssue.report_date
                            };
                            callback(null, data);

                            //update stats
                            let update = {
                                year: moment().year(),
                                month: moment().month(),
                                kind: 'amount'
                            };
                            HelpdeskIssueStats.updateRecord(update.year, update.month, update.kind);
                            if(env == 'production') slackPush(newIssue._id, newIssue.metadata.os, newIssue.name, msg.content);
                        }
                    });
                },
                function(data, callback){
                    if (moment().format('ddd') === 'Sun') {
                        getHelpdeskAutoMessages(function(err, messages){
                            if (err) callback(null, data);
                            else if (!messages) callback(null, data);
                            else {
                                if (messages.VI && messages.EN) {
                                    let reply = (data.metadata.l && data.metadata.l == 'vi')? messages.VI : messages.EN;
                                    Message.newMessage(data._id, true, null, reply, function(createMessageErr, msg){
                                        callback(null, data);
                                    });
                                } else callback(null, data);
                            }
                        });
                    } else {
                        callback(null, data);
                    }
                }
            ], function(error, result){
                if (error) res.send({s: false, e: Error.ERROR_SERVER});
                else res.send({s: true, d: result});
            });
        } else res.send({s: false, e: Error.PARAM_INVALID});
    } else res.send({s: false, e: Error.USER_NOT_LOGIN});
};

let addMessage = function(req, res){
    checkServerMaintainLoginRequired(res);

    let postData = req.body,
        user_id = req.user_id;

    if (!user_id) {
        return res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    if (!postData.iid || !postData.c) {
        return res.send({s: false, e: Error.PARAM_INVALID});
    }

    let metadata = null;

    if (postData.m) {
        metadata = postData.m;
    }

    Message.newMessage(postData.iid, false, user_id, postData.c, function(err, result){
        if (err || !result) {
            return res.send({s: false, e: Error.ERROR_SERVER});
        }

        pushMessageHelpdeskNoti(result.issue);

        updateLastUpdateIssue(result.issue);

        let data = {
            _id: result._id,
            issue: result.issue,
            user: result.user,
            content: result.content,
            metadata: result.metadata || null,
            send_date: result.send_date
        };

        res.send({s: true, d:data});
    }, metadata);
};

let seenIssue = function(req, res){
    checkServerMaintainLoginRequired(res);

    let issueId = req.body.iid,
        user_id = req.user_id;

    if(user_id){
        if(issueId){
            let update = {seen: true};
            Issue.findByIdAndUpdate(issueId, update, function(err, result){
                if(err) res.send({s: false, e: Error.ERROR_SERVER});
                else {
                    res.send({s: true});
                }
            })
        } else res.send({s: false, e: Error.PARAM_INVALID});
    } else res.send({s: false, e: Error.USER_NOT_LOGIN});
};

module.exports = function(server, config){
    server.post('/helpdesk/section/get', getSection);
    server.post('/helpdesk/faq/get', getFaq);
    server.post('/helpdesk/issue/get', getIssues);
    server.post('/helpdesk/message/get', getMessages);
    server.post('/helpdesk/issue/add', addIssue);
    server.post('/helpdesk/message/add', addMessage);
    server.post('/helpdesk/issue/seen', seenIssue);
};
