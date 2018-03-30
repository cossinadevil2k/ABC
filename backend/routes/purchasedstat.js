
var mongoose = require('mongoose');
var PurchasedStat = mongoose.model('PurchasedStat');

var appBuy = function(req, res){
	var purStt = req.body;


    var ps = new PurchasedStat();
    ps.appId = purStt.appId;
    ps.source = purStt.source;
    ps.platform = purStt.pl;
    ps.item = purStt.item;

    ps.save(function(err, data){
    	if(err) res.send({status:false, msg:"purchased_log_error"});
    	else res.send({status: true});
    });
};

module.exports = function(app, config){
	app.post('/purchasedstat/buy', appBuy);
};