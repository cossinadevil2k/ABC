var gcm = require('node-gcm');

var sendGCM = function(serverId, deviceId, callback) {
	var sender = new gcm.Sender(serverId);
	var message = new gcm.Message({
		collapseKey: '2', // 1: message, 2: sync
		delayWhileIdle: true,
		timeToLive: 3,
		data: {
			f: 101
		}
	});
	var registrationIds = [];
	registrationIds.push(deviceId);
	sender.send(message, registrationIds, 4, callback);
};

var getNotify = function(req, res){
	res.send('<html><body><form method="post" action="/notification">serverID: <input type="text" name="serverId"><br />DeviceId<input type="text" name="deviceId"><br /><input type="submit" name="OK"></form></body></html>');
};

var pushNotify = function(req, res) {
	var deviceId = req.body.deviceId;
	var serverId = req.body.serverId;

	sendGCM(serverId, deviceId, function(err, result){
		if(err) res.send(err);
		else res.send(result);
	});
};

module.exports = function(app, config){
	app.get('/notification', getNotify);
	app.post('/notification', pushNotify);
};