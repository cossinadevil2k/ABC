'use strict';

let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let utils = require('../../helper/utils');
let hook = require('./hook');

let mongoose = require('mongoose');

let Provider = mongoose.model('Provider');
let WalletModel = mongoose.model('Account');
let ExtendRemoteWallet = mongoose.model('ExtendRemoteWallet');
let BackendNotification = mongoose.model('BackendNotification');
let User = mongoose.model('User');

let https = require('https');
let http = require('http');
let timeout = require('connect-timeout');
let async = require('async');
let fs = require('fs');
let formidable = require('formidable');

const file_extension_type = require('../../config/file_extension_type').type;

const filename = config.provider_cache;
const filename2 = config.root + '/landing-page/data/provider_cache_production.json';
const filename_extension = config.provider_extension_cache;

let SERVICE = {
    "saltedge": 1,
    "finsify": 2
};

let FINSIFY = {
    production: {
        host: 'assets.finsify.com',
        path: '/service.json'
    },
    dev: {
        host: 'assets.zoostd.com',
        path: '/service-beta.json'
    }
};

let SALTEDGE = {
    production: {
        host: 'www.saltedge.com',
        public_key: '2G_1atnpgmtfeA',
        secret_key: 'WURAEOJieIwOdg2-VhCIBOvKePzudp2JTejTojZP100'
    },
    dev: {
        host: 'www.saltedge.com',
        public_key: '2G_1atnpgmtfeA',
        secret_key: 'WURAEOJieIwOdg2-VhCIBOvKePzudp2JTejTojZP100'
    }
};

let finsifyOptions = (env === 'production') ? FINSIFY.production : FINSIFY.dev;
let saltEdgeOptions = (env === 'production') ? SALTEDGE.production : SALTEDGE.dev;

let providerActionRootUrl = config.root + '/app/public/data/rw-provider/';

let requestOption = {
    "SaltEdge": {
        host: saltEdgeOptions.host,
        port: 443,
        path: '/api/v2/providers',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Client-id': saltEdgeOptions.public_key,
            'App-secret': saltEdgeOptions.secret_key
        }
    },
    "Finsify": {
        host: finsifyOptions.host,
        port: 443,
        path: finsifyOptions.path,
        method: 'GET'
    }
};

function getFinsifyServiceIconUrl(serviceId, cb) {
    Provider.findOne({ realId: serviceId }, (err, service) => {
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
    }, error => {
        if (error) {
            return cb(error);
        }

        cb(null, output);
    });
}

function fetchFinsifyProvider(callback) {
    let request = https.request(requestOption["Finsify"], function (r) {
        r.setEncoding('utf8');
        let data = "";
        r.on('data', function (chunk) {
            data += chunk.toString();
        });
        r.on('end', function () {
            try {
                let parsedData = JSON.parse(data);
                saveToDB(parsedData.data, callback);
            } catch (e) {
                callback(e);
            }
        });
    });

    //perform request
    request.end();
}

function saveToDB(provider_list, callback) {
    async.eachSeries(provider_list, function (provider, cb) {
        Provider.findOne({ realId: provider.id }, function (e, result) {
            if (e) {
                return cb(e);
            }

            if (result) {
                result.updated_at = new Date();
                result.name = provider.name;
                result.code = provider.code;
                result.country_code = provider.country_code;
                result.icon = provider.media_path + provider.logo_file_name;
                result.hasBalance = provider.has_balance;
                result.type = provider.type;
                result.service = SERVICE[provider.provider.toLowerCase()];

                if (provider.call_to_action && provider.call_to_action.url) {
                    result.home_url = provider.call_to_action.url;
                }

                if (provider.color && provider.color.primary) {
                    result.primary_color = provider.color.primary;
                }

                result.save(cb);
            } else {
                let itemInfo = new Provider({
                    realId: provider.id,
                    name: provider.name,
                    code: provider.code,
                    country_code: provider.country_code,
                    icon: provider.media_path + provider.logo_file_name,
                    hasBalance: provider.has_balance,
                    type: provider.type,
                    service: SERVICE[provider.provider.toLowerCase()]
                });

                if (provider.call_to_action && provider.call_to_action.url) {
                    itemInfo.home_url = provider.call_to_action.url;
                }

                if (provider.color && provider.color.primary) {
                    itemInfo.primary_color = provider.color.primary;
                }

                itemInfo.save(cb);
            }
        });
    }, callback);
}

function generateJsonFile(service, callback) {
    let query = {
        disabled: false,
        type: {
            "$nin": [file_extension_type]
        }
    };

    if (service && service < 3) {
        query.service = service;
    }

    Provider.find(query)
        .sort('name')
        .exec(function (err, result) {
            if (!err) {
                let timeStamp = parseInt(new Date().getTime() / 1000, 10);
                // let imageUrl = 'https:' + config.site.urlStatic3 + 'img/icon/provider/';
                // let newData = {status: "active", t: timeStamp, data: result, image_url: imageUrl};

                let cacheData = [];

                result.forEach((provider) => {
                    cacheData.push(providerCacheConverter(provider));
                });

                let newData = { status: true, last_update: timeStamp, data: cacheData };

                fs.writeFile(filename, JSON.stringify(newData), callback);
                fs.writeFile(filename2, JSON.stringify(newData), function () { });
                utils.cacheTimestamp('p', timeStamp);
            } else {
                callback(err);
            }
        });
}

function generateJsonFileExtension(service, callback) {
    let query = {
        disabled: false,
        type: {
            "$in": file_extension_type
        }
    };

    if (service && service < 3) {
        query.service = service;
    }

    Provider.find(query)
        .sort('name')
        .exec(function (err, result) {
            if (!err) {
                let timeStamp = parseInt(new Date().getTime() / 1000, 10);
                // let imageUrl = 'https:' + config.site.urlStatic3 + 'img/icon/provider/';
                // let newData = {status: "active", t: timeStamp, data: result, image_url: imageUrl};

                let cacheData = [];

                result.forEach((provider) => {
                    cacheData.push(providerCacheConverter(provider));
                });

                let newData = { status: true, last_update: timeStamp, data: cacheData };

                fs.writeFile(filename_extension, JSON.stringify(newData), callback);
                utils.cacheTimestamp('p', timeStamp);
            } else {
                callback(err);
            }
        });
}

function providerCacheConverter(provider) {
    return {
        id: provider.realId,
        name: provider.name,
        code: provider.code,
        icon: provider.icon,
        primary_color: provider.primary_color,
        type: provider.type,
        country_code: provider.country_code,
        has_balance: provider.hasBalance || false,
        meta_search: provider.meta_search,
        is_free: provider.is_free || false,
        is_debug: provider.is_debug || false
    };
}

let getList = function (req, res) {
    let skip = req.body.skip,
        limit = req.body.limit,
        filter = req.body.filter;

    let options = {
        skip: skip,
        limit: limit
    };

    if (filter) options.query = { service: filter };

    Provider.getAll(options, function (err, result) {
        if (err) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let edit = function (req, res) {
    let listProvider = req.body.listProvider;
    fs.writeFile(dataPath, JSON.stringify(listProvider), { encoding: 'utf8', flag: 'w+' }, function (err) {
        res.send({ s: !err, msg: err });
    });
};

let initList = function (req, res) {
    let adminId = req.session.adminId;
    res.send({ s: true });

    fetchFinsifyProvider(function (finsifyError) {
        let result;

        if (finsifyError) {
            result = 'failed';
        } else {
            result = 'success';
        }

        BackendNotification.addNew(adminId, 'backend_push', "Getting Finsify provider list " + result, '/remote-wallet/provider', function (err, noti) {
            if (noti) hook.pushBackendNotification(noti._id, function () { });
        });
    });
};

let changeDisabled = function (req, res) {
    let disabled = req.body.disabled,
        _id = req.body._id;

    Provider.changeDisabledStatus(_id, disabled, function (err) {
        if (err) {
            res.json({ s: false });
        } else {
            //Provider.cacheProviderList();
            res.json({ s: true });
        }
    });
};

let changeDebug = function (req, res) {
    let status = req.body.debug,
        _id = req.body._id;

    Provider.changeDebugStatus(_id, status, function (err) {
        if (err) {
            res.json({ s: false });
        } else {
            //Provider.cacheProviderList();
            res.json({ s: true });
        }
    });
};

let changeFree = function (req, res) {
    let free = req.body.free,
        _id = req.body._id;

    Provider.changeFreeStatus(_id, free, function (err) {
        if (err) res.json({ s: false });
        else {
            //Provider.cacheProviderList();
            res.json({ s: true });
        }
    })
};

let search = function (req, res) {
    let keyword = req.body.keyword,
        skip = req.body.skip,
        limit = req.body.limit;

    Provider.search(keyword, skip, limit, function (err, result) {
        if (err) {
            res.json({ s: false });
        } else res.json({ s: true, d: result });
    });
};

let changeIcon = function (req, res) {
    let uploadDir = config.root + '/app/public/img/icon/provider', uploadDir2 = config.root + '/app/public/img/icon';

    let form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        let image = files.filedata;
        let image_name = fields.imagename;
        let providerId = fields.providerId;

        fs.createReadStream(image.path).pipe(fs.createWriteStream(uploadDir + '/' + image_name));
        fs.createReadStream(image.path).pipe(fs.createWriteStream(uploadDir2 + '/' + image_name));
        fs.unlinkSync(image.path);

        Provider.updateIconName(providerId, function (err, result) {
            if (err) res.send({ s: false });
            else {
                //Provider.cacheProviderList();
                res.send({ s: true });
            }
        })
    });
};

let changeMeta = function (req, res) {
    let meta = req.body.meta,
        id = req.body.id;

    if (!meta && !id) return res.json({ s: false });

    Provider.changeMetaSearch(id, meta, function (err) {
        if (err) res.json({ s: false });
        else res.json({ s: true });
    });
};

let extendLimitAccept = function (req, res) {
    let request = req.body.request;
    if (!request) return res.json({ s: false });

    User.findById(request.user._id, function (error, user) {
        let limit = 3;
        if (!user.rwLimit) limit += 3;
        else limit = user.rwLimit + 3;
        User.findByIdAndUpdate(request.user._id, { rwLimit: limit }, function (e, r) {
            if (e) res.json({ s: false });
            else {
                ExtendRemoteWallet.accept(request._id, function (err) {
                    res.json({ s: !err });
                });
                hook.pushRemoteWalletExtendResponse(request.user._id, true);
            }
        });
    });
};

let extendLimitDelete = function (req, res) {
    let id = req.body.id;
    if (!id) return res.json({ s: false });

    ExtendRemoteWallet.delete(id, function (err) {
        res.json({ s: !err });
    });
};

let getRequest = function (req, res) {
    let skip = req.body.skip,
        limit = req.body.limit;

    ExtendRemoteWallet.findAll(skip, limit, function (err, result) {
        if (err) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let findRequestByEmail = function (req, res) {
    let email = req.body.email,
        skip = req.body.skip,
        limit = req.body.limit;

    if (!email) return res.json({ s: false });

    User.findByEmail(email, function (err, user) {
        if (err) res.json({ s: false });
        else if (!user) res.json({ s: true, d: [] });
        else {
            ExtendRemoteWallet.findByUser(user._id, skip, limit, function (e, r) {
                if (e) res.json({ s: false });
                else res.json({ s: true, d: r });
            });
        }
    })
};


let iconlessList = function (req, res) {
    let skip = req.body.skip,
        limit = req.body.limit;

    Provider.getIconlessProvider(skip, limit, function (err, result) {
        if (err) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let appBuildCache = function (req, res) {
    let service = req.body.service;
    let adminId = req.session.adminId;

    res.send({ s: true });
    async.series({
        buildCacheFile: function (callback) {
            generateJsonFile(service, function (err) {
                let status = (err) ? 'failed' : 'completed';

                BackendNotification.addNew(adminId, 'backend_push', "Caching Remote Wallet's provider list " + status + ".", '/remote-wallet/provider', function (err, noti) {
                    if (noti) hook.pushBackendNotification(noti._id, callback);
                });
            });
        },
        buildCacheFileExtension: function (callback) {
            generateJsonFileExtension(service, function (err) {
                let status = (err) ? 'failed' : 'completed';

                BackendNotification.addNew(adminId, 'backend_push', "Caching Remote Wallet's provider extension list " + status + ".", '/remote-wallet/provider', function (err, noti) {
                    if (noti) hook.pushBackendNotification(noti._id, callback);
                });
            })
        },
        updateMetadata: function (callback) {
            let providerList = [];
            async.series({
                providerIsFree: function (next) {
                    getProviderIsFree(function (error, providerIdList) {
                        if (error) {
                            next(error);
                        } else {
                            providerList = providerIdList;
                            next();
                        }
                    });
                },
                findWalletHasProviderFree: function (next) {
                    if (providerList) {
                        getWalletHasProviderFree(providerList, function (error, wallets) {
                            if (error) {
                                next(error);
                            } else {
                                // update metdata wallets
                                if (wallets) {
                                    updateMetadataWallet(wallets, next);
                                } else {
                                    next();
                                }
                            }
                        });
                    } else {
                        next();
                    }
                }
            }, callback);
        }
    }, function () { });

};

function updateMetadataWallet(wallets, callback) {
    async.eachSeries(wallets, function (wallet, cb) {
        async.setImmediate(() => {
            if (typeof wallet != 'object') {
                wallet = JSON.parse(wallet);
            }

            if (wallet.metadata) {
                let metadata = wallet.metadata;

                if (typeof wallet.metadata != 'object') {
                    metadata = JSON.parse(wallet.metadata);
                }

                metadata.is_free = true;

                WalletModel.findOne({
                    _id: wallet._id
                }, function (err, wl) {
                    if (err) {
                        cb(err);
                    } else {
                        wl.markModified('metadata');

                        wl.metadata = JSON.stringify(metadata);

                        wl.save(cb);
                    }
                });
            } else {
                cb();
            }
        });
    }, callback);
}

function getProviderIsFree(callback) {
    let serviceId = [];
    Provider.find({
        is_free: true,
        service: 2
    }, function (error, providers) {
        if (error) {
            callback(error, null);
        } else {
            if (providers.length > 0) {
                async.eachSeries(providers, function (provider, cb) {
                    async.setImmediate(() => {
                        let providerId = provider.realId;
                        serviceId.push(providerId);
                        cb();
                    })
                }, function (error) {
                    callback(null, serviceId);
                });
            } else {
                callback(null, null);
            }
        }
    });
};

function getWalletHasProviderFree(providerList, callback) {
    let wallets = [];
    async.eachSeries(providerList, function (providerId, cb) {
        async.setImmediate(() => {
            let query = {
                "isDelete": false,
                "account_type": {
                    //$exists: true,
                    "$gt": 0
                },
                "$or": [
                    {
                        "rwInfo.service_id": providerId
                    },
                    {
                        "rwInfo.p_code": providerId
                    }
                ]
            };

            WalletModel.find(query).lean().exec(function (error, wallet) {
                if (error) {
                    cb(error, null);
                } else {
                    async.eachSeries(wallet, function (wl, next) {
                        async.setImmediate(() => {
                            wallets.push(wl);
                            next();
                        });
                    }, function (err) {
                        cb(null, null);
                    });
                }
            });

        });
    }, function (error) {
        if (error) return callback(error, null);
        callback(null, wallets);
    });
};

let appGetRemoteWallet = function (req, res) {
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!limit) return res.send({ s: false });

    WalletModel.findRemoteWallet(skip, limit, function (err, walletList, total) {
        if (err) res.send({ s: false });
        else {
            getLinkedWalletIcon(walletList, (err, list) => {
                if (err) {
                    return res.send({ s: false, e: err });
                }

                res.send({ s: true, d: list, total: total });
            });
        }
    });
};

let appProviderActionGet = function (req, res) {
    let serviceId = req.body.serviceId;

    if (!serviceId) {
        return res.send({ s: false });
    }

    fs.readFile(`${providerActionRootUrl}${serviceId}.json`, { flag: 'a+' }, function (err, data) {
        if (err) {
            return res.json({ s: false });
        }

        let result = {};
        data = data.toString();

        if (data) {
            result = JSON.parse(data);
        }

        res.send({ s: true, d: result });
    });
};

let changeHasBalance = function (req, res) {
    let providerId = req.body.providerId;
    let status = req.body.status || false;

    if (!providerId) {
        return res.send({ s: false });
    }

    Provider.findByIdAndUpdate(providerId, { hasBalance: status }, function (err) {
        res.send({ s: !err });
    });
};

let appProviderActionSave = function (req, res) {
    let data = req.body.data;
    let serviceId = req.body.serviceId;

    if (!data || !serviceId) {
        return res.json({ s: false });
    }

    fs.writeFile(`${providerActionRootUrl + serviceId}.json`, JSON.stringify(data), function (err) {
        res.json({ s: !err });
    });
};

let appCountProvider = function (req, res) {
    async.series({
        total: countTotal,
        enabled: countEnabled,
        disabled: countDisabled,
        byCountry: countByCountry,
        byType: countByType
    }, (err, results) => {
        res.json({ status: !err, data: results });
    });

    function countTotal(cb) {
        Provider.count(cb);
    }

    function countEnabled(cb) {
        Provider.count({ disabled: false }, cb);
    }

    function countDisabled(cb) {
        Provider.count({ disabled: true }, cb);
    }

    function countByCountry(cb) {
        let group = {
            $group: {
                _id: "$country_code",
                count: { $sum: 1 }
            }
        };

        Provider.aggregate(group, cb);
    }

    function countByType(cb) {
        let group = {
            $group: {
                _id: "$type",
                count: { $sum: 1 }
            }
        };

        Provider.aggregate(group, cb);
    }
};

let appCountWalletByProvider = function (req, res) {
    countGroupByServiceId((err, result) => {
        if (err) return res.json({ status: false });

        result.sort((a, b) => {
            return b.amount - a.amount;
        });

        populateService(result, (err, output) => {
            res.json({ status: !err, data: output });
        });
    });

    function populateService(list, callback) {
        let output = [];

        async.eachSeries(list, (record, done) => {
            if (!record._id) return done();

            Provider.findOne({ realId: record._id }, 'name country_code icon', (err, provider) => {
                if (err) return done(err);
                if (!provider) return done();

                output.push({
                    service: provider,
                    amount: record.count
                });

                done();
            });
        }, err => {
            callback(err, output);
        });
    }

    function countGroupByServiceId(callback) {
        WalletModel.aggregate(
            {
                $match: {
                    isDelete: false,
                    account_type: {
                        $gt: 0
                    }
                }
            },
            {
                $group: {
                    _id: '$rwInfo.service_id',
                    count: { $sum: 1 }
                }
            },
            callback
        );
    }
};

module.exports = function (app, config) {
    app.get('/remote-wallet/service', staticsMain);
    app.get('/remote-wallet/request', staticsMain);
    app.get('/remote-wallet/list', staticsMain);
    app.post('/remote-wallet/init-provider-list', initList);
    app.post('/remote-wallet/get-provider', getList);
    app.post('/remote-wallet/edit-provider', edit);
    app.post('/remote-wallet/change-disabled', changeDisabled);
    app.post('/remote-wallet/change-debug', changeDebug);
    app.post('/remote-wallet/change-free', changeFree);
    app.post('/remote-wallet/change-has-balance', changeHasBalance);
    app.post('/remote-wallet/change-icon', changeIcon);
    app.post('/remote-wallet/change-meta-search', changeMeta);
    app.post('/remote-wallet/search', search);
    app.post('/remote-wallet/accept-extend-limit-request', extendLimitAccept);
    app.post('/remote-wallet/delete-extend-limit-request', extendLimitDelete);
    app.post('/remote-wallet/get-request', getRequest);
    app.post('/remote-wallet/find-request-email', findRequestByEmail);
    app.post('/remote-wallet/iconless-list', iconlessList);
    app.post('/remote-wallet/build-cache', appBuildCache);
    app.post('/remote-wallet/list', appGetRemoteWallet);
    app.post('/remote-wallet/provider/action/get', appProviderActionGet);
    app.post('/remote-wallet/provider/action/save', appProviderActionSave);
    app.post('/remote-wallet/provider/count', appCountProvider);
    app.post('/remote-wallet/provider/wallet-amount', appCountWalletByProvider);
};
