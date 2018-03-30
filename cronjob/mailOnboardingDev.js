process.env.NODE_ENV = 'dev';
var mongoose = require('mongoose');
var env		= process.env.NODE_ENV || 'dev';
var config	= require('../config/config')[env];
var CronJob = require('cron').CronJob;
var moment = require('moment');
var MailSystem = require('../model/email');
var _ = require('underscore');

require('../model/user');

// Connect to MongoDB
mongoose.connect(config.db_url);
var db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

var Daily = '0 0 3 * * *';
var msPerDay = 1000 * 60 * 60 * 24;
var today;
var startDate;

var UserModel = mongoose.model('User');

function getListUser(startDate, callback){
    UserModel.find()
        .where('createdDate').gt(startDate.format())
        .select('email tags createdDate')
        .exec(callback);
}

function howLongSinceRegister(user){
    var regTime = moment(user.createdDate);
    return parseInt((today.valueOf() - regTime.valueOf())/msPerDay, 10) + 1;
}

function detectUser(user, listEmail){
    var daysSinceRegister = howLongSinceRegister(user);

    switch (daysSinceRegister) {
        case 2:
            var template = detectVietnam(user.tags)?'oboarding-budget-vi':'onboarding-budget-en';
            pushToTemplateArray(template, user.email, listEmail);
            break;
        case 3:
            var template = detectVietnam(user.tags)?'onboarding-across-devices-vi':'onboarding-across-devices-en';
            pushToTemplateArray(template, user.email, listEmail);
            break;
        case 7:
            var template = detectVietnam(user.tags)?'onboarding-report-vi':'onboarding-report-en';
            pushToTemplateArray(template, user.email, listEmail);
            break;
        case 15:
            var template = detectVietnam(user.tags)?'onboarding-premium-vi':'onboarding-premium-en';
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
    for (var key in list) {
        MailSystem.sendToListUserByTemplate(key, list[key]);
    }
}

function pushToTemplateArray(template_id, email, listSendEmail){
    if (!listSendEmail[template_id]){
        listSendEmail[template_id] = [];
    }

    listSendEmail[template_id].push(email);
}

function sendOnboardingEmail(){
    today = moment();
    startDate = moment().subtract({'days': 16});

    getListUser(startDate, function(err, userList){
        if (!err) {
            if (userList.length > 0) {
                var listSendEmail = [];

                var userListLength = userList.length;

                for (var i = 0; i < userListLength; i++) {
                    detectUser(userList[i], listSendEmail);
                }

                startSendEmail(listSendEmail);
            }
        }
    });
}

var dailyMailJob = new CronJob({
    cronTime: Daily,
    onTick: sendOnboardingEmail,
    start: false,
    timeZone: 'Asia/Ho_Chi_Minh'
});

dailyMailJob.start();