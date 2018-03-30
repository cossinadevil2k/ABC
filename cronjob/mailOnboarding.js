'use strict';

process.env.NODE_ENV = 'production';
let mongoose = require('mongoose');
let env		= process.env.NODE_ENV || 'dev';
let config	= require('../config/config')[env];
let CronJob = require('cron').CronJob;
let moment = require('moment');
let MailSystem = require('../model/email');
let _ = require('underscore');

require('../model/user');

let Daily = '0 0 3 * * *';
let msPerDay = 1000 * 60 * 60 * 24;
let UserModel;
let template;

console.log('Mail Onboarding start on ' + Daily);

function openDBConnection(callback){
    // Connect to MongoDB
    mongoose.connect(config.db_url);
    let db = mongoose.connection;

    db.on('error', console.error.bind(console, ' Sync Database connection error:'));
    db.once('open', function() {
        console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
        UserModel = mongoose.model('User');
        callback(db);
    });
}

function closeDBConnection(db){
    if (db) db.close(function(){
        console.log('[' + env + '] ' + config.app.name + ' Sync Database connection closed.');
        UserModel = undefined;
    });
}

function getListUser(startDate, callback){
    UserModel.find()
        .where('createdDate').gt(startDate.format())
        .select('email tags createdDate')
        .exec(callback);
}

function howLongSinceRegister(user){
    let regTime = moment(user.createdDate);
    let today = moment();
    return parseInt((today.valueOf() - regTime.valueOf())/msPerDay, 10) + 1;
}

function detectUser(user, listEmail){
    let daysSinceRegister = howLongSinceRegister(user);

    switch (daysSinceRegister) {
        case 2:
            template = detectVietnam(user.tags)?'oboarding-budget-vi':'onboarding-budget-en';
            pushToTemplateArray(template, user.email, listEmail);
            break;
        case 3:
            template = detectVietnam(user.tags)?'onboarding-across-devices-vi':'onboarding-across-devices-en';
            pushToTemplateArray(template, user.email, listEmail);
            break;
        case 7:
            template = detectVietnam(user.tags)?'onboarding-report-vi':'onboarding-report-en';
            pushToTemplateArray(template, user.email, listEmail);
            break;
        case 15:
            template = detectVietnam(user.tags)?'onboarding-premium-vi':'onboarding-premium-en';
            if (!detectPremiumStatus(user.tags)) pushToTemplateArray(template, user.email, listEmail);
            break;
        default:
            break;
    }
}

function detectVietnam(tagList){
    return checkTagExists(tagList, 'country:vn');
}

function detectPremiumStatus(tagList){
    return checkTagExists(tagList, 'purchase:premium');
}

function checkTagExists(tagList, tag){
    if (_.isArray(tagList)) return false;
    return tagList.indexOf(tag) != -1;
}

function startSendEmail(list){
    for (let key in list) {
        MailSystem.sendMailById(key, list[key], function(status, result){

        });
    }
}

function pushToTemplateArray(template_id, email, listSendEmail){
    if (!listSendEmail[template_id]){
        listSendEmail[template_id] = [];
    }

    listSendEmail[template_id].push(email);
}

function sendOnboardingEmail(){
    openDBConnection(function(db){
        let startDate = moment().subtract({'days': 16});

        getListUser(startDate, function(err, userList){
            if (!err) {
                if (userList.length > 0) {
                    let listSendEmail = [];

                    let userListLength = userList.length;

                    for (let i = 0; i < userListLength; i++) {
                        detectUser(userList[i], listSendEmail);
                    }

                    startSendEmail(listSendEmail);
                }
            } else {
                console.log(err);
            }

            closeDBConnection(db);
        });
    });
}

let dailyMailJob = new CronJob({
    cronTime: Daily,
    onTick: sendOnboardingEmail,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

dailyMailJob.start();