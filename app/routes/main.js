/*
	Main
*/

var utils	= require('../../helper/utils');

var download = function(req, res){
	res.redirect(301, utils.detectDevice(req));
};

module.exports = function(app, config){
	app.get('/download', download);
	//app.get('/', function(req,res,next){
	//	if (req.url.indexOf('?status=') !== -1) next();
	//	else res.redirect('https://web.moneylover.me')
	//}, staticsMain);
	app.get('/', function(req, res){
		res.redirect('https://web.moneylover.me');
	});
};