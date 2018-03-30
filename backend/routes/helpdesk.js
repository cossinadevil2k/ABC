/**
 * Created by cuongpham on 1/29/15.
 */

'use strict';

let env = process.env.NODE_ENV;

let mongoose = require('mongoose');
let Section = mongoose.model('HelpDeskFaqSection');
let Issue = mongoose.model('HelpDeskIssue');
let Message = mongoose.model('HelpDeskMessage');
let Faq = mongoose.model('HelpDeskFaq');
let User = mongoose.model('User');
let Admin = mongoose.model('Administrator');
let async = require('async');
let Hook = require('./hook');
let moment = require('moment');
let HelpDeskPerformance = mongoose.model('HelpDeskPerformance');
let IssueStats = mongoose.model('HelpDeskIssueStat');
let CronJob = require('cron').CronJob;

let HelpDeskDailyResolve = mongoose.model('HelpDeskDailyResolve');
let HelpDeskDailyStatictis = mongoose.model('HelpDeskDailyStatic');


let config = require('../../config/config')[env];
let redisClient = require('../../config/database').redisClient;
let utils = require('../../helper/utils');
let validator = require('../../helper/validators');

let getSection = function (req, res) {
    Section.find()
        .select('-__v')
        .sort({ 'sortIndex': 1, 'created_date': 1 })
        .exec(function (err, result) {
            if (err || !result) {
                res.send({ s: false });
            } else {
                res.send({ s: true, d: result });
            }
        });
};

let addSection = function (req, res) {
    let section = req.body;
    if (section) {
        Section.newSection(section.name, section.sortIndex, function (err, result) {
            if (err || !result) {
                res.send({ s: false });
            } else {
                res.send({ s: true });
            }
        });
    } else {
        res.send({ s: false });
    }
};

let editSection = function (req, res) {
    let section = req.body;
    if (section) {
        Section.editSection(section._id, section.name, section.sortIndex, function (err, result) {
            if (err || !result) res.send({ s: false });
            else res.send({ s: true });
        });
    } else {
        res.send({ s: false });
    }
};

let deleteSection = function (req, res) {
    let sectionId = req.body.sectionId;
    Section.deleteSection(sectionId, function (err, result) {
        if (err || !result) res.send({ s: false });
        else res.send({ s: true });
    });
};

let getFaq = function (req, res) {
    let postData = req.body;

    let query = {};
    if (postData.section) query.section = postData.section;
    if (postData.language) query.language = postData.language;
    if (postData.platform) query.platform = postData.platform;
    if (postData.global === true || postData.global === false) query.global = postData.global;

    if (postData.limit && postData.skip !== null) {
        Faq.find(query)
            .sort('-created_date')
            .skip(postData.skip)
            .limit(postData.limit)
            .exec(function (err, result) {
                if (err || !result) res.send({ s: false });
                else res.send({ s: true, d: result });
            });
    } else res.send({ s: false });
};

let addFaq = function (req, res) {
    let postData = req.body;
    if (postData) {
        let published = false, global = false;
        if (postData.published) published = true;
        if (postData.global) global = true;
        if (!postData.links) postData.links = null;

        Faq.newFaq(postData.question, postData.answer, postData.language, postData.section, published, global, postData.platform, postData.links, function (err, result) {
            if (err || !result) res.send({ s: false });
            else {
                Section.findByIdAndUpdate(postData.section, { last_edit: new Date() }, function (error, result) {

                });
                res.send({ s: true });
            }
        });
    } else res.send({ s: false });
};

let editFaq = function (req, res) {
    let update = req.body;

    if (!update || !update._id) {
        return res.send({ s: false });
    }

    let faqId = update._id;
    delete update['_id'];

    async.waterfall([
        //update faq
        function (callback) {
            Faq.findByIdAndUpdate(faqId, update, (err, result) => {
                callback(err, result.section);
            });
        },
        //update last_edit of section
        function (sectionId, callback) {
            Section.findByIdAndUpdate(sectionId, { last_edit: new Date() }, function (error, newSection) {
                callback(error);
            });
        }
    ], function (err) {
        if (err) return res.send({ s: false });

        res.send({ s: true });
    });
};

let deleteFaq = function (req, res) {
    let faqId = req.body.faqId;
    if (faqId) {
        Faq.deleteFaq(faqId, function (err, result) {
            if (err || !result) res.json({ s: false });
            else res.json({ s: true });
        });
    } else res.json({ s: false });
};

let getIssue = function (req, res) {
    let issueId = req.body.issueId;
    if (issueId) {
        Issue.findById(issueId)
            .populate('user', '_id email acceptSync purchased')
            .populate('assigned', '_id username role')
            .exec(function (err, result) {
                if (err || !result) res.send({ s: false });
                else res.send({ s: true, d: result });
            });
    } else res.send({ s: false });
};

let getAllIssues = function (req, res) {
    let limit = req.body.limit,
        skip = req.body.skip,
        userType = req.body.userType,
        getNew = req.body.getNew,
        os = req.body.os || null,
        sort = req.body.sort;

    if (getNew) {
        Issue.findAllNew(userType, os, skip, limit, sort, function (err, result) {
            if (err) {
                return res.send({ s: false });
            }

            res.send({ s: true, d: result });
        });
    } else {
        Issue.findAll(userType, os, skip, limit, sort, function (err, result) {
            if (err) {
                return res.send({ s: false });
            }

            res.send({ s: true, d: result });
        });
    }
};

let addIssue = function (req, res) {
    let postData = req.body.pushData;

    if (!postData.listUserEmail || !postData.name || !postData.message) {
        res.send({ s: false });
    }

    if (!postData.schedule) {
        doPush((err) => {
            // console.log(err);
        });
        return res.json({ s: true });
    }

    res.json({ s: true });

    let job = new CronJob({
        cronTime: utils.convertGeneralTimeToCronTime(postData.schedule),
        start: false,
        timeZone: 'Asia/Ho_Chi_Minh',
        onTick: function () {
            doPush((err) => {
                this.stop();
            });
        }
    });
    job.start();

    function doPush(callback) {
        async.eachSeries(postData.listUserEmail, generateIssue, callback);
    }

    function generateIssue(email, callback) {
        async.waterfall([
            function (cb) {
                checkEmail(email, cb);
            },
            createIssue,
            createFirstMessage
        ], function (error, issue_id) {
            if (error) {
                return callback(error);
            }

            callback();

            Issue.findById(issue_id)
                .populate('user', '_id, email acceptSync purchased')
                .exec(function (e, d) {
                    Hook.pushHelpdeskNoti(d.user._id, issue_id);
                });
        });
    }

    function checkEmail(email, callback) {
        User.findByEmail(email, function (err, result) {
            if (err) return callback(err);
            if (!result) return callback('no_user_found');
            callback(null, result);
        });
    }

    function createIssue(userInfo, callback) {
        let info = {
            name: postData.name,
            user: userInfo._id,
            assigned: req.session.adminId,
            issueType: 1,
            metadata: {
                p: userInfo.purchased,
                s: userInfo.acceptSync
            }
        };
        Issue.newIssue(info, function (err, result) {
            if (err) callback(err);
            else if (!result) callback('create_issue_failed');
            else callback(null, result._id);
        });
    }

    function createFirstMessage(issue_id, callback) {
        Message.newMessage(issue_id, true, req.session.adminId, postData.message, function (err, result) {
            if (err) callback(err);
            else if (!result) callback('create_message_failed');
            else callback(null, issue_id);
        });
    }
};

let deleteIssue = function (req, res) {
    let issueId = req.body.issueId;
    if (issueId) {
        Issue.deleteIssue(issueId, function (err, result) {
            if (err || !result) res.send({ s: false });
            else res.send({ s: true });
        });
    } else res.send({ s: false });
};

let listAdmin = function (req, res) {
    Admin.find()
        .select('_id username role')
        .exec(function (err, results) {
            if (err || !results) res.send({ s: false });
            else res.send({ s: true, d: results });
        });
};

let updateIssue = function (req, res) {
    let item = req.body.item,
        message = req.body.message;
    if (item) {
        async.waterfall([
            function (callback) {
                if (item.user._id) item.user = item.user._id;
                if (item.assigned && item.assigned._id) item.assigned = item.assigned._id;
                let itemId = item._id;
                delete item._id;
                Issue.updateIssue(itemId, item, function (err, result) {
                    if (err || !result) callback(true);
                    else {
                        Issue.findById(result._id)
                            .populate('user', '_id email acceptSync purchased')
                            .populate('assigned', '_id username')
                            .exec(function (e, issue) {
                                if (!e && issue) {
                                    callback(null, issue);
                                } else {
                                    callback(true);
                                }
                            });
                    }
                });
            },
            function (issue, callback) {
                if (message) {
                    Message.newMessage(item._id, true, req.session.adminId, message, function (err, result) {
                        if (err || !result) callback(true);
                        else callback(null, issue);
                    }, null);
                } else {
                    callback(null, issue);
                }
            }
        ], function (err, results) {
            if (!err) {
                if (results) res.send({ s: true, d: results });
                else res.send({ s: true });
            }
            else res.send({ s: false });
        });

    } else {
        res.send({ s: false });
    }
};

let getMessage = function (req, res) {
    let issueId = req.body.issueId;
    if (issueId) {
        Message.findByIssueId(issueId, function (err, result) {
            if (err || !result) res.send({ s: false });
            else res.send({ s: true, d: result });
        });
    } else res.send({ s: false });
};

let modReply = function (req, res) {
    let postData = req.body;

    if (postData.issueId && postData.message && postData.userId) {
        let metadata = null;
        if (postData.metadata) metadata = postData.metadata;
        Message.newMessage(postData.issueId, true, req.session.adminId, postData.message, function (err, result) {
            if (err || !result) res.send({ s: false });
            else {
                Message.findById(result._id)
                    .populate('user', '_id email acceptSync purchased')
                    .populate('mod', '_id username')
                    .exec(function (e, msg) {
                        if (e || !msg) res.send({ s: false });
                        else {
                            Issue.findById(postData.issueId)
                                .populate('user', '_id email')
                                .exec(function (e, issue) {
                                    if (!e && issue) {
                                        Hook.pushHelpdeskNoti(issue.user._id, issue._id);
                                        issue.seen = false;
                                        issue.save(function (error, data) {
                                        });
                                    }
                                });
                            Issue.findByIdAndUpdate(postData.issueId, { $addToSet: { assigned: { $each: [req.session.adminId] } } }, function (err, result) {

                            });
                            let result = { s: true, d: msg };
                            if (!postData.isAssigned) {
                                HelpDeskPerformance.updatePerformance(req.session.adminId, moment().year(), moment().month(), 'assigned');
                                result.a = req.session.adminId;
                            }
                            res.send(result);
                        }
                    });
            }
        }, metadata);
    } else res.send({ s: false });
};

let editModMessage = function (req, res) {
    let id = req.body.id;
    let message = req.body.message;

    if (!id || !message) return res.json({ s: false });

    Message.findByIdAndUpdate(id, { content: message }, err => {
        res.json({ s: !err });
    });
};

let userReply = function (req, res) {
    let postData = req.body;
    Message.newMessage(postData.issueId, false, postData.userId, postData.content, function (err, result) {
        if (err || !result) res.send({ s: false });
        else res.send({ s: true });
    });
};

let getOneFaq = function (req, res) {
    let faqId = req.body.faqId;

    if (faqId) {
        Faq.findById(faqId)
            .select('-__v -last_update -created_date')
            .exec(function (err, result) {
                if (err || !result) res.send({ s: false });
                else res.send({ s: true, d: result });
            });
    } else res.send({ s: false });
};

let getMultiFaq = function (req, res) {
    let listId = req.body.listId;
    if (listId instanceof Array || listId.length > 0) {
        let listFaq = [];
        async.eachSeries(listId, function (faqId, callback) {
            Faq.findById(faqId, function (err, faq) {
                if (err || !faq) callback(true);
                else {
                    listFaq.push(faq);
                    callback(null);
                }
            });
        }, function (err) {
            if (err) res.json({ s: false });
            else res.json(listFaq);
        });
    } else res.json({ s: false });
};

let searchFaq = function (req, res) {
    let keyword = req.body.keyword;
    let query = { question: { $regex: new RegExp(keyword, 'i') } };
    Faq.find(query, function (err, result) {
        if (err || !result) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let getIssueByAdmin = function (req, res) {
    let mode = req.body.mode,
        limit = req.body.limit,
        userType = req.body.userType,
        os = req.body.os,
        skip = req.body.skip,
        sort = req.body.sort;
    if (mode) {
        if (mode === 'open') {
            Issue.findOpenByAdmin(userType, os, req.session.adminId, skip, limit, sort, function (err, result) {
                if (err || !result) res.json({ s: false });
                else res.json({ s: true, d: result });
            });
        } else { //closed
            Issue.findClosedByAdmin(userType, os, req.session.adminId, skip, limit, sort, function (err, result) {
                if (err || !result) res.json({ s: false });
                else res.json({ s: true, d: result });
            });
        }
    } else {
        res.json({ s: false });
    }
};

let getIssueByTag = function (req, res) {
    //tags is array
    let tags = req.body.tags,
        userType = req.body.userType,
        sort = req.body.sort;

    Issue.findByTag(userType, tags, sort, function (err, result) {
        if (err || !result) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let filterFaq = function (req, res) {
    let sectionId = req.body.sectionId,
        term = req.body.term,
        linkedList = req.body.linkedList,
        otherLanguage = req.body.otherLanguage;
    if (term && sectionId) {
        let query = {
            section: sectionId,
            question: { $regex: new RegExp(term, 'i') },
            _id: { $nin: linkedList },
            language: { $nin: otherLanguage }
        };
        //let query = {section: sectionId};
        Faq.find(query, function (err, faqList) {
            if (err || !faqList) res.status(200).end();
            else {
                res.json(faqList);
            }
        });
    } else res.status(200).end();

};

let getMore = function (req, res) {
    let userId = req.body.userId;
    if (userId) {
        Issue.find({ user: userId })
            .sort({ status: 1, report_date: -1 })
            .exec(function (err, issues) {
                if (err || !issues) res.json({ s: false });
                else res.json({ s: true, d: issues });
            });
    } else res.json({ s: false });
};

let getIssueStats = function (req, res) {
    let limit = req.body.limit,
        skip = req.body.skip;

    async.parallel({
        total: function (callback) {
            IssueStats.find({ type: 'total' }, callback);
        },
        monthly: function (callback) {
            IssueStats.find({ type: 'month' })
                .sort({ year: -1, month: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(callback);
        }
    }, function (err, results) {
        if (err) res.json({ s: false });
        else {
            res.json({ s: true, d: results });
        }
    });
};

let getMonthlyPerformance = function (req, res) {
    let limit = req.body.limit,
        skip = req.body.skip,
        year = req.body.year,
        month = req.body.month;

    HelpDeskPerformance.find({ type: 'month', year: year, month: month })
        .sort({ year: -1, month: -1, solved: -1 })
        .skip(skip)
        .limit(limit)
        .populate('adminId', 'username')
        .lean()
        .exec(function (err, result) {
            if (err || !result) res.json({ s: false });
            else res.json({ s: true, d: result });
        });
};

let getPersonalPerformance = function (req, res) {
    let adminId = req.body.adminId;

    async.parallel({
        total: function (callback) {
            HelpDeskPerformance.find({ type: 'total', adminId: adminId })
                .populate('adminId', 'username')
                .lean()
                .exec(callback);
        },
        monthly: function (callback) {
            HelpDeskPerformance.find({ type: 'month', adminId: adminId })
                .sort({ year: -1, month: -1 })
                .populate('adminId', 'username')
                .lean()
                .exec(callback);
        }
    }, function (err, results) {
        if (err) res.json({ s: false });
        else res.json({ s: true, d: results });
    });
};

let getClosed = function (req, res) {
    let limit = req.body.limit,
        skip = req.body.skip,
        userType = req.body.userType,
        os = req.body.os || null,
        sort = req.body.sort;

    Issue.findClosed(userType, os, skip, limit, sort, function (err, result) {
        if (err) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let countIssue = function (req, res) {
    let openQuery = { status: null, issueType: { $exists: false } };

    async.parallel({
        total: function (cb) {
            Issue.count({ issueType: { $exists: false } }, function (e, r) {
                if (!e) cb(null, r);
                else cb(e);
            });
        },
        open: function (cb) {
            Issue.count(openQuery, function (e, r) {
                if (!e) cb(null, r);
                else cb(e);
            });
        }
    }, function (err, results) {
        if (err) res.json({ s: false });
        else res.json({ s: true, d: results });
    });
};

let updateAutoReplyMessages = function (req, res) {
    let messages = req.body.messages;

    if (!messages) return res.json({ s: false });

    redisClient.SETEX(config.helpdeskAutoMessagesKey, 604800, JSON.stringify(messages), function (err) {
        if (err) res.json({ s: false });
        else res.json({ s: true });
    });
};

let getAutoReplyMessages = function (req, res) {
    redisClient.GET(config.helpdeskAutoMessagesKey, function (err, result) {
        if (err) res.json({ s: false });
        else if (!result) res.json({ s: true });
        else {
            try {
                let msgs = JSON.parse(result);
                res.json({ s: true, d: msgs });
            } catch (e) {
                res.json({ s: false });
            }
        }
    });
};

let getAllIssues2 = function (req, res) {
    let postData = req.body;
    let adminId = req.session.adminId;

    if (!postData.limit) {
        return res.json({ s: false });
    }

    let queryFind = buildQuery(postData);
    let sortOption = buildSort(postData);

    async.parallel({
        d: getIssue,
        // u: function(cb){
        //     countByUser(queryFind, cb);
        // },
        // a: function(cb){
        //     countByAdmin(queryFind, cb);
        // }
    }, function (err, results) {
        if (err) {
            return res.json({ s: false });
        }

        results.s = true;

        res.json(results);
    });

    function getIssue(callback) {
        Issue.find(queryFind)
            .sort(sortOption)
            .skip(postData.skip)
            .limit(postData.limit)
            .populate('user')
            .populate('assigned')
            .exec(callback);
    }

    function countByUser(query, callback) {
        query['issueType'] = null;

        Issue.count(query, callback);
    }

    function countByAdmin(query, callback) {
        query['issueType'] = 1;

        Issue.count(query, callback);
    }

    function buildSort(obj) {
        let option = {};

        if (obj.sort) {
            option.last_update = (obj.sort === 'newest') ? -1 : 1;
        }

        return option;
    }

    function buildQuery(obj) {
        let query = {};

        if (obj.status) {
            switch (obj.status) {
                case 'new':
                    query.assigned = null;
                    break;
                case 'open':
                    query.assigned = { $ne: [] };

                    query.status = null;
                    break;
                case 'closed':
                    query.status = { $ne: null };
                    break;
                default:
                    break;
            }
        }

        if (obj.sender) {
            if (obj.sender === 'admin') {
                query.issueType = 1;
            } else if (obj.sender === 'user') {
                query.issueType = null;
            }
        }

        if (obj.mine) {
            query.assigned = adminId;
        }

        if (obj.platform && obj.platform.toLowerCase() !== 'all') {
            query['metadata.os'] = obj.platform;
        }

        if (obj.purchased) {
            query['metadata.p'] = true;
        } else {
            query['metadata.p'] = { $ne: true };
        }

        return query;
    }
};


let dailyResolveStatic = function (req, res) {
    let issue = req.body.issue;
    // console.log(issue);
    if (!issue) {
        return res.json({
            status: false,
            message: 'params is empty'
        });
    }

    let data = {
        issue: issue
    }

    let that = new HelpDeskDailyResolve(data);

    checkHelpDeskDailyResolveExits(HelpDeskDailyResolve, issue)
        .then(function (exist) {
            if (!exist) {
                that.save(function (error, result) {
                    return res.json({
                        status: !error,
                        data: result
                    });
                });
            } else {
                return res.json({
                    status: false
                });
            }
        })
        .catch(function (error) {
            return res.json({
                status: false,
                message: error
            });
        })
};

function checkHelpDeskDailyResolveExits(model, issue) {
    return new Promise(function (resovle, reject) {
        model.findOne({
            issue: issue
        }, function (error, result) {
            if (error) {
                reject(error);
            } else {
                if (result) {
                    resovle(true);
                } else {
                    resovle(false);
                }
            }
        });
    });
};

let getResolveStaticDaily = function (req, res) {
    let limit = req.body.limit;
    let skip = req.body.skip;

    if (!limit && !skip) {
        return res.json({
            status: false,
            message: 'params empty'
        });
    }

    HelpDeskDailyStatictis
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ byDate: -1 })
        .lean(true)
        .exec(function (error, result) {
            return res.json({
                status: !error,
                data: result
            });
        });
};

module.exports = function (app, config) {
    app.get('/helpdesk/section', staticsMain);
    app.get('/helpdesk/faq', staticsMain);
    app.get('/helpdesk/faq/*', staticsMain);
    app.get('/helpdesk/issue', staticsMain);
    app.get('/helpdesk/issue_details/*', staticsMain);
    app.get('/helpdesk/stats', staticsMain);
    app.get('/helpdesk/edit-auto-reply-messages', staticsMain);

    app.post('/helpdesk/section/get', getSection);
    app.post('/helpdesk/section/add', addSection);
    app.post('/helpdesk/section/edit', editSection);
    app.post('/helpdesk/section/delete', deleteSection);

    app.post('/helpdesk/faq/get', getFaq);
    app.post('/helpdesk/faq/get-one', getOneFaq);
    app.post('/helpdesk/faq/get-multi', getMultiFaq);
    app.post('/helpdesk/faq/search', searchFaq);
    app.post('/helpdesk/faq/edit', editFaq);
    app.post('/helpdesk/faq/add', addFaq);
    app.post('/helpdesk/faq/delete', deleteFaq);
    app.post('/helpdesk/faq/filter', filterFaq);

    app.post('/helpdesk/issue/get-one', getIssue);
    app.post('/helpdesk/issue/get-all', getAllIssues);
    app.post('/helpdesk/issue/get-all-2', getAllIssues2);
    app.post('/helpdesk/issue/get-closed', getClosed);
    app.post('/helpdesk/issue/get-by-mod', getIssueByAdmin);
    app.post('/helpdesk/issue/add', addIssue);
    app.post('/helpdesk/issue/delete', deleteIssue);
    app.post('/helpdesk/issue/update', updateIssue);
    app.post('/helpdesk/issue/get-by-tag', getIssueByTag);
    app.post('/helpdesk/issue/get-more', getMore);
    app.post('/helpdesk/issue/count', countIssue);

    app.post('/helpdesk/message/get', getMessage);
    app.post('/helpdesk/message/mod-reply', modReply);
    app.post('/helpdesk/message/user-reply', userReply);
    app.post('/helpdesk/message/edit-mod-message', editModMessage);

    app.post('/helpdesk/stats/issue', getIssueStats);
    app.post('/helpdesk/stats/monthly', getMonthlyPerformance);
    app.post('/helpdesk/stats/personal', getPersonalPerformance);
    app.post('/helpdesk/stats/daily', dailyResolveStatic);
    app.post('/helpdesk/stats/static_daily', getResolveStaticDaily);

    app.post('/helpdesk/settings/get-auto-reply-messages', getAutoReplyMessages);
    app.post('/helpdesk/settings/update-auto-reply-messages', updateAutoReplyMessages);

    app.get('/helpdesk/list-admin', listAdmin);
};
