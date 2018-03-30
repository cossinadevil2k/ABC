var mongoose = require('mongoose');
var Account = mongoose.model('Account');
var Category = mongoose.model('Category');
var User = mongoose.model('User');
var async = require('async');


var Budget = mongoose.model('Budget');
var Campaign = mongoose.model('Campaign');
var Transaction = mongoose.model('Transaction');

var setAccountDefault = function(req, res){
	var params = req.body;
	var account_id = params.account_id;
	var user_id = req.session.userId;

	User.setSelectedAccount(user_id, account_id, function(status){
		res.json(status);
	});
};

var getCategoryList = function(req, res){
	var params = req.body;
	var account_id = params.account_id;
	var type = params.type; //type: 0: all : 1 : income : 2: expense
	var sub = params.sub; // include sub: true : exlucde sub: false
	Category.getCategoryListByAccountId(account_id, type, sub, function(data){
		res.json(data);
	});
};

var deleteAllData = function(req, res){
	async.parallel({
		Account: function(callback){
			Account.remove({}, function(err){
				callback(null, 'Drop Account');
			});
		},
		Budget: function(callback){
			Budget.remove({}, function(err){
				callback(null, 'Drop Bubget');
			});
		},
		Category: function(callback){
			Category.remove({}, function(err){
				callback(null, 'Drop Category');
			});
		},
		Campaign: function(callback){
			Campaign.remove({}, function(err){
				callback(null, 'Drop Campaign');
			})
		},
		Transaction: function(callback){
			Transaction.remove({}, function(err){
				callback(null, 'Drop Transaction');
			});
		}
	}, function(err, result){
		res.send(result);
	});
};

module.exports = function(app, config){
	app.post('/api/account/setDefault', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/category/list', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/deleteAllData', function(req,res){res.redirect('https://web.moneylover.me')});
};