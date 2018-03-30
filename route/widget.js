/**
 * Created by cuongpham on 12/18/14.
 */

var env = process.env.NODE_ENV;
var mongoose = require('mongoose');
var Wallet = mongoose.model('Account');
var Campaign = mongoose.model('Campaign');
var Transaction = mongoose.model('Transaction');
var moment = require('moment');
var redisClient	= require('../config/database').redisClient;
var async = require('async');

function checkServerMaintain(req, res, next){
    if (global.isServerMaintain){
        return res.send(JSON.stringify({status: false, message: Error.SYNC_SERVER_MAINTAINCE}));
    }
    next();
}

var selectedCampaignField = '_id goal_amount icon name start_amount status type';
var selectedTransactionField = 'note account category amount displayDate with';
var selectedWalletField = '_id currency_id icon name exclude_total balance';

var twoDays = 2 * 24 * 60 * 60;
//var twoDays = 10;

var TYPE = {
    TRANSACTION: "transaction",
    INFO:"info"
};

var MODE = {
    WALLET: "wallet",
    EVENT: "event"
};

var setKey = function(mode, id, type){
    return 'widget-' + mode + '-' + id + '-' + type;
};

var getAllCampaignTransaction = function(event_id, callback){
    var whereCondition = {isDelete: false, campaign: event_id};

    Transaction.find(whereCondition)
        .populate('category', 'name icon type _id metadata')
        .populate('account', 'currency_id name')
        .select(selectedTransactionField)
        .sort('-displayDate category.type')
        .lean()
        .exec(callback);
};

var getAllWalletTransaction = function(wallet_id, callback){
    var whereCondition = {isDelete: false, account: wallet_id};

    Transaction.find(whereCondition)
        .populate('category', 'name icon type _id metadata')
        .populate('account', 'currency_id name')
        .select(selectedTransactionField)
        .sort('-displayDate category.type')
        .lean()
        .exec(callback);
};

var findWallet = function(id, callback){
    if (env === 'production'){
        Wallet.findOne({_id:id, isPublic: true}, selectedWalletField, callback);
    } else {
        Wallet.findOne({_id:id}, selectedWalletField, callback);
    }
};

var findEvent = function(id, callback){
    if(env === 'production'){
        Campaign.findOne({_id:id, isPublic: true}, selectedCampaignField, callback);
    }
    else {
        Campaign.findOne({_id:id}, selectedCampaignField, callback);
    }
};

var appGetWallet = function(req, res){
    var walletId = req.params.walletId;

    var findWalletResult = function(err, result){
        var obj = {};
        if(!err){
            if(!result){
                obj = {"status": true, "message":"wallet_not_found"};
            } else {
                obj = {"status": true, "data": result};
                redisClient.SETEX(keyInfo, twoDays, JSON.stringify(result));
            }
        } else {
            obj = {"status": false, "message":"get_wallet_failed"};
        }

        res.send(JSON.stringify(obj));
    };

    var keyInfo = setKey(MODE.WALLET, walletId, TYPE.INFO);

    redisClient.EXISTS(keyInfo, function(err, result){
        if(result){
            redisClient.GET(keyInfo, function(err, dataInfo){
                res.send('{"status": true, "data": ' + dataInfo + '}');
            });
        } else {
            findWallet(walletId, findWalletResult);
        }
    })

};

var appGetAllWalletTransaction = function(req, res){
    var walletId = req.params.walletId;

    var getTransactionResult = function(err, result){
        var obj = {};
        if(!err){
            if(result.length === 0){
                obj = {"status": true, "message":"transaction_not_found"};
            } else {
                obj = {"status": true, "data":{"transactions": result}};
            }
            redisClient.SETEX(keyTransaction, twoDays, JSON.stringify(result));
        } else {
            obj = {"status": false, "message":"get_transaction_failed"};
        }
        res.send(JSON.stringify(obj));
    };

    var findWalletResult = function(err, result){
        var obj = {};
        if(!err){
            if(!result){
                obj = {"status":true, "message":"wallet_not_found"};
                res.send(JSON.stringify(obj));
            } else {
                redisClient.SETEX(keyInfo, twoDays, JSON.stringify(result));

                redisClient.EXISTS(keyTransaction, function(err, hasTrans){
                    if(hasTrans){
                        redisClient.GET(keyTransaction, function(err2, dataTransaction){
                            res.send('{"status": true, "data": {"transactions": ' + dataTransaction + '}}');
                        });
                    } else {
                        getAllWalletTransaction(walletId, getTransactionResult);
                    }
                });
            }
        } else {
            obj = {"status": false, "message":"get_wallet_failed"};
            res.send(JSON.stringify(obj));
        }
    };

    var keyTransaction = setKey(MODE.WALLET, walletId, TYPE.TRANSACTION);
    var keyInfo = setKey(MODE.WALLET, walletId, TYPE.INFO);

    redisClient.EXISTS(keyInfo, function(err, result){
        if(result){
            redisClient.GET(keyInfo, function(err, dataInfo){
                findWalletResult(null, JSON.parse(dataInfo));
            });
        } else {
            findWallet(walletId, findWalletResult);
        }
    });

};

var appGetEvent = function(req, res){
    var eventId = req.params.eventId;
    var keyInfo = setKey(MODE.EVENT, eventId, TYPE.INFO);

    var findEventResult = function(err, result){
        var obj = {};
        if(!err){
            if(!result){
                obj = {"status": true, "message":"event_not_found"};
            } else {
                obj = {status: true, data:result};
                //redisClient.SETEX(keyInfo, twoDays, JSON.stringify(result));
            }
        } else {
            obj = {"status": false, "message":"get_event_failed"};
        }
        res.send(JSON.stringify(obj));
    };

    findEvent(eventId, findEventResult);

    //redisClient.EXISTS(keyInfo, function(err, result){
    //    if(result){
    //        redisClient.GET(keyInfo, function(err, dataInfo){
    //            res.send('{status: true, data:' + dataInfo + '}');
    //        });
    //    } else {
    //        findEvent(eventId, findEventResult);
    //    }
    //});

};

var appGetAllEventTransaction = function(req, res){
    var eventId = req.params.eventId;
    var keyInfo = setKey(MODE.EVENT, eventId, TYPE.INFO),
        keyTransaction = setKey(MODE.EVENT, eventId, TYPE.TRANSACTION);

    var getTransactionResult = function(err, result){
        var obj = {};
        if(!err){
            if(!result || result.length === 0){
                obj = {"status": true, "message":"transaction_not_found"};
            } else {
                obj = {"status": true, "data":{"transactions":result}};
            }
            //redisClient.SETEX(keyTransaction, twoDays, JSON.stringify(result));
        } else {
            obj = {"status": false, "message":"get_transaction_failed"};
        }
        res.send(JSON.stringify(obj));
    };

    var findEventResult = function(err, result){
        var obj = {};
        if(!err){
            if(!result){
                obj = {"status": true, "message":"event_not_found"};
                res.send(JSON.stringify(obj));
            } else {
                getAllCampaignTransaction(eventId, getTransactionResult);

                //redisClient.SETEX(keyInfo, twoDays, JSON.stringify(result));
                //redisClient.EXISTS(keyTransaction, function(err, hasTrans){
                //    if(hasTrans){
                //        redisClient.get(keyTransaction, function(err, dataTransaction){
                //            res.send('{status: true, data:{transactions:' + dataTransaction + '}}');
                //        });
                //    } else {
                //        getAllCampaignTransaction(eventId, getTransactionResult);
                //    }
                //});
            }
        } else {
            obj = {"status": false, "message":"get_event_failed"};
            res.send(JSON.stringify(obj));
        }
    };

    findEvent(eventId, findEventResult);
    //redisClient.EXISTS(keyInfo, function(err, result){
    //    if(result){
    //        redisClient.GET(keyInfo, function(err, dataInfo){
    //            findEventResult(null, JSON.parse(dataInfo));
    //        });
    //    } else {
    //        findEvent(eventId, findEventResult);
    //    }
    //});
};

module.exports = function(app, config){
    app.use(checkServerMaintain);

    app.get('/wallet/:walletId', appGetWallet);
    app.get('/wallet/:walletId/transaction/all', appGetAllWalletTransaction);
    app.get('/event/:eventId', appGetEvent);
    app.get('/event/:eventId/transaction/all', appGetAllEventTransaction);
};