'use strict';

require('../model/user.js')
require('../model/device');
require('../model/backend_notification');
require('../model/helpdesk_faq_section');
require('../model/helpdesk_faq');
require('../model/helpdesk_issue_stat');
require('../model/helpdesk_performance');
require('../model/helpdesk_issue');
require('../model/helpdesk_message');
require('../model/helpDeskDailyResolve');
require('../model/admin');


const mongoose = require('mongoose');
const env = process.env.NODE_ENV || 'dev';
const config = require('../config/config')[env];
const CronJob = require('cron').CronJob;
const moment = require('moment');
const async = require('async');
const SparkPost = require('sparkpost');
const EmailClient = new SparkPost(config.sparkpostApi);

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};
// Connect to MongoDB
mongoose.connect(config.db_url, connectOptions);
const db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback() {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});
db.on('reconnected', function () {
    console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
});
db.on('disconnected', function () {
    console.log('Money DB DISCONNECTED');
});

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    db.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

const helpdeskIssueModel = mongoose.model('HelpDeskIssue')
const helpdeskMessageModel = mongoose.model('HelpDeskMessage');
const Mailler = require('../model/email');
const UserModel = mongoose.model('User');

let Daily = "0 0 7 * * *"

let mainFunc = function () {
    let startOfDay = moment().startOf('day').toDate();
    let endOfDay = moment().endOf('day').toDate();

    let issues = [];
    let messagesSend = [];
    let messMail = [];
    let mailTemplates = [];
    async.series({
        getLastUpdateIssue: function (callback) {
            helpdeskIssueModel.find({
                "report_date": {
                    $lte: endOfDay,
                    $gte: startOfDay
                }
            }, function (error, iss) {
                if (error) {
                    callback(error, null);
                } else {
                    issues = iss;
                    callback(null, null);
                }
            });
        },
        getMessageOfIssue: function (callback) {
            if (issues.length > 0) {
                async.eachSeries(issues, function (issue, cb) {
                    async.setImmediate(() => {
                        let issueId = issue._id;
                        let last_update = issue.last_update;

                        helpdeskMessageModel.find({
                            issue: issueId
                        }, function (err, messages) {
                            if (err) {
                                cb(err, null);
                            } else {
                                async.eachSeries(messages, function (mess, next) {
                                    // after 24h will sent mail
                                    if (moment(last_update).milliseconds() - moment(mess.send_date).milliseconds() >= 3600000) {
                                        let objectSendMail = {
                                            user: mess.user,
                                            content: mess.content
                                        }

                                        messMail.push(objectSendMail);
                                    }

                                    next();
                                }, cb);
                            }
                        });
                    });
                }, callback);
            } else {
                callback(null, null);
            }
        },
        sendMail: function (callback) {
            async.series({
                generateMailTemplate: function (next) {
                    if (messMail.length > 0) {
                        // console.log('messMail ',messMail);
                        let now = new Date();
                        let content;
                        let link_template = config.root + '/backend/public/partials/emails/template_helpdesk_mail.html';
                        let template_full = fs.readFileSync(link_template, 'utf8');
                        template_full = template_full.toString();

                        let titleMail = "New message form Money Lover since" + moment().format("YYYY-MM-DD hh:mm");
                        async.eachSeries(messMail, function (mailContent, cb) {
                            let code = template_full.replace(/_CONTENT_EMAIL_HERE_/g, mailContent).replace(/_YEAR_/g, now.getFullYear());
                            let template_id = "helpdesk message " + mailContent.user;

                            let options = {
                                template: {
                                    id: makeTemplateIdfromName(template_id),
                                    name: titleMail,
                                    content: {
                                        from: {
                                            email: "contact@moneylover.me",
                                            name: "Daniel"
                                        },
                                        subject: titleMail,
                                        html: code
                                    }
                                },
                                user: mailContent.user
                            };

                            mailTemplates.push(options);
                        }, next);
                    } else {
                        next();
                    }
                },
                sparkpostCreateTemplate: function (next) {
                    if (mailTemplates.length > 0) {
                        // console.log('mailTemplates ',mailTemplates);
                        async.eachSeries(mailTemplates, function (template, cb) {
                            async.setImmediate(() => {
                                EmailClient.templates.create(template, cb);
                            });
                        }, next);
                    } else {
                        next();
                    }
                },
                sendMail: function (next) {
                    if (mailTemplates.length > 0) {
                        async.eachSeries(mailTemplates, function (template, cb) {
                            async.setImmediate(() => {
                                let id = template.template.id;
                                // console.log('id ', id);

                                UserModel.findOne({
                                    _id: template.user
                                }, function (err, user) {
                                    if (err) {
                                        cb(err, null);
                                    } else {
                                        if (user) {
                                            let email = [];

                                            email.push(user.email);
                                            // email.push('loint@moneylover.me');
                                            
                                            sendEmail(id, email, cb);
                                        } else {
                                            cb();
                                        }
                                    }
                                });
                            });
                        }, next);
                    } else {
                        next();
                    }
                }
            }, callback);
        },
        updateIssue: function (callback) {
            updateIssueAfterSendMail(issues, callback);
        }
    }, function () { });
}

function makeTemplateIdfromName(name) {
    return name.replace(/\s+/g, '-').toLowerCase();
}

function sendEmail(emailTemplate, userEmail, callback) {
    // console.log('userEmail ',userEmail);
    if (env !== 'production') {
        userEmail = ['loint20@gmail.com', 'loint@moneylover.me'];
    }
    Mailler.sendMailById(emailTemplate, userEmail, function (status) {
        callback(status);
    });
}

function updateIssueAfterSendMail(issues, callback) {
    if (issues.length > 0) {
        async.eachSeries(issues, function (issue, cb) {
            helpdeskIssueModel.findOne({
                _id: issue._id
            }, function (err, iss) {
                if (err) {
                    cb(err, null);
                } else {
                    if (iss) {
                        iss.markModified('last_update');

                        iss.last_update = moment().toDate();

                        iss.save(cb);
                    } else {
                        cb();
                    }
                }
            });
        }, callback);
    } else {
        callback();
    }
}

let cronJob = new CronJob({
    cronTime: Daily,
    onTick: mainFunc,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

// if (env === 'production') {
//     cronJob.start();
// } else {
//     mainFunc();
// }

cronJob.start();