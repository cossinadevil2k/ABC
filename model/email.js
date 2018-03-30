'use strict';

const env = process.env.NODE_ENV;
const kue = require('kue');

const config = require('../config/config')[env];

const EVENTS = {
    welcome: 'welcome',
    sendShareAccountInvite: 'sendShareAccountInvite',
    sendShareAccountInvite2: 'sendShareAccountInvite2',
    walletSharingConfirm: 'walletSharingConfirm',
    acceptSync: 'acceptSync',
    sendMailPremium: 'sendMailPremium',
    unsubscribe: 'unsubscribe',
    subscribe: 'subscribe',
    sendMailDownloadTips: 'sendMailDownloadTips',
    sendPremiumCode: 'sendPremiumCode',
    sendSocialLoginWelcomeEmail: 'sendSocialLoginWelcomeEmail',
    forgotPassword2: 'forgotPassword2',
    sendPartnerDefaultPassword: 'sendPartnerDefaultPassword',
    sendMailActiveGuide: 'sendMailActiveGuide',
    sendMailById: 'sendMailById'
};

let queue = kue.createQueue({
    prefix:'q',
    redis:{
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.kueDb,
        options:{}
    }
});

let welcome = function(userInfo, callback) {
    queue.createJob(EVENTS.welcome, {
        userInfo: userInfo
    }).removeOnComplete(true).save();

    callback();
};

let sendShareAccountInvite = function(wallet, email_to, email_from, cb, share) {
    queue.createJob(EVENTS.sendShareAccountInvite, {
        wallet: wallet,
        email_to: email_to,
        email_from: email_from,
        share: share
    }).removeOnComplete(true).save();

    cb();
};

let sendShareAccountInvite2 = function(wallet, email_to, email_from, cb, share) {
    queue.createJob(EVENTS.sendShareAccountInvite2, {
        wallet: wallet,
        email_to: email_to,
        email_from: email_from,
        share: share
    }).removeOnComplete(true).save();

    cb();
};

let walletSharingConfirm = function(email_to, email_from, cb) {
    queue.createJob(EVENTS.walletSharingConfirm, {
        email_to: email_to,
        email_from: email_from
    }).removeOnComplete(true).save();

    cb();
};

let acceptSync = function(userInfo, cb) {
    queue.createJob(EVENTS.acceptSync, {
        userInfo: userInfo
    }).removeOnComplete(true).save();

    cb();
};

let sendMailPremium = function(userInfo, cb){
    queue.createJob(EVENTS.sendMailPremium, {
        userInfo: userInfo
    }).removeOnComplete(true).save();

    cb();
};

let unsubscribe = function(userInfo, cb) {
    queue.createJob(EVENTS.unsubscribe, {
        userInfo: userInfo
    }).removeOnComplete(true).save();

    cb();
};

let subscribe = function(userInfo, cb) {
    queue.createJob(EVENTS.subscribe, {
        userInfo: userInfo
    }).removeOnComplete(true).save();

    cb();
};

let sendMailDownloadTips = function(fullname, email, lang, subject, cb){
    queue.createJob(EVENTS.sendMailDownloadTips, {
        fullname: fullname,
        email: email,
        lang: lang,
        subject: subject
    }).removeOnComplete(true).save();

    cb();
};

let sendPremiumCode = function(userInfo, cb) {
    queue.createJob(EVENTS.sendPremiumCode, {
        userInfo: userInfo
    }).removeOnComplete(true).save();

    cb();
};

let sendSocialLoginWelcomeEmail = function(email, password, country, callback){
    queue.createJob(EVENTS.sendSocialLoginWelcomeEmail, {
        email: email,
        password: password,
        country: country
    }).removeOnComplete(true).save();

    callback();
};

let forgotPassword2 = function(email, url, pincode, callback){
    queue.createJob(EVENTS.forgotPassword2, {
        email: email,
        url: url,
        pincode: pincode
    }).removeOnComplete(true).save();

    callback();
};

let sendPartnerDefaultPassword = function(info, callback) {
    queue.createJob(EVENTS.sendPartnerDefaultPassword, {
        info: info
    }).removeOnComplete(true).save();

    callback();
};

let sendMailActiveGuide = function(fullname, email, subject, cb){
    queue.createJob(EVENTS.sendMailActiveGuide, {
        fullname: fullname,
        email: email,
        subject: subject
    }).removeOnComplete(true).save();

    cb();
};

let sendMailById = function (id, email_list, callback) {
    queue.createJob(EVENTS.sendMailById, {
        id: id,
        email_list: email_list
    }).removeOnComplete(true).save();

    callback();
};

exports.wellcome = welcome;
exports.sendShareAccountInvite = sendShareAccountInvite;
exports.sendShareAccountInvite2 = sendShareAccountInvite2;
exports.walletSharingConfirm = walletSharingConfirm;
exports.acceptSync = acceptSync;
exports.sendMailPremium = sendMailPremium;
exports.unsubscribe = unsubscribe;
exports.subscribe = subscribe;
exports.sendMailDownloadTips = sendMailDownloadTips;
exports.sendPremiumCode = sendPremiumCode;
exports.sendSocialLoginWelcomeEmail = sendSocialLoginWelcomeEmail;
exports.forgotPassword2 = forgotPassword2;
exports.sendPartnerDefaultPassword = sendPartnerDefaultPassword;
exports.sendMailActiveGuide = sendMailActiveGuide;
exports.sendMailById = sendMailById;