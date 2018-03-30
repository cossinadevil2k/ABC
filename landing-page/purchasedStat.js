
var mongoose = require('mongoose');
var PurchasedStat = mongoose.model('PurchasedStat');

var appBuy = function(req, res){
	var purStt = req.body.buy;
	// console.log(req.body);
	PurchasedStat.addNew(purStt, function(data,err){
		if(err){
			console.log(err)
		} else {
			res.send(data);
		}
	});
}

var appGet = function(req, res){

}

module.exports = function(app, config){
	app.get('/purchasedstat', staticsMain);
	app.post('/purchasedstat/buy', appBuy);
	app.post('/purchasedStat/get', appGet);
}