'use strict';

var env = process.env.NODE_ENV || 'dev';
var config = require('../config/config')[env];
var fs = require('fs');
var Mandrill = require('mandrill-api/mandrill');
var mandrill_client = new Mandrill.Mandrill(config.mandrillApi);
var defaultEmail = 'contact@moneylover.me';
var utils = require('../helper/utils');

var mailTemplateRoot = config.root + '/helper/email';

var generateTemplateName = function(originalTemplateName, country){
	if (country == 'vn') {
		originalTemplateName = originalTemplateName + '-vi';
	} else {
		originalTemplateName = originalTemplateName + '-en';
	}
	return originalTemplateName
};

var defaultCallback = {
	success: function(httpResponse) {

	},
	error: function(httpResponse) {

	}
};

var sendMail = function(message, callback) {
	if (!callback) callback = defaultCallback;
	mandrill_client.messages.send({
		message: message,
		async: true
	}, function(results) {
		callback(true, results);
	}, function(e) {
		callback(false, e);
	});
};

var makeMessage = function(text, subject, from, to) {
	return {
		text: text,
		subject: subject,
		from_email: from,
		from_name: "Money Lover",
		to: [{
			email: to
		}]
	};
};

var sendMailTemplate = function(params, cb) {
	mandrill_client.messages.sendTemplate(params, function(success) {
		cb(true, success);
	}, function(error) {
		cb(false, error);
	});
};

var makeMailTemplate = function(template, userInfo, tags, subject) {
	var tmpMail = {
		template_name: template,
		template_content: [],
		message: {
			to: [{
				email: userInfo.email,
				type: 'bcc'
			}],
			headers: {
				"Reply-To": "contact@moneylover.me"
			},
			merge: true,
			global_merge_vars: [{
				name: "email",
				content: userInfo.email
			},{
				name: "email1",
				content: userInfo.email1
			},{
				name: "email2",
				content: userInfo.email2
			},{
				name: "userid",
				content: userInfo._id
			}, {
				name: "password",
				content: userInfo.hashed_password
			}, {
				name: "wallet",
				content: userInfo.wallet
			}, {
				name: "accountinvitelink",
				content: userInfo.accountinvitelink
			}],
			tags: tags
		},
		async: true
	};

	if(subject) tmpMail.message.subject = subject;

	return tmpMail;
};

var makeMessageHtml = function(html, subject, from, to) {
	return {
		html: html,
		subject: subject,
		from_email: from,
		from_name: "Money Lover",
		to: [{
			email: to
		}]
	};
};

var forgotPassword = function(user, callback) {
	var subject = 'Forgot Password';
	fs.readFile(mailTemplateRoot + '/forgotPassword.html', function(err, data) {
		var urlResetPassword = 'http://app.moneylover.me/confirm-forgot-password?id=' + user.forgotPass.hash + '&email=' + user.email;
		var newData = data.toString();
		newData = newData.replace(/{urlForgot}/g, urlResetPassword);
		newData = newData.replace(/{hash}/g, user.forgotPass.hash);
		var message = makeMessageHtml(newData, subject, defaultEmail, user.email);
		sendMail(message, callback);
	});
};

var forgotPassword2 = function(email, url, pincode, callback){
	let subject = 'Forgot Password';

	fs.readFile(mailTemplateRoot + '/forgotPassword.html', function(err, data) {
		let newData = data.toString();
		
		newData = newData.replace(/{urlForgot}/g, url);
		newData = newData.replace(/{hash}/g, pincode);
		
		let message = makeMessageHtml(newData, subject, defaultEmail, email);
		
		sendMail(message, callback);
	});
};

//var sendForgotMail = function(user, url, callback){
//	var templateName = '';
//
//	var mailContent = {
//		template_name: templateName,
//		template_content: [],
//		message: {
//			to: [{
//				email: user.email
//			}],
//			merge: true,
//			global_merge_vars: [
//				{
//					name: "ISSUE",
//					content: issue_title
//				}
//			]
//		},
//		async: true
//	};
//};

var welcome = function(userInfo, cb) {
	var template = '';
	if (!userInfo.country) template = 'ml-welcome';
	else if (userInfo.country == 'vn') template = 'onboarding-welcome-vi';
	else template = 'ml-welcome';

	var mailContent = makeMailTemplate(template, userInfo, ['moneylover', 'ml-welcome']);
	sendMailTemplate(mailContent, cb);
};

var premium = function(userInfo, cb) {
    var mailContent = makeMailTemplate('ml-premium', userInfo, ['moneylover', 'ml-premium']);
    sendMailTemplate(mailContent, cb);
};

var acceptSync = function(userInfo, cb) {
	var mailContent = makeMailTemplate('ml-cloud-is-now-for-you-from-money-lover', userInfo, ['moneylover', 'ml-cloud-is-now-for-you-from-money-lover']);
	sendMailTemplate(mailContent, cb);
};
var receivedSync = function(userInfo, cb) {
	var mailContent = makeMailTemplate('ml-cloud-request-received', userInfo, ['moneylover', 'ml-cloud-request-received']);
	sendMailTemplate(mailContent, cb);
};
var rejectSync = function(userInfo, cb) {
	var mailContent = makeMailTemplate('ml-cloud-request-rejected', userInfo, ['moneylover', 'ml-cloud-request-rejected']);
	sendMailTemplate(mailContent, cb);
};

var unsubscribe = function(userInfo, cb) {
	var mailContent = makeMailTemplate('ml-mail-unsubscribe', userInfo, ['moneylover', 'ml-mail-unsubscribe']);
	sendMailTemplate(mailContent, cb);
};
var subscribe = function(userInfo, cb) {
	var mailContent = makeMailTemplate('ml-money-lover-subscription-confirmed', userInfo, ['moneylover', 'ml-money-lover-subscription-confirmed']);
	sendMailTemplate(mailContent, cb);
};

var testMail = function(userInfo, cb) {
	var mailContent = makeMailTemplate('ml-cloud-request-received', userInfo, ['moneylover', 'ml test']);
	sendMailTemplate(mailContent, cb);
};

var sendShareAccountInvite = function(wallet, email, email1, cb, share) {
	var userInfo = {_id: '', email: email, hashed_password: ''};
	var subject = 'Invitation to shared wallet ' + wallet + ' from ' + email1;
	userInfo.wallet = wallet;
	userInfo.accountinvitelink = utils.makeAccountShareLink(share);
	var mailContent = makeMailTemplate('ml-share-account-invite', userInfo, ['moneylover', 'ml-share-account-invite'], subject);
	sendMailTemplate(mailContent, cb);
};

var sendShareAccountInvite2 = function(wallet, email, email1, cb, share) {
	var userInfo = {_id: '', email: email, hashed_password: ''};
	var subject = 'Invitation to wallet ' + wallet + ' on Money Lover with ' + email1;
	userInfo.wallet = wallet;
	userInfo.accountinvitelink = utils.makeAccountShareLink(share);
	var mailContent = makeMailTemplate('ml-share-account-invite-for-not-register', userInfo, ['moneylover', 'ml-share-account-invite-for-not-register'], subject);
	sendMailTemplate(mailContent, cb);
};
var walletSharingConfirm = function(email, email1, cb) {
	var userInfo = {_id: '', email: email, hashed_password: '', email1: email1};
	var mailContent = makeMailTemplate('ml-wallet-sharing-confirmation', userInfo, ['moneylover', 'ml-wallet-sharing-confirmation']);
	sendMailTemplate(mailContent, cb);
};

var makeMailDefault = function(subject, content, userInfo, tags) {
	return {
		template_name: 'ml-default',
		template_content: [],
		message: {
			subject: subject,
			to: [{
				email: userInfo.email
			}],
			headers: {
				"Reply-To": "contact@moneylover.me"
			},
			merge: true,
			global_merge_vars: [{
				name: "userid",
				content: userInfo._id
			}, {
				name: "password",
				content: userInfo.hashed_password
			}, {
				name: "contentmail",
				content: content
			}],
			tags: tags
		}
	};
};

var sendMailDefault = function(mail, userInfo, cb){
	var subject = mail.subject;
	var content = mail.content;
	var tags = mail.tags;
	var mailContent = makeMailDefault(subject, content, userInfo, tags);
	sendMailTemplate(mailContent, cb);
};

var sendMailDownloadTips = function(fullname, email, lang, subject, cb){
    var templateName = "";
    if(lang==='vi'){
        templateName = 'ml-tips';
    } else {
        templateName = 'ml-tips-en';
    }
	var mailContent = {
		template_name: templateName,
		template_content: [],
		message: {
			to: [{
				email: email
			}],
			subject: subject,
			headers: {
				"Reply-To": "contact@moneylover.me"
			},
			merge: true,
			global_merge_vars: [{
				name: "fullname",
				content: fullname
			}],
			tags: ['moneylover', 'ml-tips', 'ml-tips-en']
		},
		async: true
	};
	sendMailTemplate(mailContent, cb);
};

var sendMailActiveGuide = function(fullname, email, subject, cb){
    var mailContent = {
        template_name: 'ml-active-guide',
        template_content: [],
        message: {
            to: [{
                email: email
            }],
            subject: subject,
            headers: {
                "Reply-To": "contact@moneylover.me"
            },
            merge: true,
            global_merge_vars: [{
                name: "fullname",
                content: fullname
            }],
            tags: ['moneylover', 'ml-active-guide']
        },
        async: true
    };
    sendMailTemplate(mailContent, cb);
};

var sendMailFromBackend = function(template_name, toEmail, cb){
    var mailContent = {
        template_name: template_name,
        template_content: [],
        message: {
            to: [{
                email: toEmail
            }]
        },
        async: true
    };
    sendMailTemplate(mailContent, cb);
};

var sendMailPremium = function(userInfo, cb){
    var mailContent = {
        template_name: 'ml-premium',
        template_content: [],
        message: {
            to:[{
                email: userInfo.email
            }]
        },
        async: true
    };
    sendMailTemplate(mailContent, cb);
};

var sendPremiumCode = function(userInfo, cb) {
	if (userInfo.email) {
		var template_name = "";
		var name = "";

		if(userInfo.lang==="vi") {
			template_name = "ml-send-premium-key";
			name = "";
		} else if (userInfo.lang==="en"){
			template_name = "ml-send-premium-key-en";
			name = "there"
		}

		if(userInfo.name && userInfo.name!=="" && userInfo.name!=="null"){
			name = userInfo.name;
		}

		var mailContent = {
			template_name: template_name,
			template_content: [],
			message: {
				to: [{
					email: userInfo.email
				}],
				merge: true,
				global_merge_vars: [{
					name: "name",
					content: name
				}]
			},
			async: true
		};
		sendMailTemplate(mailContent, cb);
	} else {
		cb(false);
	}
};

var sendHelpdeskMail = function(email, issue_title, language, cb){
	if(email && issue_title){
		var templateName = (language==='vi')?'ml-helpdesk-mod-replied-vi':'ml-helpdesk-mod-replied-en';
		var mailContent = {
			template_name: templateName,
			template_content: [],
			message: {
				to: [{
					email: email
				}],
				merge: true,
				global_merge_vars: [
					{
						name: "ISSUE",
						content: issue_title
					}
				]
			},
			async: true
		};

		sendMailTemplate(mailContent, cb);
	} else cb(false);
};

var sendMacBetaInvite = function(userInfo, cb){
	var mailContent = {
		template_name: 'ml-mac-version-beta-test',
		template_content: [],
		message: {
			to:[{
				email: userInfo.email
			}],
			merge: true,
			global_merge_vars: [
				{
					name: "EMAIL",
					content: userInfo.email
				}
			]
		},
		async: true
	};

	sendMailTemplate(mailContent, cb);
};

var sendLinkReportPDF = function(userInfo, link, cb){
	var mailContent = {
		template_name: 'ml-export-to-pdf',
		template_content: [],
		message: {
			to:[{
				email: userInfo.email
			}],
			merge: true,
			global_merge_vars: [
				{
					name: "URL",
					content: link
				}
			]
		},
		async: true
	};

	sendMailTemplate(mailContent, cb);
};

var transactionReport = function(info, callback){
	var mailContent = {
		template_name: 'weekly-transactions-report',
		template_content: [],
		message: {
			to: [{
				email: info.email
			}],
			merge: true,
			merge_language: "handlebars",
			global_merge_vars: [
				{
					name: "total",
					content: info.total
				},
				{
					name: "details",
					content: info.detail
				}
			]
		},
		async: true
	};

	sendMailTemplate(mailContent, callback);
};

var transactionReportNoTransaction = function(info, callback){
	var mailContent = {
		template_name: 'weekly-transactions-report-no-transaction',
		template_content: [],
		message: {
			to: [{
				email: info.email
			}]
		},
		async: true
	};

	sendMailTemplate(mailContent, callback);
};

var sendToListUserByTemplate = function(template_name, listUser, callback){
	var toList = [];

	var userListLength = listUser.length;
	for (var i = 0; i < userListLength; i++){
		toList.push({email: listUser[i], type: 'bcc'});
	}

	var mailContent = {
		template_name: template_name,
		template_content: [],
		message: {
			to: toList
		},
		async: true
	};

	sendMailTemplate(mailContent, callback);
};

var sendSocialLoginWelcomeEmail = function(email, password, country, callback){
	var template_name = generateTemplateName('welcome-social-login', country.toLowerCase());

	var mailContent = {
		template_name: template_name,
		template_content: [],
		message: {
			to:[{
				email: email
			}],
			merge: true,
			global_merge_vars: [
				{
					name: "EMAIL",
					content: email
				}, {
					name: "PASSWORD",
					content: password
				}
			]
		},
		async: true
	};

	sendMailTemplate(mailContent, callback);
};

exports.sendShareAccountInvite = sendShareAccountInvite;
exports.sendShareAccountInvite2 = sendShareAccountInvite2;
exports.walletSharingConfirm = walletSharingConfirm;
exports.forgotPassword = forgotPassword;
exports.wellcome = welcome;
exports.acceptSync = acceptSync;
exports.receivedSync = receivedSync;
exports.rejectSync = rejectSync;
exports.sendMailPremium = sendMailPremium;
exports.testMail = testMail;
exports.unsubscribe = unsubscribe;
exports.subscribe = subscribe;
exports.sendMailDefault = sendMailDefault;
exports.sendMailDownloadTips = sendMailDownloadTips;
exports.sendMailActiveGuide = sendMailActiveGuide;
exports.sendMailFromBackend = sendMailFromBackend;
exports.sendPremiumCode = sendPremiumCode;
exports.sendHelpdeskMail = sendHelpdeskMail;
exports.sendMacBetaInvite = sendMacBetaInvite;
exports.sendLinkReportPDF = sendLinkReportPDF;
exports.sendTransactionReport = transactionReport;
exports.sendTransactionReportNoTransaction = transactionReportNoTransaction;
exports.sendToListUserByTemplate = sendToListUserByTemplate;
exports.sendSocialLoginWelcomeEmail = sendSocialLoginWelcomeEmail;
exports.forgotPassword2 = forgotPassword2;
