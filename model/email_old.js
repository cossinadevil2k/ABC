'use strict';

const SparkPost = require('sparkpost');
const EmailClient = new SparkPost('b338c0c5f867775ce508d3de8f91313405a45fe0');
const utils = require('./helper/utils');

/**
 * Send Email By Template Id
 * @param template_id {String}
 * @param recipients {Array}
 * @param bind_data {Object}
 * @param callback {Function}
 */
function sendMailTemplate(template_id, recipients, bind_data, callback) {
    if (!template_id || !recipients || recipients.length === 0) {
        return;
    }

    let options = {
        transmissionBody : {
            content: {
                template_id: template_id,
                use_draft_template: true
            }
        }
    };

    if (bind_data) {
        options.transmissionBody.substitutionData = bind_data;
    }

    //setup recipients
    let toList = recipients.map((email) => {
        return  {
            address: {
                email: email
            }
        }
    });

    options.transmissionBody.recipients = toList;

    EmailClient.transmissions.send(options, (err, res) => {
        callback(!err, res.body);
    });
}

function generateTemplateName(originalTemplateName, country){
    if (country == 'vn') {
        originalTemplateName = originalTemplateName + '-vi';
    } else {
        originalTemplateName = originalTemplateName + '-en';
    }
    return originalTemplateName
}

let welcome = function(userInfo, callback) {
    let template = '';

    if (!userInfo.country) {
        template = 'ml-welcome';
    } else if (userInfo.country == 'vn') {
        template = 'onboarding-welcome-vi';
    } else {
        template = 'ml-welcome';
    }

    sendMailTemplate(template, [userInfo.email], null, callback);
};

let sendShareAccountInvite = function(wallet, email_to, email_from, cb, share) {
    let template = 'ml-share-account-invite';
    let bind_data = {
        email: email_to,
        wallet: wallet,
        accountinvitelink: utils.makeAccountShareLink(share)
    };
    let to = [email_to];

    sendMailTemplate(template, to, bind_data, cb);
};

let sendShareAccountInvite2 = function(wallet, email_to, email_from, cb, share) {
    let template = 'ml-share-account-invite-for-not-register';
    let bind_data = {
        email: email_to,
        wallet: wallet,
        accountinvitelink: utils.makeAccountShareLink(share)
    };
    let to = [email_to];

    sendMailTemplate(template, to, bind_data, cb);
};

let walletSharingConfirm = function(email_to, email_from, cb) {
    let template = 'ml-wallet-sharing-confirmation';
    let bind_data = {
        email: email_to,
        email_from: email_from
    };
    let to = [email_to];

    sendMailTemplate(template, to, bind_data, cb);
};

let acceptSync = function(userInfo, cb) {
    let template = 'ml-cloud-is-now-for-you-from-money-lover';
    let to = [userInfo.email];

    sendMailTemplate(template, to, null, cb)
};

let sendMailPremium = function(userInfo, cb){
    let template = 'ml-premium';
    let to = [userInfo.email];

    sendMailTemplate(template, to, null, cb);
};

let unsubscribe = function(userInfo, cb) {
    let template = 'ml-mail-unsubscribe';
    let to = [userInfo.email];

    sendMailTemplate(template, to, null, cb);
};

let subscribe = function(userInfo, cb) {
    let template = 'ml-money-lover-subscription-confirmed';
    let to = [userInfo.email];

    sendMailTemplate(template, to, null, cb);
};

let sendMailDownloadTips = function(fullname, email, lang, subject, cb){
    let templateName = "";
    let to = [email];
    let bind_data = {
        fullname: fullname
    };

    if (lang === 'vi') {
        templateName = 'ml-tips';
    } else {
        templateName = 'ml-tips-en';
    }

    sendMailTemplate(templateName, to, bind_data, cb);
};

var sendPremiumCode = function(userInfo, cb) {
    if (!userInfo.email) {
        return cb(false);
    }

    let template_name = "";
    let name = "";
    let to = [userInfo.email];

    if (userInfo.lang === "vi") {
        template_name = "ml-send-premium-key";
        name = "";
    } else if (userInfo.lang==="en"){
        template_name = "ml-send-premium-key-en";
        name = "there"
    }

    if (userInfo.name && userInfo.name!=="" && userInfo.name!=="null"){
        name = userInfo.name;
    }

    let bind_data = {
        name: name
    };

    sendMailTemplate(template_name, to, bind_data, cb);
};

let sendSocialLoginWelcomeEmail = function(email, password, country, callback){
    let template_name = generateTemplateName('welcome-social-login', country.toLowerCase());
    let to = [email];
    let bind_data = {
        email: email,
        password: password
    };

    sendMailTemplate(template_name, to, bind_data, callback);
};

let forgotPassword2 = function(email, url, pincode, callback){
    let template_name = 'forgot-password-en';
    let to = [email];
    let bind_data = {
        urlforgot: url,
        pincode: pincode
    };

    sendMailTemplate(template_name, to, bind_data, callback);
};

let sendPartnerDefaultPassword = function(info, callback) {
    if (!info || !info.email || !info.password) {
        return callback('InfoInvalid');
    }

    let template_name = 'partner-default-password';
    let to = [info.email];
    let bind_data = {
        email: info.email,
        password: info.password
    };

    sendMailTemplate(template_name, to, bind_data, callback);
};

let sendMailActiveGuide = function(fullname, email, subject, cb){
    let template = 'ml-active-guide';
    let to = [email];
    let bind_data = {
        fullname: fullname
    };

    sendMailTemplate(template, to, bind_data, cb);
};

let sendMailById = function(id, email_list, cb){
    sendMailTemplate(id, email_list, null, cb);
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