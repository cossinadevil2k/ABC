/* Redeem Route */
let env = process.env.NODE_ENV;

let mongoose = require('mongoose');
let moment = require('moment');
let https = require('https');
let querystring = require('querystring');
let Async = require('async');
let nodeExcel = require('excel-export');
let Recaptcha = require('recaptcha').Recaptcha;
let sprintf = require("sprintf-js").sprintf;
let Email = require('../../model/email');
let PushController = require('../../model/sync/push_controller');
let config = require('../../config/config')[env];


let Redeem = mongoose.model('Redeem');
let Event = mongoose.model('Events');
let Active = mongoose.model('Active');
let User = mongoose.model('User');
let Item = mongoose.model('Item');

const PUBLIC_KEY  = '6LeohPoSAAAAAEP1-VlqPbwMZ2p8V2SYRo7pmdfN';
const PRIVATE_KEY = '6LeohPoSAAAAADHRG7b990VChFE2PHGguFvXAlRb';
const TagConstant = require('../../config/tag_constant');
const StringLang = {
    vi: {
        'joined': 'Bạn đã tham gia sự kiện này.',
        'isPurchased': 'Địa chỉ email này đã được ghi nhớ là tài khoản Premium. Bấm vào liên kết "Tìm hiểu thêm" ở cuối trang hoặc bấm vào <a href="https://moneylover.me" target="_blank">đây</a> để tải ứng dụng và đăng nhập bằng địa chỉ email này.',
        'expire': 'Rất tiếc! Mã khuyến mại đã hết hạn. Hãy like <a href="https://www.facebook.com/moneylovervietnam" target="_blank">Facebook fanpage</a> của chúng tôi để cập nhật thông tin mới nhất.',
        'recaptcha':'Xác thực không thành công',
        'invalid_form':'Thông tin không chính xác.',
        'invalid_event': 'Sự kiện bạn tham gia không tồn tại.'
    },
    en: {
        'joined': 'Sorry, you have already participated in this event.',
        'isPurchased': 'This email is already a Premium account. Click the "More details" at the end of page or click <a href="https://moneylover.me" target="_blank">here</a> for more details',
        'expire': 'The code has expired. You may like our <a href="https://www.facebook.com/moneylovervietnam" target="_blank">Facebook fanpage</a> to update more info.',
        'recaptcha': 'Recaptcha verifying is not success.',
        'invalid_form': 'The information is invalid',
        'invalid_event': 'The event is invalid'
    }
};

/***FUNCTION */

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        User.findByEmail(email, (err, user) => {
            if (err) {
                return reject(err);
            }

            resolve(user);
        });
    });
}

function validateCode(redeemCode) {
    return new Promise((resolve, reject) => {
        Event.valid(redeemCode, (status, available, event) => {
            resolve({
                eventExist: status,
                codeAvailable: available,
                event
            });
        });
    });
}

function verifyRecaptcha(key) {
    return new Promise((resolve, reject) => {
        let post_data = querystring.stringify({
            secret: PRIVATE_KEY,
            response: key
        });

        let post_options = {
            host: 'www.google.com',
            port: 443,
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        //set up the post request
        let postReq = https.request(post_options, function(res){
            res.setEncoding('utf8');

            let data = "";

            res.on('data', function (chunk) {
                data += chunk.toString();
            });

            res.on('end', function() {
                let parsedData = JSON.parse(data);

                if (parsedData.success === true || parsedData.success === 'true') {
                    return resolve(true);
                } else {
                    return resolve(false);
                }
            });
        });

        //post the data
        postReq.write(post_data);
        postReq.end();
    });
}

function sendMailDownloadTips(fullname, email, lang) {
    let subject = '';
    if(lang === 'vi'){
        subject = fullname + ' ơi, cùng cài đặt Money Lover nhé!';
    } else {
        subject = "Dear " + fullname + ", let's get started with Money Lover app!";
    }

    Email.sendMailDownloadTips(fullname, email, lang, subject, function(err, data){

    });
}

function getProductInfo(productId) {
    return new Promise((resolve, reject) => {
        Item.findByProductId(productId, (err, product) => {
            if (err) {
                return reject(err);
            }

            resolve(product || {});
        });
    });
}

function activePremiumSubscription(userId, productInfo) {
    return new Promise((resolve, reject) => {
        User.findById(userId, (err, user) => {
            if (err) {
                return reject(err);
            }
            if (!user) {
                return reject('UserNotFound');
            }

            let now = Date.now();
            let expireUnit = productInfo.expire_unit || config.subscriptionExpire.premium.unit;
            let expireValue = productInfo.expire_value || config.subscriptionExpire.premium.value;
            let update = {};

            if (user.purchased) {
                if (!user.expireDate) update.expireDate = moment(now).add(expireValue, expireUnit);
                if (!user.premium_at) update.premium_at = now;
                if (!user.firstPurchase) update.firstPurchase = now;
                if (!user.lastPurchase) update.lastPurchase = now;
                if (!user.subscribeMarket) update.subscribeMarket = 'Other';
                if (!user.subscribeProduct) update.subscribeProduct = productInfo.product_id || 'premium_sub_year_1';
            } else {
                update.purchased = true;
                update.premium_at = now;
                update.expireDate = moment(now).add(expireValue, expireUnit);
                update.firstPurchase = now;
                update.lastPurchase = now;
                update.subscribeMarket = 'Other';
                update.subscribeProduct = productInfo.product_id || 'premium_sub_year_1';
            }

            let updateKeys = Object.keys(update);

            if (updateKeys.length === 0) {
                return resolve();
            }

            User.findByIdAndUpdate(userId, {$set: update}, err => {
                if (err) {
                    return reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

function makeObjRedeem(event, formData, ipAddress, status) {
    return {
        event: event,
        userName: formData.formName,
        userEmail: formData.formEmail,
        ipAddress: ipAddress,
        status: status,
        metadata: {
            tags: [sprintf(TagConstant.PURCHASE_CODE, event)]
        }
    }
}

function validForm(data) {
    let status = 0;

    if(!data.redeemCode){
        status += 1;
    } else {
        status -= 1;
    }
    if(!data.formName || !data.formName.trim().length){
        status += 1;
    } else {
        status -= 1;
    }
    if(!data.formEmail || !validateEmail(data.formEmail)){
        status += 1;
    } else {
        status -= 1;
    }
    return status === -3;
}

function validateEmail(email) {
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/*********** */

let appGetEmailList = function(req, res){
	let query = req.body.conditions;
	Redeem.find({event: query.eventid})
	.limit(query.limit)
	.skip(query.offset)
	.exec(function(err, emailList){
		if(err) res.send({err:true, msg: 'Error from server'});
		else if(emailList) res.send({err:false, emailList: emailList});
	});
};

let appGetRedeemInfo = function(req, res){
	let eventid = req.body.eventid;

	Async.parallel({
		totalEmail: function(callback){
			Redeem.count({event: eventid}, function(err, result){
				if(err) callback(null, null);
				else callback(null, result)
			});
		},
		registedEmail: function(callback){
			Redeem.count({event: eventid ,status:true}, function(err, result){
				if(err) callback(null, null);
				else callback(null, result);
			});
		}

	}, function(err, results){
		if(results.totalEmail!==null && results.registedEmail!==null) {
			res.send({err:false, totalEmail: results.totalEmail, registedEmail: results.registedEmail});
		} else {
			res.send({err:true, msg:"Count Error"})
		}
	});
};

let appEmailListExport = function(req, res){
	let eventid = req.query.eventid;
	let eventname = req.query.eventname;

	Redeem.find({event: eventid}, function(err, list){
		if(err) res.send(403);
		else {
			let conf = {};
			conf.cols = [
				{
					caption: 'Email',
					type: 'string',
					width: 30
				},
				{
					caption: 'Username',
					type: 'string',
					width: 15
				},
				{
					caption: 'Registed',
					type: 'boolean',
					width: 10
				}
			];

			conf.rows=[];
			list.forEach(function(element){
				conf.rows.push([element.userEmail, element.userName, element.status]);
			});
			let result = nodeExcel.execute(conf);
			let fileName = "[Email]"+eventname+".xlsx";
			res.setHeader('Content-Type', 'application/vnd.openxmlformats');
			res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
			res.end(result, 'binary');
		}
	});
};

let appSubmit = (req, res) => {
    let formData = req.query;
    let email = formData.formEmail;
    let redeemCode = formData.redeemCode;
    let language = formData.language || 'en';
    let captcha = formData["g-recaptcha-response"];
    let ip = req.headers['x-forwarded-for'];

    let message;
    let userInfo;
    let event;

    verifyRecaptcha(captcha)
        .then(captchaValidState => {
            if (!captchaValidState) {
                message = StringLang[language].recaptcha || StringLang['en'].recaptcha;

                return Promise.reject();
            } else if (!validForm(formData)) {
                message = StringLang[language]["invalid_form"] || StringLang['en']["invalid_form"];

                return Promise.reject();
            } else return getUserByEmail(email);
        })
        .then(user => {
            if (user) {
                userInfo = user;

                if (userInfo.purchased) {
                    message = StringLang[language].isPurchased || StringLang['en'].isPurchased;

                    return Promise.reject();
                }
            }

            return validateCode(redeemCode);
        })
        .then(validateCodeResult => {
            if (!validateCodeResult.eventExist || validateCodeResult.codeAvailable > 1) {
                message = StringLang[language].expire || StringLang['en'].expire;

                return Promise.reject();
            }

            event = validateCodeResult.event;
            return Promise.resolve();
        })
        .then(() => {
            if (!userInfo) {
                Redeem.saveRedeem(makeObjRedeem(event._id, formData, ip, false));
                sendMailDownloadTips(formData.formName, formData.formEmail, language);
                Active.changeStatus(redeemCode, true);

                return Promise.resolve();
            } else {
                return getProductInfo(event.product);
            }
        })
        .then(productInfo => {
            if (!userInfo) return Promise.resolve();

            return activePremiumSubscription(userInfo._id, productInfo);
        })
        .then(() => {
            if (userInfo) {
                User.updateTags(userInfo._id, [sprintf(TagConstant.PURCHASE_CODE, event._id)], function(){});
                PushController.pushPremiumActivated(userInfo._id);
            }

            Redeem.saveRedeem(makeObjRedeem(event._id, formData, ip, true));
            Active.changeStatus(redeemCode, true);

            return Promise.resolve();
        })
        .then(() => {
            if (event.code && !event.isUnlimited) {
                return event.useCode();
            } else {
                Active.changeStatus(redeemCode, true);
                return Promise.resolve();
            }
        })
        .then(() => {
            res.jsonp({status: true});
        })
        .catch(err => {
            // console.log('error');
            // console.log(err);
            let result = {
                status: false
            };

            if (message) {
                result.msg = message;
            }

            // console.log(result);

            res.jsonp(result);
        });


};

module.exports = function(app, config){
	app.post('/redeem/getemaillist', appGetEmailList);
	app.post('/redeem/getredeeminfo', appGetRedeemInfo);
	app.get('/redeem/emaillistexport', appEmailListExport);
	app.get('/redeem/submit', appSubmit);
};