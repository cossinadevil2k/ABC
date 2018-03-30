/*
	Transaction
*/

var mongoose = require('mongoose');
var Transaction = mongoose.model('Transaction');
var Permission = require('../../model/permission');
var ShareTransaction = mongoose.model('transactionShare');
var utils = require('../../helper/utils');
var moment = require('moment');
var dateFormat = 'YYYY-MM-DD';
var accounting = require('accounting');
var parseWith = function(string){
	return string.split(',');
};

var addTransaction = function addTransaction(req,res){
	var dataTransaction = req.body.transInfo;
    var userid = req.session.userId;

    Transaction.createTransaction(dataTransaction,userid,function(status){
        if(status) res.send({error:0, msg:"transaction_add_success"});
        else res.send({error:1, msg:"transaction_add_error"});
    })
};

var appUpdate = function(req, res){
    var newData = req.body.transInfo;
    var transId = req.body.transInfo._id;
    delete newData._id;
    var userid = req.session.userId;

    Permission.checkWritePermission(userid, newData.account, function (result) {
        if (result === 1) {
            Transaction.editTransaction(newData, transId, userid, function (status) {
                if (status) res.send({error: 0, msg: "transaction_update_success"});
                else res.send({error: 1, msg: "transaction_update_error"});
            });
        } else res.send({"error": 2, "msg": "permission_error"});
    });
};

var listTransaction = function listTransaction(req, res){
	var accInfo = req.body.accInfo;
	var accId = accInfo._id;
    var time = req.body.time;
	var startDate = utils.convertDate(time.start);
	var endDate = utils.convertDate(time.end);

	Transaction.getTransactionByDateRange(accId, startDate, endDate, function(err, transactions){
		if(err) res.send(utils.msgError('get_transaction_error'));
		else {
			if(!startDate) startDate = new Date();
			if(!endDate) endDate = new Date();

			var dateRange = {startDate: moment(startDate).format(dateFormat), endDate: moment(endDate).format(dateFormat)};
			if(transactions.length === 0){
				res.send(utils.msgSuccess('cashbook_no_data', {daterange: dateRange, transactions: []}));
			} else {
				res.send(utils.msgSuccess('get_transaction_success', {daterange: dateRange, transactions: transactions}));
			}
		}
	});
};


var transactionInfo = function(req, res){
	var shareId = req.params.transaction;

	if(shareId){
		var decimalSeparator = [{decimal: '.', thousand: ','},{decimal: ',', thousand: '.'}];
		ShareTransaction.findOne({_id: shareId})
		.populate('owner', 'settings')
		.lean(true)
		.exec(function(err, share){
			if(err || !share){
				res.send(404);
			} else {
				// var lang = share.owner.settings.setting_lang || 'en';
				// console.log(lang);
				// moment.lang(lang);
				var amount = utils.amountFormat(share.amount, {s: share.currency.symbol, t: share.currency.type}, share.owner.settings.setting_amount_display);
				res.render('app/newTransaction', {
					transaction: share,
					amount: amount,
					parseIcon: utils.parseIcon,
					parseCampaign: utils.parseCampaign
				}, function(err, html){
					res.send(html);
				});
			}
		});
	} else {
		res.redirect('/missing');
	}
};

var appDelete = function(req, res){
    var rqst = req.body.transInfo;
    var ssUser = req.session.userId;

    Permission.checkWritePermission(ssUser, rqst.account, function (result) {
        if (result === 1) {
            Transaction.deleteTransaction(rqst._id, ssUser, function (status) {
                if (status) {
                    res.send({"error": 0, "msg": "transaction_delete_success"});
                } else {
                    res.send({"error": 1, "msg": "transaction_delete_error"});
                }
            })
        } else {
            res.send({"error": 2, "msg": "permission_error"});
        }
    });
};

module.exports = function(app, config){
	app.get('/transaction', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/transaction/add', function(req,res){res.redirect('https://web.moneylover.me')});
	app.get('/p/transaction/:transaction', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/transaction/add', function(req,res){res.redirect('https://web.moneylover.me')});
	app.post('/api/transaction/list', function(req,res){res.redirect('https://web.moneylover.me')});
    app.post('/api/transaction/delete', function(req,res){res.redirect('https://web.moneylover.me')});
    app.post('/api/transaction/update', function(req,res){res.redirect('https://web.moneylover.me')});
};