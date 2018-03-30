var mongoose = require('mongoose');
var Permission = require('../../model/permission');
var User = mongoose.model('User');
var Account = mongoose.model('Account');
var Transaction = mongoose.model('Transaction');
var async = require('async');
var moment = require('moment');

/*****Functions*****/
function getListUser(wallet_id, callback){
    //callback(err, [{email: String, isOwner: Boolean}])
    Account.findById(wallet_id)
        .select('listUser owner')
        .populate('listUser owner')
        .exec(function(err, walletInfo){
            if (err) callback(err);
            else callback(null, handleWalletInfo(walletInfo));
        })
}

function handleWalletInfo(walletInfo){
    var output = [];
    for (var i = 0; i < walletInfo.listUser.length; i++) {
        var data = {
            _id: walletInfo.listUser[i]._id.toString(),
            email: walletInfo.listUser[i].email
        };
        if (walletInfo.listUser[i]._id.toString() === walletInfo.owner._id.toString()) data.isOwner = true;
        output.push(data);
    }
    return output;
}

function checkMultipleUserPermission(list_user, wallet_id, callback){
    var output = list_user;
    async.eachSeries(output, function(user, cb){
        checkWalletPermission(user._id, wallet_id, function(err, result){
            if (err) cb(err);
            else {
                user.read = result.read;
                user.write = result.write;
                cb();
            }
        })
    }, function(error){
        if (error) callback(error);
        else callback(null, output);
    })
}

function checkWalletPermission(user_id, wallet_id, callback){
    //callback(err, {read: Boolean, write: Boolean}
    async.parallel({
        read: function(cb){
            Permission.checkReadPermission(user_id, wallet_id, cb);
        },
        write: function(cb){
            Permission.checkWritePermission(user_id, wallet_id, cb);
        }
    }, function(err, result){
        if (err) callback(err);
        else callback(null, result);
    })
}

function getTransactionTimeRange(walletId, callback){
    async.parallel({
        first: function(cb){
            Transaction.findOne({account: walletId})
                .sort({createdAt: 1})
                .exec(function(e, t){
                    if(e) cb(e);
                    else if (!t) cb(null, null);
                    else cb(null, t.createdAt)
                });
        },
        last: function(cb){
            Transaction.findOne({account: walletId})
                .sort({createdAt: -1})
                .exec(function(e, t){
                    if (e) cb(e);
                    else if (!t) cb(null, null);
                    else cb(null, t.createdAt);
                });
        }
    }, callback);
}

function countTransaction(time_range, wallet_id, callback){
    async.series({
        add: function(cb){
            countAddTransaction(time_range, wallet_id, cb);
        },
        delete: function(cb){
            countDeleteTransaction(time_range, wallet_id, cb);
        }
    }, function(err, result){
        callback(err, result);
    });
}

function countAddTransaction(time_range, wallet_id, callback){
    Transaction.aggregate(
        {
            $match: {
                'createdAt': {$gte: time_range.first, $lte: time_range.last},
                'account': wallet_id
            }
        },
        {
            $group: {
                _id: {
                    year: { $year : "$createdAt" },
                    month: { $month : "$createdAt" },
                    days: { $dayOfMonth : "$createdAt" }
                },
                total: {
                    $sum: 1
                }
            }
        },
        {
            $group : {
                _id : {
                    year: "$_id.year",
                    month: "$_id.month"
                },
                stats: {
                    $push: {
                        ngay: '$_id.days',
                        count: "$total"
                    }
                }
            }
        },
        callback
    )
}

function countDeleteTransaction(time_range, wallet_id, callback){
    Transaction.aggregate(
        {
            $match: {
                'updateAt': {$gte: time_range.first, $lte: time_range.last},
                'account': wallet_id,
                'isDelete': true
            }
        },
        {
            $group: {
                _id: {
                    year: { $year : "$updateAt" },
                    month: { $month : "$updateAt" },
                    days: { $dayOfMonth : "$updateAt" }
                },
                total: {
                    $sum: 1
                }
            }
        },
        {
            $group : {
                _id : {
                    year: "$_id.year",
                    month: "$_id.month"
                },
                stats: {
                    $push: {
                        ngay: '$_id.days',
                        count: "$total"
                    }
                }
            }
        },
        callback
    )
}

function countTotalCreateTransaction(wallet_id, callback){
    Transaction.count({account: wallet_id}, callback);
}

function countTotalDeleteTransaction(wallet_id, callback){
    Transaction.count({account: wallet_id, isDelete: true}, callback);
}

/*****Executes*****/

var appCheckPermission = function(req, res){
    var walletId = req.body.walletId;

    if (!walletId) return res.json({s: false});

    async.waterfall([
        function(callback){
            getListUser(walletId, function(err, list){
                if (err) callback(err);
                else callback(null, list);
            });
        },
        function(list_user, callback){
            checkMultipleUserPermission(list_user, walletId, function(err, result){
                if (err) callback(err);
                else callback(null, result);
            })
        }
    ], function(err, result){
        if (err) {
            res.json({s: false});
        } else res.json({s: true, d: result});
    });

};

var appCountTransaction = function(req, res){
    var walletId = req.body.walletId;

    if (!walletId) return res.send({s: false});

    async.waterfall([
        function(callback){
            //get first day & last day of transaction
            getTransactionTimeRange(walletId, function(err, data){
                if (err) callback(err);
                else if (!data) callback('no_transaction');
                else callback(null, data);
            })
        },
        function(time_range, callback) {
            countTransaction(time_range, walletId, function(err, result){
                if (err) callback(err);
                else callback(null, result, time_range);
            });
        },
        function(data, time_range, callback){
            countTotalCreateTransaction(walletId, function(err, count){
                if (err) callback(err);
                else {
                    data.totalAdd = count;
                    callback(null, data, time_range);
                }
            })
        },
        function(data, time_range, callback){
            countTotalDeleteTransaction(walletId, function(err, count) {
                if (err) callback(err);
                else {
                    data.totalDelete = count;
                    data.time_range = time_range;
                    callback(null, data);
                }
            })
        }
    ], function(err, result){
        if (err) {
            if (err === 'no_transaction') res.send({s: true});
            else res.send({s: false});
        }
        else res.send({s: true, d: result});
    });
};

var appWalletInfo = function(req, res){
    var walletId = req.body.walletId;

    if (!walletId) return res.send({s: false});

    Account.findById(walletId)
        .lean()
        .exec(function(err, wallet){
            if (err) res.send({s: false});
            else res.send({s: true, d: wallet});
        })
};

module.exports = function(app, config){
    app.get('/wallet-diagnosis', staticsMain);
    app.post('/wallet-diagnosis/wallet-info', appWalletInfo);
    app.post('/wallet-diagnosis/wallet-permission', appCheckPermission);
    app.post('/wallet-diagnosis/transaction-count', appCountTransaction);
};