/*
	WNS test
 */

var wns = require('wns');

var options = {
	client_id: 'ms-app://s-1-15-2-3933854784-1581073814-3179062630-2263249833-756725367-2539445003-3428552920',
	client_secret: 'Zq//6tbbqmLpsaC8qt7IFMRO+e8J7Clc'
};

function pushNotify(req, res){
	var channelUrl = req.body.channel;
	if(channelUrl){
		wns.sendRaw(channelUrl, JSON.stringify({foo:1, bar:2}), options, function(err, data){});
	} else {
		res.send('No channel');
	}
}


var getNotify = function(req, res){
	var body = '<html><body><form method="post" action="/wns">channel: <input type="text" name="channel"><br /><input type="submit" name="OK"></form></body></html>';
	res.writeHead(200, {
		'Content-Length': Buffer.byteLength(body),
		'Content-Type': 'text/html'
	});
	res.write(body);
	res.end();
};

module.exports = function(server, config) {
	server.get('/wns', getNotify);
	server.post('/wns', pushNotify);
};