var gcm = require('node-gcm');

var i = 0;

var sendGCM = function(serverId, deviceId, callback) {
	var sender = new gcm.Sender(serverId);
	var message = new gcm.Message({
		collapseKey: '1', // 1: message, 2: sync
		delayWhileIdle: true,
		// timeToLive: 3,
		dry_run: true,
		data: {t: 'New icon package', m: 'Daily Care icon package is now available for $0.99 on the Icon Store. Get ready and buy it today!', ac: 3}
	});
	var registrationIds = [];
	registrationIds.push(deviceId);
	sender.send(message, registrationIds, 5, callback);
};

var serverId = 'AIzaSyCCmO86Hlw-PIdrDu02kdOvxS0rKylQKVA';
var deviceId = 'exd3U7N5-Ag:APA91bEBSHGI9acGgqottJDXH-zm_VBOoIXHCvBGUsxYYZhJg9dncNE5TOhVq3Q5iBq3ln-fbtmkTi1Podd_0lccPM-gYAycBeYDOp0TnW41fQskkmeqtEXjyMkpRjdypshC2G5dVxHS';


// var auto = setInterval(function(){
	sendGCM(serverId, deviceId, function(err, result){
		// i += 1;
		// console.log('Index: ' + i);
		if(err) console.log("Error: %j", err);
		else console.log("Res: %j", result);

		// if(i == 100) clearInterval(auto);
	});
// }, 1000);

