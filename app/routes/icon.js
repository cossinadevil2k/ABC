/*
	Icons
 */

var redisClient = require('../../config/database').redisClient,
	fs = require('fs'),
	env = process.env.NODE_ENV || 'dev',
	config = require('../../config/config')[env];

var generateKey = function(packet){
	return 'Icon:' + packet;
};

var countDownload = function(packageName){
	redisClient.exists(generateKey(packageName), function (err, reply){
		if(err || !reply) redisClient.set(generateKey(packageName), 1);
		else redisClient.incr(generateKey(packageName));
	});
};

var downloadFile = function(req, res){
	var filename = req.params[0];
	var str = filename.split(".");
	if(str[str.length - 1] == "zip"){
		var packetName = str[0];
		fs.readFile(config.root + '/app/public/icon_pack/pack/' + filename, function(err, data){
			if (err){
				res.send(404);
			} else {
				countDownload(packetName);
				res.setHeader('Content-disposition', 'attachment; filename=' + filename);
				res.setHeader('Content-type', 'application/zip');
				res.send(data);
			}
		});
	} else {
		res.send(404);
	}

}

module.exports = function(app, config){
	app.get('/icon_pack/pack/*', function(req,res){res.redirect('https://web.moneylover.me')});
}