/*
	Transaction
*/

'use strict';
var mongoose = require('mongoose');
var Transaction = mongoose.model('Transaction');
var Permission = require('../../model/permission');
var Account	= mongoose.model('Account');
var ShareTransaction = mongoose.model('transactionShare');
var utils = require('../../helper/utils');
var Hook = require('../../model/sync/newhook');
var moment = require('moment');
var dateFormat = 'YYYY-MM-DD';
var accounting = require('accounting');
var parseWith = function(string){
	return string.split(',');
};
var pushController = require('../../model/sync/push_controller');
var SyncCodes = require('../../config/sync_codes');
var RequestActions = require('./actions');

var addTransaction = function (req,res){
	var dataTransaction = JSON.parse(req.body.transInfo);
    dataTransaction.tokenDevice = "web";
    var userid = req.session.userId;
    var walletid = dataTransaction.account;

    Transaction.createTransaction(dataTransaction,userid,function(status){
        if(status) {
            sendNoti(userid, walletid);
            res.send({error:0, msg:"transaction_add_success", action: RequestActions.transaction_create});
        }
        else res.send({error:1, msg:"transaction_add_error"});
    })
};

var appUpdate = function(req, res){
    var newData = JSON.parse(req.body.transInfo);
    newData.tokenDevice = 'web';
    var transId = newData._id;
    delete newData._id;
    var userid = req.session.userId;
    var walletid = newData.account;

    Permission.checkWritePermission(userid, walletid, function (result) {
        if (result === 1) {
            Transaction.editTransaction(newData, transId, userid, function (status) {
                if (status) {
                    sendNoti(userid, walletid);
                    res.send({
                        error: 0,
                        msg: "transaction_update_success",
                        action: RequestActions.transaction_edit
                    });
                } else {
                    res.send({
                        error: 1,
                        msg: "transaction_update_error",
                        action: RequestActions.transaction_edit
                    });
                }
            });
        } else {
            res.send({
                "error": 2,
                "msg": "permission_error",
                "action": RequestActions.transaction_edit
            });
        }
    });
};

var listTransaction = function listTransaction(req, res){
    var walletId = req.body.walletId;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var handler = function (err, transactions) {
        if (err) res.send(utils.msgError('get_transaction_error'));
        else {
            if (!startDate) startDate = new Date();
            if (!endDate) endDate = new Date();

            var dateRange = {startDate: moment(startDate).format(dateFormat), endDate: moment(endDate).format(dateFormat)};
            if (transactions.length === 0) {
                res.send({
                    error: 0,
                    msg: 'cashbook_no_data',
                    data: {daterange: dateRange, transactions: []},
                    action: RequestActions.transaction_list
                });
            } else {
                res.send({
                    error: 0,
                    msg: 'get_transaction_success',
                    data: {daterange: dateRange, transactions: transactions},
                    action: RequestActions.transaction_list
                })
            }
        }
    };

    if(walletId === 'all'){
        var user_id = req.session.userId;

        Account.getAccountListByUserId(user_id, function(data){
            var listAccount = [];
            data.forEach(function(item){
                listAccount.push(item._id);
            });

            Transaction.getTransactionByDateRange(listAccount, startDate, endDate, handler);
        });
    } else {
        Transaction.getTransactionByDateRange(walletId, startDate, endDate, handler);
    }
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
    var rqst = JSON.parse(req.body.transInfo);
    var ssUser = req.session.userId;
    var walletid = rqst.account;

    Permission.checkWritePermission(ssUser, rqst.account, function (result) {
        if (result === 1) {
            Transaction.deleteTransaction(rqst._id, ssUser, function (status) {
                if (status) {
                    sendNoti(ssUser, walletid);
                    res.send({
                        error: 0,
                        msg: "transaction_delete_success",
                        action: RequestActions.transaction_delete
                    });
                } else {
                    res.send({
                        error: 1,
                        msg: "transaction_delete_error",
                        action: RequestActions.transaction_delete
                    });
                }
            })
        } else {
            res.send({
                error: 2,
                msg: "permission_error",
                action: RequestActions.transaction_delete
            });
        }
    });
};

var sendNoti = function(userId, walletId){
    let infoTr = {
        user_id: userId,
        wallet_id: walletId,
        flag: SyncCodes.TRANSACTION
    };

    let infoWl = {
        user_id: userId,
        wallet_id: walletId,
        flag: SyncCodes.WALLET
    };

    pushController.pushSyncNotification(infoWl)
        .then(function (){
            pushController.pushSyncNotification(infoTr);
        })
        .then(function () {

        })
        .catch(function (error){

        });
};


module.exports = function(app, config){
	app.get('/transaction', staticsMain2);
	app.get('/transaction/add', staticsMain);
	app.get('/p/transaction/:transaction', transactionInfo);
	app.post('/api/transaction/add', addTransaction);
	app.post('/api/transaction/list', listTransaction);
    app.post('/api/transaction/delete', appDelete);
    app.post('/api/transaction/update', appUpdate);
};