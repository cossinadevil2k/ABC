

'use strict';
const env = 'production';

let mongoose = require('mongoose');
const LogDb = require('../../model/helper/mongodb_connect_logs');
let Account = mongoose.model('Account');
let Budget = mongoose.model('Budget');
let Campaign = mongoose.model('Campaign');
let Category = mongoose.model('Category');
let Transaction = mongoose.model('Transaction');
let User = mongoose.model('User');
let SaleLog = LogDb.model('SaleLog')
let Device = mongoose.model('Device');
let Receipt = mongoose.model('Receipt');
let FinsifyServiceProvider = mongoose.model('Provider');
let async = require('async');
let walletBalanceCalculator = require('../../helper/wallet-balance');
const Request = require('request');
const config = require('../../config/config')[env];

const FINSIFYBASEURL = config.finsifyBaseUrl;
const FINSIFYCLIENTID = config.clientFinsify;
const FINSIFYSERVICESECRET = config.secretFinsify;
const HOOK_FINSIFY = config.hookFinsifyUrl;

function requestFinsifyServer(loginSecret, callback) {
    let opstions = {
        url: FINSIFYBASEURL + '/login/activate',
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'charset': 'utf-8',
            'Client-id': FINSIFYCLIENTID,
            'App-secret': FINSIFYSERVICESECRET,
            'Login-secret': loginSecret
        },
        body: {

        }
    };

    requestFunc(opstions)
        .then(function (data) {
            callback(null, data);
        }).catch(function (error) {
            callback(error, null);
        });
}

function requestFunc(options) {
    return new Promise((resolve, reject) => {
        Request({ url: options.url, method: options.method, headers: options.headers, form: options.body }, (err, response, body) => {
            if (err) {
                return reject(err);
            } else
                resolve(body);
        });
    });
};

function getFinsifyServiceIconUrl(serviceId, cb) {
    FinsifyServiceProvider.findOne({ realId: serviceId }, (err, service) => {
        if (err) {
            return cb(err);
        }

        if (!service) {
            return cb();
        }

        cb(null, service.icon)
    });
}

function getLinkedWalletIcon(walletList, cb) {
    let output = [];

    async.eachSeries(walletList, (wallet, callback) => {
        if (!wallet.account_type) {
            output.push(wallet);
            return callback();
        }

        if (!wallet.metadata) {
            output.push(wallet);
            return callback();
        }

        try {
            let metadata = JSON.parse(wallet.metadata);

            getFinsifyServiceIconUrl(metadata.service_id, (err, iconUrl) => {
                if (err) {
                    return callback(err);
                }

                if (!iconUrl) {
                    output.push(wallet);
                    return callback();
                }

                wallet.iconUrl = iconUrl;
                output.push(wallet);

                callback();
            });
        } catch (e) {
            // console.log(e);
            output.push(wallet);
            return callback();
        }

    }, error => {
        if (error) {
            return cb(error);
        }

        cb(null, output);
    });
}

let checkAdmin = function (req, res, next) {
    if (req.session.adminId) {
        next();
    } else {
        res.send("Uh oh! Permission Error!");
    }
};

let infoEmail = function (req, res) {
    let email = req.params.email.toLowerCase();

    User.findOne({ email: email }, '-__v -tokenDevice -salt -hashed_password', function (err, data) {
        if (err) res.send(err);
        else res.send(data);
    });
};

let infoAccount = function (req, res) {
    Account.find({ listUser: req.params.owner })
        //.populate('listUser')
        .select('-__v')
        .lean(true)
        .exec(function (err, data) {
            if (err) {
                return res.send(err);
            }

            if (!data || data.length === 0) {
                return res.send(data);
            }

            getLinkedWalletIcon(data, (err, result) => {
                return err ? res.send(err) : res.send(result);
            });
        });
};
let infoBudg = function (req, res) {
    Budget.find({ account: req.params.account })
        .select('-__v')
        .sort('-createdAt')
        .exec(function (err, data) {
            if (err) res.send(err);
            else res.send(data);
        });
};
let infoCate = function (req, res) {
    Category.find({ account: req.params.account })
        .select('-__v')
        .sort('-createdAt')
        .exec(function (err, data) {
            if (err) res.send(err);
            else res.send(data);
        });
};
let infoCamp = function (req, res) {
    Campaign.find({ account: req.params.account })
        .select('-__v')
        .sort('-createdAt')
        .exec(function (err, data) {
            if (err) res.send(err);
            else res.send(data);
        });
};
let infoTran = function (req, res) {
    let page = req.query.page;
    let skip = 0;

    if (page) skip = (page - 1) * 200;
    else skip = 0;

    Transaction.find({ account: req.params.account })
        .select('-__v')
        .skip(skip)
        .limit(200)
        .sort('-displayDate')
        .lean(true)
        .exec(function (err, data) {
            if (err) res.send(err);
            else res.send(data);
        });
};

let countTran = function (req, res) {
    async.parallel({
        totalRc: function (callback) {
            Transaction.count({ account: req.params.account }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        },
        deletedRc: function (callback) {
            Transaction.count({ account: req.params.account, isDelete: true }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        }
    }, function (err, data) {
        if (!err) res.send(data);
        else res.send({ error: true, msg: "transaction counting error" });
    });

};

let countCate = function (req, res) {
    async.parallel({
        totalRc: function (callback) {
            Category.count({ account: req.params.account }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        },
        deletedRc: function (callback) {
            Category.count({ account: req.params.account, isDelete: true }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        }
    }, function (err, data) {
        if (!err) res.send(data);
        else res.send({ error: true, msg: "Category counting error" });
    });
};

let countBudg = function (req, res) {
    async.parallel({
        totalRc: function (callback) {
            Budget.count({ account: req.params.account }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        },
        deletedRc: function (callback) {
            Budget.count({ account: req.params.account, isDelete: true }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        }
    }, function (err, data) {
        if (!err) res.send(data);
        else res.send({ error: true, msg: "Budget counting error" });
    });
};

let countCamp = function (req, res) {
    async.parallel({
        totalRc: function (callback) {
            Campaign.count({ account: req.params.account }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        },
        deletedRc: function (callback) {
            Campaign.count({ account: req.params.account, isDelete: true }, function (err, data) {
                if (!err) callback(null, data);
                else callback(true, null);
            });
        }
    }, function (err, data) {
        if (!err) res.send(data);
        else res.send({ error: true, msg: "Campaign counting error" });
    });
};

let infoDevice = function (req, res) {
    let owner = req.params.owner;
    Device.findByUser(owner, function (data) {
        if (data) res.json(data);
        else res.json([]);
    })
};

let infoTranById = function (req, res) {
    let id = req.params.transId;
    Transaction.findById(id, function (err, data) {
        if (err) res.send(err);
        else {
            if (!data) res.send({ result: "No Data" });
            else res.send(data);
        }
    });
};

let infoCateById = function (req, res) {
    let id = req.params.cateId;
    Category.findById(id, function (err, data) {
        if (err) res.send(err);
        else {
            if (!data) res.send({ result: "No Data" });
            else res.send(data);
        }
    })
};

let infoWalletById = function (req, res) {
    let id = req.params.walletId;
    Account.findById(id, function (err, data) {
        if (err) res.send(err);
        else {
            if (!data) res.send({ result: "No Data" });
            else res.send(data);
        }
    });
};
let infoUserByBillId = function(req,res) {
    let BillId = req.params.BillId;
    // SaleLog
    //     .findOne({ bill_id: BillId })
    //     .populate('user')
    //     .exec(function(err, data){
    //         if(err) res.send(err)
    //         else {
    //             if(!data) res.send({result: "No Data"})
    //             else res.send(data)
    //         }
    //     })
    SaleLog
        .findOne({bill_id: BillId}, function(err, data){
            if(err)  res.send(err)
            else {
                if(!data) res.send({result: "No Data from SaleLog collection !"})
                else {
                    User.findOne({_id: data.user}, function(err, result){
                        if(err) res.send(err)
                        else {
                            if(!result) res.send({result: "No data from User collection !"})
                            else res.send(result)
                        }
                    })
                }
            }
        })

};

let getUserById = function (req, res) {
    let userId = req.body.userId;
    if (userId) {
        User.findById(userId, function (err, user) {
            if (err) res.send(err);
            else {
                if (!user) res.send({ result: "No Data" });
                else res.send(user);
            }
        })
    } else res.send({ result: "No Data" });
};

let infoTranByCate = function (req, res) {
    Transaction.find({ category: req.params.category })
        .sort('-displayDate')
        .lean(true)
        .exec(function (err, data) {
            if (err) res.send(err);
            else res.send(data);
        });
};

let walletByLoginId = function (req, res) {
    let loginId = req.body.loginId;

    if (!loginId) {
        return res.json({ error: 'ParamInvalid' });
    }

    Account.findByRemoteWalletLoginId(loginId, function (err, result) {
        if (err) {
            res.json({ error: err });
        } else {
            res.json(result);
        }
    });
};

let getDeviceByDid = function (req, res) {
    let did = req.body.did;

    if (!did) return res.json({ s: false });

    Device.find({ deviceId: did })
        .populate('owner')
        .exec((err, devices) => {
            if (err) return res.json({ s: false });

            res.json({ s: true, d: devices });
        });
};

let walletBalance = function (req, res) {
    let walletIdList = req.body.wallets;

    if (!walletIdList || walletIdList.length === 0) {
        return res.json({ s: false });
    }

    let results = {};
    let future_included = true;

    async.eachSeries(walletIdList, (wallet_id, cb) => {
        walletBalanceCalculator(wallet_id, future_included, Account, Transaction)
            .then((data) => {
                results[wallet_id] = data;
                cb();
            })
            .catch(cb);
    }, (error) => {
        if (error) return res.json({ s: false });

        res.json({ s: true, d: results });
    });
};

let infoGlobalCamp = function (req, res) {
    let user_id = req.body.user;

    if (!user_id) {
        return res.json({ s: false });
    }

    let query = {
        account: null,
        owner: user_id,
        isDelete: false
    };

    Campaign.find(query)
        .sort('-updateAt')
        .exec((err, data) => {
            if (err) {
                return res.json({ s: false });
            }

            res.json({ s: true, d: data });
        });
};

let infoReceipt = function (req, res) {
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 50;
    let user_id = req.body.user;

    if (!user_id) {
        return res.json({ s: false });
    }

    Receipt.findByUser(user_id, skip, limit, (err, data) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: data });
    });
};

let appFixFinsifyManual = function (req, res) {
    let userId = req.body.user;

    if (!userId) {
        return res.json({
            status: false
        })
    }

    let walletsFinsify = [];

    async.series({
        getWalletSecret: function (callback) {
            Account.find({
                owner: userId,
                account_type: 2
            }, function (err, wallets) {
                if (err) {
                    callback(err, null);
                } else {
                    if (wallets.length > 0) {
                        wallets.forEach((wallet) => {
                            walletsFinsify.push(wallet.rwInfo.secret);
                        });
                        callback(null, null);
                    } else {
                        callback(null, null);
                    }
                }
            });
        },
        reactive: function (callback) {
            if (walletsFinsify.length > 0) {
                async.eachSeries(walletsFinsify, function (wallet, cb) {
                    requestFinsifyServer(wallet, cb);
                }, callback);
            } else {
                callback();
            }
        }
    }, function (err, result) {
        if (err) {
            res.json({
                status: false,
                message: err
            })
        } else {
            res.json({
                status: true
            })
        }
    });
}

let appFetchFinsifyTransactionManual = function (req, res) {
    let loginSecret = req.body.login_secret;
    let timestamp = req.body.timestamp;

    if (!loginSecret) {
        return res.json({
            status: false,
            message: 'invaild params'
        })
    }

    let opstions = {
        url: FINSIFYBASEURL + '/login/refresh',
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'charset': 'utf-8',
            'Client-id': FINSIFYCLIENTID,
            'App-secret': FINSIFYSERVICESECRET,
            'Login-secret': loginSecret
        },
        body: {
            // login_id: loginId,
            // timestamp: timestamp
        }
    };

    requestFunc(opstions)
        .then(function (data) {
            return res.json({
                status: true,
                data: data
            })
        }).catch(function (error) {
            return res.json({
                status: false,
                message: error
            })
        });
}

module.exports = function (app, config) {
    app.get('/find', staticsMain);

    app.use(checkAdmin);

    app.get('/info/user/:email', infoEmail);
    app.get('/info/acc/:owner', infoAccount);
    app.get('/info/budg/:account', infoBudg);
    app.get('/info/cate/:account', infoCate);
    app.get('/info/camp/:account', infoCamp);
    app.get('/info/tran/:account', infoTran);
    app.get('/info/tran-by-cate/:category', infoTranByCate);
    app.get('/info/device/:owner', infoDevice);
    app.get('/info/tran-by-id/:transId', infoTranById);
    app.get('/info/cate-by-id/:cateId', infoCateById);
    app.get('/info/wallet-by-id/:walletId', infoWalletById);
    app.get('/info/find-user-by-bill/:BillId', infoUserByBillId)
    app.post('/info/user', getUserById);
    app.post('/info/device', getDeviceByDid);
    app.post('/info/global-camp', infoGlobalCamp);
    app.post('/info/receipt', infoReceipt);
    //counter
    app.get('/info/tran/:account/count', countTran);
    app.get('/info/cate/:account/count', countCate);
    app.get('/info/budg/:account/count', countBudg);
    app.get('/info/camp/:account/count', countCamp);
    app.post('/info/wallet-by-login-id', walletByLoginId);
    app.post('/info/wallet-balance', walletBalance);

    app.post('/finsify/reactive-manual', appFixFinsifyManual);
    app.post('/finsify/fetch-transaction-manual', appFetchFinsifyTransactionManual);
};
