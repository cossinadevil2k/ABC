/*
	Lib statics
*/


var appCurrency = function(req, res){
	res.send({d: 'ok'});
};


module.exports = function(app){
	app.get('/lib/moneylover/currency.json', appCurrency);
};
