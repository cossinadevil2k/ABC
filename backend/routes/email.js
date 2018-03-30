/*
	Route mail
*/

'use strict';

const env	= process.env.NODE_ENV;
const mongoose = require('mongoose');
const Email = mongoose.model('Email');
const User = mongoose.model('User');
const Device = mongoose.model('Device');
const BackendNotification = mongoose.model('BackendNotification');

const config	= require('../../config/config')[env];
const Mailler = require('../../model/email');
const fs = require('fs');
const async = require('async');
const utils = require('../../helper/utils');
const hook = require('./hook');

const SparkPost = require('sparkpost');
const EmailClient = new SparkPost(config.sparkpostApi);

function findUserByQuery(query, callback){
    if (!query) return callback('!Query');

    let options = {
        hydrate: false,
        sort: {
            createdDate: {order: "asc"}
        }
    };

    options = utils.skipLimitSearchQueryDetect(query, options);

    if (options.from === null || options.from === undefined) {
        options.from = 0;
    }

    if (options.size === null || options.size === undefined) {
        options.size = 9999;
    }

    let userQuery = utils.createUserQuery(query);

    User.search(userQuery, options, function(err, result){
        callback(err, result.hits.hits);
    });
}

function sendEmail(emailTemplate, userEmailList, callback){
    Mailler.sendMailById(emailTemplate.slug, userEmailList, function(status){
        callback(status);
    });
}

function makeTemplateIdfromName(name){
    return name.replace(/\s+/g, '-').toLowerCase();
}

function pushBackendNotification(adminId, message, url) {
    BackendNotification.addNew(adminId, 'backend_push', message, url, function(e, r){
        if (r) hook.pushBackendNotification(r._id, function(){});
    });
}

let addMail = function(mailContent, cb){
	Email.newMail(mailContent, function(err, mail){
		if(mail) cb(mail);
		else cb(false);
	});
};

let editMail = function(objMail, cb){
	Email.editMail(objMail, function(err, mail){
		if(mail) cb(mail);
		else cb(false);
	});
};

let appList = function(req, res){
	Email.find()
		.populate('owner', 'username')
		.sort('-createDate')
		.exec(function(err, emails){
			if(err) res.send({err: true, msg: err});
			else res.send({err: false, data: emails});
		});
};

let appPostSubmit = function(req, res){
    let postData = req.body;
    let content = postData.mail.content;
    let now = new Date();

    let link_template = config.root + '/backend/public/partials/emails/template.html';

    let template_full = fs.readFileSync(link_template, 'utf8');
    template_full = template_full.toString();

    let code = template_full.replace(/_CONTENT_EMAIL_HERE_/g, content).replace(/_YEAR_/g, now.getFullYear());

	let owner = req.session.adminId;
    let isAddMail = postData.type;
    let mailContent = postData.mail;

    let options = {
        template: {
            id: makeTemplateIdfromName(mailContent.name),
            name: mailContent.name,
            content: {
                from: {
                    email: mailContent.from_email,
                    name: mailContent.from_name
                },
                subject: mailContent.subject,
                html: code
            }
        }
    };
    
    if (isAddMail && !mailContent._id) {
        //submit new template to mandrill
        EmailClient.templates.create(options, (err, response) => {
            if (err) {
                let msg = `A Sparkpost error occurred: ${err}`;
                return res.send({err: true, msg:msg});
            }

            mailContent.owner = owner;
            mailContent.slug = options.template.id;

            addMail(mailContent, (data) => {
                if (data) res.send({err: false, data: data});
                else res.send({err: true, msg: 'Server error'});
            });
        });
    } else {
        //submit edited template to mandrill
        EmailClient.templates.update(options, (err) => {
            if (err) {
                let msg = `A Sparkpost error occurred: ${err}`;
                return res.send({err: true, msg:msg});
            }

            editMail(mailContent, function(data){
                if (data) res.send({err: false, data: data});
                else res.send({err: true, msg: 'Server error'});
            });
        });
    }
};

let appDelete = function(req, res){
	let mailInfo = req.body.mail;

	if (mailInfo && mailInfo._id && mailInfo.slug){
        //send delete command to mandrill
        EmailClient.templates.delete(mailInfo.slug, (err) => {
            if (err) {
                let msg = `A Sparkpost error occurred: ${err}`;
                return res.send({err: true, msg:msg});
            }

            Email.findByIdAndRemove(mailInfo._id, function(err){
                res.send({err: !!err});
            });
        });
	} else res.send({err:true, msg: 'Hãy kiểm tra lại thông tin Mail'});
};

let appSendMail = function(req, res){
    let email = req.body.email;
    let toList = req.body.toList;
    let query = req.body.query;
    let platformInfo = req.body.platformInfo;
    let adminId = req.session.adminId;
    let message = "Email '" + email.subject + "' has been send to users";
    let url = '/emails';

    function sendEmailByQuery(email, query, callback){
        function sendEmailToList(userList, cb){
            sendEmail(email, userList, (status) => {
                if (!status) cb('failed');
                else cb();
            });
        }

        function generateEmailArray(userList, cb) {
            let list = [];

            async.eachSeries(userList, (user, done) => {
                async.setImmediate(function() {
                    if (!user) return done();
                    if (!user._source) return done();
                    if (!user._source.email) return done();

                    list.push(user._source.email);
                    done();
                });
            }, (err) => {
                cb(null, list);
            });
        }

        async.waterfall([
            function(cb){
                findUserByQuery(query, function(err, list){
                    cb(err, list);
                });
            },
            generateEmailArray,
            sendEmailToList
        ], callback);
    }

	if (email && toList){
        res.send({err: false});

        Mailler.sendMailById(email.slug, toList, function(status) {
            pushBackendNotification(adminId, message, url);
        });
	} else if (platformInfo && email){
        let lastSend = {
            platform: platformInfo.platform,
            skip: platformInfo.skip,
            limit: platformInfo.limit,
            sort: platformInfo.sort
        };

        res.send({err: false});
        Email.updateMetadata(email._id, lastSend);
    } else if (email && query) {
        res.send({err: false});

        sendEmailByQuery(email, query, function(error) {
            if (!error) {
                pushBackendNotification(adminId, message, url);
            }
        });
    } else {
        res.send({err: true, msg: 'Empty data'});
    }
};

let appMacInvite = function(req, res){
    let confirm = req.query.confirm,
        time = req.query.time,
        manual = req.query.manual;

    if (confirm == '12369874'){
        let query = {};
        if (time) query.createdDate = {$lt: time};

        if(!manual){
            User.find(query)
                .select('email createdDate')
                .sort('-createdDate')
                .limit(8000)
                .lean(true)
                .exec(function(err, userList){
                    if(!err) {
                        userList.forEach(function(userInfo, index){
                            //console.log(index + ': ' + userInfo.email);
                            Mailler.sendMacBetaInvite(userInfo, function(status, data){

                            });
                        });
                        res.setHeader("Content-Disposition","attachment; filename='lastOf8000.json'");
                        res.send(userList[7999]);
                    }
                });
        } else {
            Mailler.sendMacBetaInvite({email: manual}, function(status, data){
                res.send({status: status, data: data});
            })
        }
    } else res.send("You are not Zoo Member!!!");
};

let testGetEmail = function(req, res){
    let platform = parseInt(req.query.platform),
        skip = parseInt(req.query.skip),
        limit = parseInt(req.query.limit),
        sort = req.query.sort;

    let counter = 0;
    let list = [];
    let sortOption = { createdDate: (sort === 'newest')? -1: 1 };

    function checkPlatform(userId, platformId, callback){
        Device.findByUser(userId, function(devices){
            if (!devices) return callback(false);

            async.eachSeries(devices, function(device, cb) {
                async.setImmediate(function() {
                    if (device.platform === platformId) cb(true);
                    else cb();
                });
            }, function(result){
                if (result) callback(true);
                else callback(false);
            });
        })
    }

    function userListHandler(listUser, callback){
        async.eachSeries(listUser, function(user, cb) {
            async.setImmediate(function() {
                checkPlatform(user._id, platform, function(result) {
                    if (!result) return cb();

                    counter++;
                    list.push(user.email);
                    cb();
                });
            });
        }, function(err){
            res.setHeader("Content-Disposition","attachment; filename='android10000newest.txt'");
            res.send(list);
        });
    }

    User.find()
        .select('_id email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(function(err, result){
            if (err) throw err;
            else {
                userListHandler(result);
            }
        });
};

module.exports = function(app, config){
	app.get('/emails', staticsMain);
	app.post('/emails/delete', appDelete);
	app.post('/emails/list', appList);
	app.post('/emails/submit', appPostSubmit);
	app.post('/emails/send', appSendMail);
    app.get('/emails/mac-invite', appMacInvite);
    app.get('/emails/test-get-email', testGetEmail);
};
