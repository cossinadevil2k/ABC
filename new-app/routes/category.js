'use strict';

var mongoose = require('mongoose');
var Category = mongoose.model('Category');
var Account = mongoose.model('Account');
var RequestActions = require('./actions');

var getCategory = function(req, res){
    var walletId = req.body.walletId;
    var userId = req.session.userId;
    //check accountId

    Account.find({_id:walletId, owner: userId}, function(err, data){
        if(err||!data){
            res.send({error: 1, msg: "get_cate_error", action: RequestActions.category_list});
        } else {
            Category.getCategoryListByAccountId(walletId, 0, true, function(data){
                if (data === []) {
					res.send({error: 2, msg: "cate_list_empty", action: RequestActions.category_list});
				} else {
					res.send({error: 0, msg: "get_cate_success", data: data, action: RequestActions.category_list});
				}
            });
        }
    });
};

module.exports = function(app){
  	app.post('/api/category/get', getCategory);
};
