'use strict';

let env = process.env.NODE_ENV;

let mongoose = require("mongoose");
let oauthDbProduction = require('../../model/helper/mongodb_connect_oauth');
let oauthDbSandbox = require('../../model/helper/mongodb_connect_sandbox').oauthDb;
let config = require('../../config/config')[env];
let validate = require('../../helper/validators');
let async = require('async');
let path = require('path');
// let logger = require(path.join(__dirname, '../', 'logs/logger.js'))();
let registerDeveloperML = mongoose.model('registerDevML');
let clientKey = oauthDbProduction.model('ClientKey');
let sandboxClientKey = oauthDbSandbox.model('ClientKey');
let BackendNotification = mongoose.model('BackendNotification');
let Administrator = mongoose.model('Administrator');
let hook = require('../routes/hook');

let RULES = {
    PARTNER: 2
};

let STATUS_MODE = {
    ALL: -1,
    PENDING: 0,
    ACCEPTED: 1,
    DENIED: 2
};

let isNew = false;
let status = null;
/* UTIlS FUNCTIONS */

function enDisable(keys, callback) {
    if (keys.product || keys.sandbox) {
        // partner cu, enable/disable parner nay
        if (status == true) {
            // enable
            async.series({
                enableProduct: function (cb) {
                    if (keys.product) {
                        clientKey.enableClientByClient(keys.product, cb);
                    } else {
                        cb();
                    }
                },
                enableSandbox: function (cb) {
                    if (keys.sandbox) {
                        sandboxClientKey.findOneAndUpdate({ api: keys.sandbox }, { isDisabled: false }, cb);
                    } else {
                        cb();
                    }
                }
            }, callback);

        } else {
            //disable
            async.series({
                disableProduct: function (cb) {
                    if (keys.product) {
                        clientKey.disableClientByClient(keys.product, cb);
                    } else {
                        cb();
                    }
                },
                disableSandbox: function (cb) {
                    if (keys.sandbox) {
                        sandboxClientKey.findOneAndUpdate({ api: keys.sandbox }, { isDisabled: true }, cb);
                    } else {
                        cb();
                    }
                }
            }, callback);
        }
    } else {
        // dang ky cho partner moi
        isNew = true;
        callback();
    }
}

/* */

let createOpenApiRequest = function (req, res) {
    let data = req.query;

    let partnerName = data.partnerName;
    let email = data.email;
    let reason = data.reason;
    let scale = data.scale;

    let msg = 'Has a new partner register with email is ' + email;

    if (!partnerName || !email || !reason || !scale) {
        return res.jsonp({
            status: false,
            message: 'input is empty'
        });
    }

    if (!validate.isEmail(email)) {
        return res.jsonp({
            status: false,
            message: 'email format inavild'
        });
    }

    if (!validate.isString(partnerName) || !validate.isString(reason) || !validate.isString(scale)) {
        return res.jsonp({
            status: false,
            message: 'input is invaild'
        });
    }

    let objOpenApi = {
        'partnerName': partnerName,
        'email': email,
        'reason': reason,
        'scale': scale
    };

    let callback = (err, result) => {
        // res.jsonp({ status: !err });
        if (err) {
            res.jsonp({
                status: false,
                message: err
            });
        } else {
            res.jsonp({
                status: true
            });
        }
    };

    let isExist = false;
    let adminList = [];

    async.series({
        checkExist: function (cb) {
            registerDeveloperML.checkEmailExist(email, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    if (result) {
                        isExist = true;
                    }
                    cb();
                }
            });
        },
        create: function (cb) {
            if (!isExist) {
                registerDeveloperML.create(objOpenApi, cb);
            } else {
                cb('Email exist!');
            }
        },
        findAdmin: function (cb) {
            Administrator.find({ isAdminSystem: true }, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    if (result.length > 0) {
                        result.forEach(admin => {
                            adminList.push(admin._id);
                        });
                    }
                    cb();
                }
            });
        },
        pushNoti: function (cb) {
            if (adminList.length > 0) {
                async.eachSeries(adminList, function (adminId, next) {
                    BackendNotification.addNew(adminId, 'backend_push', msg, '/register_dev_ml', function (error, result) {
                        if (result) hook.pushBackendNotification(result._id, next);
                    });
                }, function (error) {
                    cb();
                });
            } else {
                cb();
            }
        }
    }, callback)
};

let getAll = function (req, res) {
    let data = req.body;

    if (!data.page || !data.perPage) {
        return res.json({
            status: false,
            message: 'page & perPage params is required'
        });
    }

    let callback = (err, result) => {
        if (err) {
            // logger.log('error', '[ROUTES]/register_dev_ml/browse' + JSON.stringify(err));
            res.json({
                status: false,
                message: 'get all failed'
            });

        } else {
            let totalPage = Math.ceil(result.count / data.perPage);

            res.json({
                status: !err,
                data: result.getAll,
                next_page: data.page < totalPage ? data.page + 1 : null,
                pre_page: data.page - 1 == 0 ? null : data.page - 1,
                totalItem: result.getAll.length,
                totalPage: totalPage
            });
        }
    };
    async.series({
        count: function (done) {
            registerDeveloperML.countTotal(done);
        },
        getAll: function (done) {
            registerDeveloperML.getAll(data, done);
        }
    }, callback);

};

let acceptRefusePartner = function (req, res) {
    let data = req.body;
    let api_key = null;
    let secret = null;
    let partnerName = null;

    if (!data._id && !data.flag) {
        return res.json({
            status: false,
            message: 'input is empty'
        });
    }

    let condition = {
        _id: data._id
    };

    if (data.flag) {
        status = STATUS_MODE.ACCEPTED;
    } else {
        status = STATUS_MODE.DENIED;
    }

    let updateData = {
        status: status
    };

    let options = { new: true };

    let callback = (err, result) => {
        // if (err) {
        //     logger.log('error', '[ROUTES]/register_dev_ml/update' + JSON.stringify(err));
        // }

        res.json({
            status: !err
        });
    };

    function checkClientExistAndDisableClientKey(done) {
        registerDeveloperML.findByPartnerId(data._id, function (error, result) {
            if (error) {
                done(error, null);
            } else {
                let keys = {};
                partnerName = result.partnerName;

                // neu co api_key tuc la partner nay da tung duoc appcet
                if (result.keys.production) {
                    keys.product = result.keys.production.api;
                }

                if (result.keys.sandbox) {
                    keys.sandbox = result.keys.sandbox.api
                }

                enDisable(keys, done);
            }
        });
    };

    function addClientKey(done) {
        if (!isNew || !partnerName || updateData.status !== STATUS_MODE.ACCEPTED) {
            return done();
        }

        if (!updateData.keys) updateData.keys = {};

        // approve
        async.series([
            function (cb) {
                clientKey.addClient({
                    name: partnerName,
                    platform: '',
                    rule: RULES.PARTNER
                }, function (error, result) {
                    if (error) {
                        return cb(error);
                    }

                    updateData.keys.production = {
                        api: result.client,
                        secret: result.secret
                    }

                    cb();
                });
            },
            function (cb) {
                if (env !== 'production') {
                    return cb();
                }

                sandboxClientKey.addClient({
                    name: partnerName,
                    platform: '',
                    rule: RULES.PARTNER
                }, function (error, result) {
                    if (error) {
                        return cb(error);
                    }

                    updateData.keys.sandbox = {
                        api: result.client,
                        secret: result.secret
                    }

                    cb();
                });
            }
        ], done);
    }

    function updateOrDelete(done) {
        if (status === STATUS_MODE.ACCEPTED) {
            registerDeveloperML.updateRecord(condition, updateData, options, done);
        } else if (status === STATUS_MODE.DENIED) {
            registerDeveloperML.deleteRecord(data._id, done);
        }
    };

    async.series({
        checkClientExistAndDisableClientKey,
        addClientKey,
        updateOrDelete
    }, callback);

};

let filterPartner = function (req, res) {
    let data = req.body;

    if (!data.type) {
        return res.json({
            status: false,
            message: 'input is empty'
        });
    }

    if (typeof data.type !== 'string') {
        return res.json({
            status: false,
            message: 'invaild param'
        });
    }


    let callback = (err, result) => {
        // if (err) {
        //     logger.log('error', '[ROUTES]/register_dev_ml/filter' + JSON.stringify(err));
        // }

        res.json({
            status: !err,
            data: result
        });
    };

    let condition = {
        status: parseInt(data.type)
    }

    if (data.type == STATUS_MODE.ALL) {
        condition = {};
    }

    registerDeveloperML.findByStatus(condition, callback);
};

module.exports = function (app, config) {
    app.get('/register_dev_ml', staticsMain);
    app.get('/register_dev_ml/*', staticsMain);

    app.get('/jsonp/register_dev_ml/create', createOpenApiRequest);
    app.post('/api/register_dev_ml/browse', getAll);
    app.post('/api/register_dev_ml/accept', acceptRefusePartner);
    app.post('/api/register_dev_ml/filter', filterPartner);
};
