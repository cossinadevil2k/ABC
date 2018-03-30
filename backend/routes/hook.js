'use strict';

let env = process.env.NODE_ENV;

let config = require('../../config/config')[env];
let mongoose = require('mongoose');
let Device = mongoose.model('Device');
let User = mongoose.model('User');
let BackendNotification = mongoose.model('BackendNotification');
let kue = require('kue');
let pushHook = require('../../model/sync/newhook');
let Email = require('../../model/email');
let NotificationActions = require('../../config/notification_action_code').NOTIFICATION_ACTION;
let async = require('async');

let io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
let room = '/backend/notification/admin/';

//create kue
let queue = kue.createQueue({
	prefix:'q',
	redis:{
		host: config.redis.host,
		port: config.redis.port,
		db: config.redis.kueDb,
		options:{}
	}
});

function findAllDevice(userId){
	return new Promise(function(resolve, reject){
		Device.findByUser(userId, function(devices){
			if (devices) {
				resolve(devices);
			} else {
				reject(new Error('GetDeviceListFailed'));
			}
		});
	});
}

function sendNotif(userId, data){
	findAllDevice(userId)
		.then(function(listDevice){
			let pushNoti = new pushHook();
			let collapseKey = '1';
			pushNoti.pushd(listDevice, collapseKey, data, function(err){
			});
		}).catch(function(error){

		});
}

function sendToKue(devices, content){
	async.eachSeries(devices, function(device, cb){
		let job = queue.createJob('system_backend_notification', {
			device: device,
			content: content
		}).removeOnComplete(true).save();

		job.on('complete', function(){
			cb();
		});

		job.on('failed', function(error){
			//TODO handle error
			cb();
		});
	}, function(error){

	})
}

function sendNotificationByKue(userId, content){
	findAllDevice(userId)
		.then(function(devices){
			sendToKue(devices, content);
		}).catch(function(error){

		});
}

function pushAcceptSync(userId){
	let data = {
		m: 'Your Money Lover Cloud is on. Tap to explore!',
		t: 'Money Lover Cloud is on.',
		ac: NotificationActions.ACCEPT_SYNC
	};

	//sendNotif(userId, data);
	sendNotificationByKue(userId, data);
}

function pushPurchased(userId, reason){
	const content_en = 'Congratulations! Your Money Lover account has been upgraded to Premium. If you have any problem, please go to Help & Feedback > My issues then select "Premium Feedback"';
	const content_vi = 'Chúc mừng! Tài khoản Money Lover của bạn đã được nâng cấp lên Premium. Nếu bạn có bất cứ vấn đề nào, hãy vào menu Trợ giúp & Phản hồi > My issues sau đó chọn "Premium Feedback"';

	let data = {
		r: reason,
		uid: userId,
		ac: NotificationActions.PREMIUM
	};

	User.findById(userId, (err, user) => {
		if (err) return 0;

		if (!user) return 0;

		if (user.client_setting && user.client_setting.l && user.client_setting.l === 'vi') {
			data.m = content_vi;
		} else {
			data.m = content_en;
		}

		sendNotificationByKue(userId, data);
	});
}

function pushIconGift(userId, userEmail, sender, reason, icon_pack_id, icon_pack_name, icon_pack_link){
	let data = {
		ac: NotificationActions.ICON_GIFT,
		m:'You have a gift! If you have any problem, please go to Help & Feedback > My issues then select "Icon Feedback"',
		il:icon_pack_link,
		in:icon_pack_name,
		ad:sender,
		uem: userEmail,
		r:reason,
		iid:icon_pack_id
	};

	//sendNotif(userId, data);
	sendNotificationByKue(userId, data);
}

function sendMail(userInfo, status){
	if(status === 1){
		Email.acceptSync(userInfo, function(status){});
	} else {
		Email.rejectSync(userInfo, function(status){});
	}
}

function pushHelpdeskNoti(userId, issueId){
	let content = {
		ac: NotificationActions.HELPDESK_ISSUE_DETAIL,
		iid: issueId,
		m:'You have a message from Money Lover Team. Please tap here to view.'
	};
	//sendNotif(userId, content);
	sendNotificationByKue(userId, content);
}

function pushRemoteWalletExtendResponse(userId,result){
	let content = {
		ac: NotificationActions.REMOTE_WALLET_EXTEND_ACCEPTED,
		r: result
	};

	//sendNotif(userId, content);
	sendNotificationByKue(userId, content);
}

function pushBackendNotification(id, callback){
	BackendNotification.findById(id, function(err, notification){
		if (err) {
			return callback(err);
		}
		
		if (notification) {
			let content = {
				type: notification.type
			};
			
			if (notification.url) content.url = notification.url;
			if (notification.content) content.content = notification.content;

			io.emit(room + notification.user, JSON.stringify(content));
			callback();
		} else {
			callback();
		}
	});
}

exports.pushAcceptSync = pushAcceptSync;
exports.pushPurchased = pushPurchased;
exports.sendMail = sendMail;
exports.pushIconGift = pushIconGift;
exports.pushHelpdeskNoti = pushHelpdeskNoti;
exports.pushRemoteWalletExtendResponse = pushRemoteWalletExtendResponse;
exports.pushBackendNotification = pushBackendNotification;
