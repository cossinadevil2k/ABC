/*
	Notification
*/

var request = require('request');

var gcm = require('node-gcm');
var mpns = require('mpns');

// var sender = new gcm.Sender('AIzaSyD_PjW_iIOdqg5FXXNps_lJ6f9CaeWd-KQ');
// var message = new gcm.Message({
// 	collapseKey: 'test', //
// 	delayWhileIdle: true,
// 	timeToLive: 3,
// 	data: {
// 		key1: 'message1',
// 		key2: 'message2'
// 	}
// });

var sendGCM = function(serverId, deviceId, callback) {
	var sender = new gcm.Sender(serverId);
	var message = new gcm.Message({
		collapseKey: 'test', //
		delayWhileIdle: true,
		timeToLive: 3,
		data: {
			key1: 'message1',
			key2: 'message2'
		}
	});
	var registrationIds = [];
	registrationIds.push(deviceId);
	sender.send(message, registrationIds, 4, callback);
};

var deviceId = 'APA91bH7V2Ws_TqAPsT3HOhqqX9dHLhDFgmv-zkdbVOC3VfhtYcLe2mUXDJBlDfbuJICPazLQ5iZOi-xpn5m5t1AeJqtrJbGOzbAkhXIjFBedsj5p6xmjG2XdHnTrrD0UvbRlc-CKYXnJsFBPPEWprssIdNTM-Gk9w';
sendGCM('AIzaSyD_PjW_iIOdqg5FXXNps_lJ6f9CaeWd-KQ', deviceId, function(err, result){});


// mpns.sendToast('http://am3.notify.live.net/throttledthirdparty/01.00/AQFXe7ipPAjVSIye_T8U2S1zAgAAAAADHwEAAAQUZm52OjNFQjU4OERBOUVFQjIxQjIFBlVTTkMwMQ', 'Bold Text', 'This is normal text', function(err, data){
// 	console.log(err);
// 	console.log(data);
// });

var pushNotify = function(req, res) {
	var deviceId = req.body.deviceId;
	var serverId = req.body.serverId;

	sendGCM(serverId, deviceId, function(err, result){
		res.send(result);
	});
};

// for(var i=0; i < 1; i++){
	// var deviceId = 'APA91bHUq2xQB5vcv1OHLxDCMFH5__h0jV4rK9cn6iAfQEoEVx6COtzs-OI488QHGrtbKRJf8TAXn-tPdaSr9qqUEQEeVcXAXXeoShepYvlab7ITZYyCGW4UwSA_ChkXj6aNII2ah8d3BlA0nYFFjC5HSABvZ1JCwA';
	// sendGCM(deviceId, function(err, result){
	// 	console.log(result);
	// });
// };

// var getNotify = function(req, res){
// 	res.set('Content-Type', 'text/html');
// 	res.send('<html><body><form method="post" action="/notification">serverID: <input type="text" name="serverId"><br />DeviceId<input type="text" name="deviceId"><br /><input type="submit" name="OK"></form></body></html>');
// };

// module.exports = function(server, config) {
// 	server.get('/notification', getNotify);
// 	server.post('/notification', pushNotify);
// };



// var apiKey = "AIzaSyD_PjW_iIOdqg5FXXNps_lJ6f9CaeWd-KQ";
// var registrationIDs= ["APA91bH-jREhkL_Zvujsv8johkSDa5Ve0iQHMj6WWTFdKLh6q31kuiedp19DHuxfGnHv02JTX_VzQPr3Mt3yA9V39t6Kalx3JmlTIKuxv9SxWc0E7jtcaZFz6Hhub5Ko-bs7A3JiwasxV8MYVZi4N9oWfDTpTsxxjg"];
// var message = "fuck";
// var url = 'https://android.googleapis.com/gcm/send';
// var fields = {
// 	registration_ids: registrationIDs,
// 	data: {
// 		message: message
// 	}
// };

// var headers = {
// 	Authorization: 'key=' + apiKey,
// 	'Content-Type': 'application/json'
// };

// var options = {
// 	method: 'POST',
// 	url: url,
// 	headers: headers,
// 	body: JSON.stringify(fields)
// };

// function callback(error, response, body) {
// 	// console.log(error);
// 	// console.log(response);
// 	console.log(body);

//     // if (!error && response.statusCode == 200) {
//     //     var info = JSON.parse(body);
//     //     console.log(info.stargazers_count + " Stars");
//     //     console.log(info.forks_count + " Forks");
//     // }
// }

// request(options, callback);