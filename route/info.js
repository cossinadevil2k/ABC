var mongoose = require('mongoose');
var Account = mongoose.model('Account');
var Budget = mongoose.model('Budget');
var Campaign = mongoose.model('Campaign');
var Category = mongoose.model('Category');
var Transaction = mongoose.model('Transaction');
var User = mongoose.model('User');
var utils = require('../helper/utils');


function checkMaintain(req, res, next){
	if (global.isServerMaintain){
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}
	next();
}


var infoEmail = function(req, res){
	User.findOne({email: req.params.email}, '-__v -tokenDevice', function(err, data){
		if(err) res.send(err);
		else res.send(data);
	});
};

var infoAccount = function(req, res){
	Account.find({owner: req.params.owner}, '-__v -tokenDevice', function(err, data){
		if(err) res.send(err);
		else res.send(data);
	});
};
var infoBudg = function(req, res){
	Budget.find({account: req.params.account}, '-__v -tokenDevice', function(err, data){
		if(err) res.send(err);
		else res.send(data);
	});
};
var infoCate = function(req, res){
	Category.find({account: req.params.account}, '-__v -tokenDevice', function(err, data){
		if(err) res.send(err);
		else res.send(data);
	});
};
var infoCamp = function(req, res){
	Campaign.find({account: req.params.account}, '-__v -tokenDevice', function(err, data){
		if(err) res.send(err);
		else res.send(data);
	});
};
var infoTran = function(req, res){
	Transaction.find({account: req.params.account}, '-__v -tokenDevice', function(err, data){
		if(err) res.send(err);
		else res.send(data);
	});
};

module.exports = function(app, config){
	app.use(checkMaintain);

	app.get('/info/user/:email', infoEmail);
	app.get('/info/acc/:owner', infoAccount);
	app.get('/info/budg/:account', infoBudg);
	app.get('/info/cate/:account', infoCate);
	app.get('/info/camp/:account', infoCamp);
	app.get('/info/tran/:account', infoTran);
};