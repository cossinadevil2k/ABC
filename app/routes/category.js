/*
	Transaction
*/

var mongoose = require('mongoose');
var Category = mongoose.model('Category');
var Account = mongoose.model('Account');
var async = require('async');

var callbackFormModel = function callbackFormModel(res, status){
	if(status) res.send({error: 0});
	else res.send({error: 1, msg: 'category_e_internal_server_error'});
};

var validatePackageAdd = function(info){
	var error = [];
	if(info.name.length > 2){

	}
};

var getCategory = function(req, res){
    var accInfo = req.body.accInfo;
    var userId = req.session.userId;
    //check accountId
    Account.find({_id:accInfo._id, owner: userId}, function(err, data){
        if(err||!data){
            res.send({error: 1, msg:"get_cate_error"});
        } else {
            Category.getCategoryListByAccountId(accInfo._id, accInfo.type, true, function(data){
                if(data===[]) res.send({error:2, msg:"cate_list_empty"});
                else res.send({error:0, msg:"get_cate_success", data:data});
            });
        }
    });
};

var addCategory = function addCategory(req,res){
	var data = req.body.category;

	async.waterfall([


	], function(err, result){
		res.send(result);
	});

	Category.addNewCategory(data, function(status){
		callbackFormModel(res, status);
	});
};

var editCategory = function editCategory(req, res){
	var data = req.body.category;
	Category.editCategory(data, function(status){
		callbackFormModel(res, status);
	});
};

module.exports = function(app, config){
    app.post('/api/category/get', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/category/add', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/category/edit', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/category/add', function(req,res){res.redirect('https://web.moneylover.me')});
};