'use strict';

let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let hook = require('../routes/hook');

let mongoose = require('mongoose');
let utils = require('../../helper/utils');
let async = require('async');
let moment = require('moment');
let fs = require('fs');
const nodeExcel = require('excel-export');

let SearchQuery = mongoose.model('SearchQuery');
let UserModel = mongoose.model('User');
let DeviceModel = mongoose.model('Device');
let BackendNotification = mongoose.model('BackendNotification');
let Provider = mongoose.model('Provider');
let Wallet = mongoose.model('Account');

const objectIdRe = /^[0-9a-fA-F]{24}$/;
const debug = require('debug')('search-query:debug');

const redisClient = require('../../config/database.js').redisClient;
const redisUtils = require('../../config/utils.js');

let io = require('socket.io-emitter')({ host: config.redis.host, port: config.redis.port });
let room = '/backend/notification/admin/';

function saveKeyAndResultToRedis(key, result, callback) {
    let redisClient = require('../../config/database').redisClient;

    async.series([
        function (cb) {
            if (!result.user) {
                return cb();
            }

            redisClient.HSET(key, "user", JSON.stringify(result.user), cb);
        },
        function (cb) {
            if (!result.device) {
                return cb();
            }

            redisClient.HSET(key, "device", JSON.stringify(result.device), cb);
        }
    ], callback);
}

function deleteRedisStoredResult(key, callback) {
    let redisClient = require('../../config/database').redisClient;
    redisClient.DEL(key, callback);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(len) {
    let buf = [];
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let charlen = chars.length;

    for (let i = 0; i < len; ++i) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
}

function findDeviceAndResponse(query, options, res) {
    let deviceQuery = utils.createDeviceQuery(query);

    DeviceModel.search(deviceQuery, options, function (err, deviceList) {
        if (err || !deviceList) {
            return res.send({ s: false });
        }

        res.send({ s: true, d: { device: deviceList.hits.hits }, t: { device: deviceList.hits.total } });
    });
}

function findUserByLinkedWallet(provider) {
    return new Promise(function (resolve, reject) {
        let providerId = null;
        let userArray = [];
        async.series({
            findRealId: function (callback) {
                Provider.searchByName({ name: provider }, function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        if (result.length > 0) {
                            providerId = result[0].realId;
                        }

                        return callback(null, providerId);
                    }
                });
            },
            findWallet: function (callback) {
                if (providerId) {
                    Wallet.find({
                        rwInfo: {
                            service_id: providerId
                        },
                        account_type: {
                            $ne: 0
                        }
                    }, function (error, result) {
                        if (error) {
                            return callback(error, null);
                        } else {
                            result.forEach(wallet => {
                                userArray.push(wallet.owner);
                            });
                            return callback(null, userArray);
                        }
                    });
                } else {
                    return callback(null, null);
                }
            },
            findUser: function (callback) {
                if (userArray.length > 0) {
                    UserModel.find({
                        _id: {
                            $in: userArray
                        }
                    }, function (error, result) {
                        if (error) {
                            return callback(error, null);
                        } else {
                            return callback(null, result);
                        }
                    })
                } else {
                    return callback(null, null);
                }
            },
            findDevice: function (callback) {
                if (userArray.length > 0) {
                    DeviceModel.findByUsers(userArray, function (result) {
                        if (!result) {
                            callback(null, null);
                        } else {
                            callback(null, result);
                        }
                    });
                } else {
                    return callback(null, null);
                }
            }
        }, function (error, result) {
            if (error) {
                reject(error);
            } else {
                let users = result.findUser;
                let devices = result.findDevice;

                resolve({ d: { user: users, device: devices }, t: { user: users.length, device: devices.length } });
            }
        });
    });
}

function findUserAndResponse(query, options, res) {
    let preQuery;

    if (query.indexOf("&&") == -1) {
        preQuery = query.split(":");
    } else {
        preQuery = query.split("&&");
        preQuery = preQuery[0].split(":");
    }

    if (preQuery[0] === 'linked' && typeof preQuery[1] == 'string') {
        // ex : linked:bidv
        let provider = preQuery[1];
        findUserByLinkedWallet(provider)
            .then(function (data) {
                return res.json({
                    s: true,
                    d: {
                        user: data.d.user,
                        device: data.d.device
                    },
                    t: {
                        user: data.t.user,
                        device: data.t.device
                    }
                });
            })
            .catch(function (error) {
                return res.json({
                    s: false,
                    message: error
                });
            });
    } else {
        let userQuery = utils.createUserQuery(query);
        // let userQuery = utils.createUserQuery2(query);

        UserModel.search(userQuery, options, function (err, userList) {
            if (err || !userList) {
                return res.send({ s: false });
            }
            // console.log(userList.hits.hits);
            let listOwner = [];
            userList.hits.hits.forEach(function (user) {
                if (user) {
                    listOwner.push(user._id);
                }
            });

            let searchQuery = {
                filtered: {
                    filter: {
                        bool: {
                            must: [{
                                terms: {
                                    owner: listOwner
                                }
                            }]
                        }
                    }
                }
            };

            DeviceModel.search(searchQuery, { hydrate: true }, function (err, deviceList) {
                if (err || !deviceList) {
                    return res.send({ s: false });
                }

                res.send({
                    s: true,
                    d: { user: userList.hits.hits, device: deviceList.hits.hits },
                    t: { user: userList.hits.total, device: deviceList.hits.total }
                });
            });
        });
    }
}

function saveDeviceList(info, options, adminId, mode) {
    //mode === 1 is add new
    //mode === 2 is regenerate
    let deviceQuery = utils.createDeviceQuery(info.query);

    async.waterfall([
        function (cb) {
            DeviceModel.search(deviceQuery, options, cb);
        },

        function (result, cb) {
            let key = randomString(7);
            let listDeviceId = [];

            result.hits.hits.forEach(device => {
                if (device && device._id && device.owner) listDeviceId.push(device._id);
            });

            saveKeyAndResultToRedis(key, { device: listDeviceId }, err => {
                cb(err, listDeviceId, key);
            });
        },

        function (listDeviceId, key, cb) {
            if (mode == 1) {
                info.keyRedis = key;

                SearchQuery.addNew(info, err => {
                    cb(err, listDeviceId);
                });
            } else {
                deleteRedisStoredResult(info.keyRedis, err => {
                    if (err) {
                        return cb(err);
                    }

                    SearchQuery.changeKeyRedis(info._id, key, err => {
                        cb(err, listDeviceId);
                    });
                });
            }
        }
    ], (err, result) => {
        let message;
        let action = (mode === 1) ? `Saving` : `Regenerating`;

        if (err) {
            message = `${action} search-query ${info.name} failed.`;
        } else {
            message = `${action} search-query ${info.name} success! Cached ${result.length} devices.`;
        }

        BackendNotification.addNew(adminId, 'backend_push', message, '/search-query', (err, notification) => {
            if (notification) {
                hook.pushBackendNotification(notification._id, function () { });
            }
        });
    });
}

function saveDeviceListPromise(info, options, adminId, mode) {
    //mode === 1 is add new
    //mode === 2 is regenerate
    return new Promise((resolve, reject) => {
        let deviceQuery = utils.createDeviceQuery(info.query);

        async.waterfall([
            function (cb) {
                DeviceModel.search(deviceQuery, options, cb);
            },

            function (result, cb) {
                let key = randomString(7);
                let listDeviceId = [];

                result.hits.hits.forEach(device => {
                    if (device && device._id && device.owner) listDeviceId.push(device._id);
                });

                saveKeyAndResultToRedis(key, { device: listDeviceId }, err => {
                    cb(err, listDeviceId, key);
                });
            },

            function (listDeviceId, key, cb) {
                if (mode == 1) {
                    info.keyRedis = key;

                    SearchQuery.addNew(info, err => {
                        cb(err, listDeviceId);
                    });
                } else {
                    deleteRedisStoredResult(info.keyRedis, err => {
                        if (err) {
                            return cb(err);
                        }

                        SearchQuery.changeKeyRedis(info._id, key, err => {
                            cb(err, listDeviceId);
                        });
                    });
                }
            }
        ], (err, result) => {
            let message;
            let action = (mode === 1) ? `Saving` : `Regenerating`;

            if (err) {
                message = `${action} search-query ${info.name} failed.`;
            } else {
                message = `${action} search-query ${info.name} success! Cached ${result.length} devices.`;
            }

            BackendNotification.addNew(adminId, 'backend_push', message, '/search-query', (err, notification) => {
                if (notification) {
                    hook.pushBackendNotification(notification._id, function () { });
                }
            });

            resolve();
        });
    });
}

function saveUserDeviceList(info, options, adminId, mode) {
    //mode === 1 is add new
    //mode === 2 is regenerate
    let query = utils.createUserQueryMongo(info.query);
    let isNewLinkedMethod = false;

    if (query.providerName) {
        // ex : linked:bidv
        isNewLinkedMethod = true;
    }

    // let userQuery = utils.createUserQuery2(info.query);
    let userQuery = utils.createUserQuery(info.query);

    async.waterfall([
        function (cb) {
            if (!isNewLinkedMethod) {
                UserModel.search(userQuery, options, function (err, result) {
                    cb(err, result);
                });
            } else {
                // ex : linked:bidv
                let result = {};
                result.hits = {};
                result.hits.hits = {};

                let providerName = query.providerName;

                findUserByLinkedWallet(providerName)
                    .then(function (data) {
                        result.hits.hits = data.d.user;
                        cb(null, result);
                    }).catch(function (error) {
                        cb(error, result);
                    });
            }
        },

        function (result, cb) {
            let listDeviceId = [];
            let listUserId = [];

            async.eachSeries(result.hits.hits, (user, done) => {
                async.setImmediate(function () {
                    if (!user || !user._id) return done();
                    listUserId.push(user._id);

                    DeviceModel.find({ owner: user._id }, (err, devices) => {
                        if (err) {
                            return done(err);
                        }

                        if (devices.length > 0) {
                            devices.forEach(device => {
                                if (device._id) listDeviceId.push(device._id);
                            });
                        }

                        done();
                    });
                });
            }, err => {
                cb(err, listUserId, listDeviceId);
            });
        },

        function (listUserId, listDeviceId, cb) {
            let data = {
                user: listUserId,
                device: listDeviceId
            };

            let key = randomString(7);
            saveKeyAndResultToRedis(key, data, err => {
                cb(err, data, key);
            });
        },

        function (data, key, cb) {
            if (mode === 1) {
                info.keyRedis = key;

                SearchQuery.addNew(info, err => {
                    cb(err, data);
                });
            } else {
                deleteRedisStoredResult(info.keyRedis, err => {
                    if (err) {
                        return cb(err);
                    }

                    SearchQuery.changeKeyRedis(info._id, key, err => {
                        cb(err, data);
                    });
                });
            }
        },
    ], (err, result) => {
        let message;
        let action = (mode === 1) ? `Saving` : `Regenerating`;

        if (err) {
            // console.log(err);
            message = `${action} search-query ${info.name} failed`;
        } else {
            message = `${action} search-query ${info.name} success! Cached ${result.device.length} devices & ${result.user.length} users`;
        }

        BackendNotification.addNew(adminId, 'backend_push', message, '/search-query', (err, notification) => {
            if (notification) {
                hook.pushBackendNotification(notification._id, () => { });
            }
        });
    });
}

function saveUserDeviceListPromise(info, options, adminId, mode) {
    //mode === 1 is add new
    //mode === 2 is regenerate
    return new Promise((resolve, reject) => {
        let query = utils.createUserQueryMongo(info.query);
        let isNewLinkedMethod = false;

        if (query.providerName) {
            // ex : linked:bidv
            isNewLinkedMethod = true;
        }

        // let userQuery = utils.createUserQuery2(info.query);
        let userQuery = utils.createUserQuery(info.query);

        async.waterfall([
            function (cb) {
                if (!isNewLinkedMethod) {
                    UserModel.search(userQuery, options, function (err, result) {
                        cb(err, result);
                    });
                } else {
                    // ex : linked:bidv
                    let result = {};
                    result.hits = {};
                    result.hits.hits = {};

                    let providerName = query.providerName;

                    findUserByLinkedWallet(providerName)
                        .then(function (data) {
                            result.hits.hits = data.d.user;
                            cb(null, result);
                        }).catch(function (error) {
                            cb(error, result);
                        });
                }
            },

            function (result, cb) {
                let listDeviceId = [];
                let listUserId = [];

                async.eachSeries(result.hits.hits, (user, done) => {
                    async.setImmediate(function () {
                        if (!user || !user._id) return done();
                        listUserId.push(user._id);

                        DeviceModel.find({ owner: user._id }, (err, devices) => {
                            if (err) {
                                return done(err);
                            }

                            if (devices.length > 0) {
                                devices.forEach(device => {
                                    if (device._id) listDeviceId.push(device._id);
                                });
                            }

                            done();
                        });
                    });
                }, err => {
                    cb(err, listUserId, listDeviceId);
                });
            },

            function (listUserId, listDeviceId, cb) {
                let data = {
                    user: listUserId,
                    device: listDeviceId
                };

                let key = randomString(7);
                saveKeyAndResultToRedis(key, data, err => {
                    cb(err, data, key);
                });
            },

            function (data, key, cb) {
                if (mode === 1) {
                    info.keyRedis = key;

                    SearchQuery.addNew(info, err => {
                        cb(err, data);
                    });
                } else {
                    deleteRedisStoredResult(info.keyRedis, err => {
                        if (err) {
                            return cb(err);
                        }

                        SearchQuery.changeKeyRedis(info._id, key, err => {
                            cb(err, data);
                        });
                    });
                }
            },
        ], (err, result) => {
            let message;
            let action = (mode === 1) ? `Saving` : `Regenerating`;

            if (err) {
                // console.log(err);
                message = `${action} search-query ${info.name} failed`;
            } else {
                message = `${action} search-query ${info.name} success! Cached ${result.device.length} devices & ${result.user.length} users`;
            }

            BackendNotification.addNew(adminId, 'backend_push', message, '/search-query', (err, notification) => {
                if (notification) {
                    hook.pushBackendNotification(notification._id, () => { });
                }
            });

            resolve();
        });
    });
}

/**************************/

let appGet = function (req, res) {
    let skip = req.body.skip || null;
    let limit = req.body.limit || null;
    let type = req.body.type;

    if (!limit) return res.send({ s: false });
    if (limit < 10000) {
        limit = 10000;
    }
    let query = {};

    if (type && (type === 'user' || type === 'device')) {
        query.type = type;
    }

    SearchQuery.find(query)
        .sort('-createdDate')
        .skip(skip)
        .limit(limit)
        .sort({ updatedDate: -1 })
        .exec(function (err, result) {
            res.send({ s: !err, d: result });
        })
};

let appPreview = function (req, res) {
    let type = req.body.type;
    let query = req.body.query;
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!type || !query || !limit) return res.send({ s: false });

    let options = {
        hydrate: true,
        sort: {
            createdDate: { order: "asc" }
        },
        from: skip,
        size: limit
    };

    if (type === 'device') {
        return findDeviceAndResponse(query, options, res);
    }

    findUserAndResponse(query, options, res);
};

let appSave = function (req, res) {
    let info = req.body;
    let adminId = req.session.adminId;

    if (!info || !info.type || !info.query || !info.name) return res.send({ s: false });

    res.send({ s: true });
    BackendNotification.addNew(adminId, 'backend_push', `Search query ${info.name} is being created`, '/search-query', (err, notification) => {
        if (notification) {
            hook.pushBackendNotification(notification._id, function () { });
        }
    });

    let options = {
        hydrate: true,
        sort: {
            createdDate: { order: "asc" }
        }
    };

    let tempQuery = info.query.split('&&');
    tempQuery.forEach(function (command) {
        command = command.trim();
        if (command.indexOf('limit:') !== -1) {
            options.size = parseInt(command.split(':')[1]);
        }
        if (command.indexOf('skip:') !== -1) {
            options.from = parseInt(command.split(':')[1]);
        }
    });

    if (options.from === null || options.from === undefined) {
        options.from = 0;
    }

    if (options.size === null || options.size === undefined) {
        options.size = 2000;
    }

    if (info.type === 'device') {
        return saveDeviceList(info, options, adminId, 1);
    }

    //user
    saveUserDeviceList(info, options, adminId, 1);
};

let appRegen = function (req, res) {
    let query = req.body.query;
    let adminId = req.session.adminId;

    if (!query) return res.send({ s: false });

    res.send({ s: true });

    let options = {
        hydrate: true,
        sort: {
            createdDate: { order: "asc" }
        }
    };

    let tempQuery = query.query.split('&&');
    tempQuery.forEach(function (command) {
        command = command.trim();
        if (command.indexOf('limit:') != -1) {
            options.size = parseInt(command.split(':')[1]);
        }
        if (command.indexOf('skip:') != -1) {
            options.from = parseInt(command.split(':')[1]);
        }
    });

    if (options.from === null || options.from === undefined) {
        options.from = 0;
    }

    if (options.size === null || options.size === undefined) {
        options.size = 9999;
    }

    if (query.type === 'device') {
        return saveDeviceList(query, options, adminId, 2);
    }

    saveUserDeviceList(query, options, adminId, 2);
};

let appRegenAll = function (req, res) {
    let adminId = req.session.adminId;

    SearchQuery.find(function (err, queries) {
        if (err) {
            res.send({ s: false });
        } else {

            if (queries.length <= 0) return res.send({ s: false });

            res.send({ s: true });

            async.eachSeries(queries, function (query, cb) {
                async.setImmediate(() => {
                    let options = {
                        hydrate: true,
                        sort: {
                            createdDate: { order: "asc" }
                        }
                    };

                    let tempQuery = query.query.split('&&');
                    tempQuery.forEach(function (command) {
                        command = command.trim();
                        if (command.indexOf('limit:') != -1) {
                            options.size = parseInt(command.split(':')[1]);
                        }
                        if (command.indexOf('skip:') != -1) {
                            options.from = parseInt(command.split(':')[1]);
                        }
                    });

                    if (options.from === null || options.from === undefined) {
                        options.from = 0;
                    }

                    if (options.size === null || options.size === undefined) {
                        options.size = 9999;
                    }

                    if (query.type === 'device') {
                        saveDeviceListPromise(query, options, adminId, 2)
                            .then((data) => {
                                cb();
                            }).catch((err) => {
                                cb();
                            })
                    } else {
                        saveUserDeviceListPromise(query, options, adminId, 2)
                            .then((data) => {
                                cb();
                            }).catch((err) => {
                                cb();
                            })
                    }
                });
            }, function () { });
        }
    });
};

let appRemove = function (req, res) {
    let query = req.body.query;

    if (!query) return res.send({ s: false });

    async.parallel([
        function (callback) {
            SearchQuery.findByIdAndRemove(query._id, callback);
        },
        function (callback) {
            deleteRedisStoredResult(query.keyRedis, callback);
        }
    ], function (err) {
        res.send({ s: !err });
    });
};

let appGetOne = function (req, res) {
    let id = req.body.id;

    if (!id) return res.send({ s: false });

    SearchQuery.findById(id, function (err, result) {
        res.send({ s: !err, d: result });
    });
};

function sendNotification(adminId, type, content, url) {
    BackendNotification.addNew(adminId, type, content, url, function (err) {
        if (!err) {
            io.emit(room + adminId, JSON.stringify({ type: type, url: url }));
        }
    });
}

let appExportEmail = function (req, res) {
    let tags = req.body.tags;

    function handleDataToExportCsv(user_list) {
        let list = "";

        user_list.forEach(function (element) {
            list += element._source.email;
            list += "\n";
        });

        return list;
    }

    if (!tags) {
        return res.send({ s: false });
    }

    let options = {
        hydrate: false,
        sort: {
            createdDate: { order: "asc" }
        },
        from: 0,
        size: 999999
    };

    options = utils.skipLimitSearchQueryDetect(tags, options);

    let query = utils.createUserQuery(tags);
    // let query = utils.createUserQuery2(tags);

    UserModel.search(query, options, function (err, result) {
        if (err) {
            return res.send({ s: false });
        }

        res.send({ s: true });

        let data = handleDataToExportCsv(result.hits.hits);
        let today = moment().format('YYYY/MM/DD');
        let filename = "[" + today.replace(/\//gi, '') + "]" + tags.replace(/ /gi, '_') + ".txt";

        fs.writeFile(config.root + `/backend/public/export/csv/${filename}`, data, { flag: 'w+' }, err => {
            if (!err) {
                sendNotification(req.session.adminId, 'csv_export', `Right click > "Save link as..." to download TXT file ${filename}`, `/export/csv/${filename}`);
            }
        });
    });
};

let appExportFull = function (req, res) {
    let tags = req.body.tags;

    if (!tags) {
        return res.json({
            s: false
        });
    }

    let options = {
        hydrate: true,
        sort: {
            createdDate: { order: "asc" }
        },
        from: 0,
        size: 999999
    };
    options = utils.skipLimitSearchQueryDetect(tags, options);

    let userQuery = utils.createUserQuery(tags);
    // let userQuery = utils.createUserQuery2(query);
    // console.log('userQuery ', JSON.stringify(userQuery));
    UserModel.search(userQuery, options, function (err, userList) {
        if (err || !userList) {
            return res.json({ s: false });
        }
        // console.log('userList ', userList);
        // console.log('userList.hits.hits.length ', userList.hits.hits.length);
        let listOwner = [];
        userList.hits.hits.forEach(function (user) {
            if (user) {
                listOwner.push(user._id);
            }
        });

        let searchQuery = {
            filtered: {
                filter: {
                    bool: {
                        must: [{
                            terms: {
                                owner: listOwner
                            }
                        }]
                    }
                }
            }
        };

        let today = moment().format('YYYY/MM/DD hh:ss');
        let filename = "[" + today.replace(/\//gi, '') + "]" + tags.replace(/ /gi, '_') + ".xls";

        let writeStream = fs.createWriteStream(config.root + `/backend/public/export/csv/${filename}`, { flags: 'w', autoClose: false });

        let header = ['Email', 'Created', 'Premium At', 'Last Login', 'Last Sync', 'Sync', 'Premium'].join('\t');
        header += "\n";

        writeStream.once('open', function (fd) {
            writeStream.write(header);

            async.eachSeries(userList.hits.hits, function (data, cb) {
                async.setImmediate(() => {
                    if (data) {
                        let row = [data.email, data.createdDate, data.premium_at, data.lastLogin, data.lastSync, data.acceptSync, data.purchased].join('\t');
                        // debug('row ',row);
                        row += "\n";

                        writeStream.write(row);
                        debug(writeStream);

                        writeStream.on('error', function (error) {
                            debug('write stream error ', error);
                            writeStream.resume();
                        });

                    }

                    cb();
                });
            }, function () {
                writeStream.end();
                sendNotification(req.session.adminId, 'csv_export', `Right click > "Save link as..." to download CSV file ${filename}`, `/export/csv/${filename}`);

                res.json({
                    s: true,
                    d: userList.hits.hits,
                    t: userList.hits.total
                });
            });

        });
    });
}

function handleDataToExportData(user_list) {
    let list = "";

    user_list.forEach(function (element) {
        list += element.email;
        list += "\n";
    });

    return list;
}

function vaildToObjectId(idList) {
    let objectIdList = [];

    idList.forEach((item) => {
        let someText = item.replace(/(\r\n|\n|\r)/gm, "");
        objectIdList.push(someText);
    });

    return objectIdList;
};

let appExportEmailByListId = function (req, res) {
    let idList = req.body.ids;

    if (!idList) {
        return res.json({
            s: false,
            m: 'param invaild or not found'
        })
    }

    let ObjectIdList = vaildToObjectId(idList);
    // console.log(ObjectIdList);
    UserModel.find({
        _id: { "$in": ObjectIdList }
    }, function (error, users) {
        if (error) {
            return res.json({
                s: false,
                m: error
            })
        }

        res.json({ s: true });

        let data = handleDataToExportData(users);
        let today = moment().format('YYYY/MM/DD');
        let filename = "[" + today.replace(/\//gi, '') + "]" + Math.random().toString() + ".txt";

        fs.writeFile(config.root + `/backend/public/export/csv/${filename}`, data, { flag: 'w+' }, err => {
            if (!err) {
                sendNotification(req.session.adminId, 'csv_export', `Right click > "Save link as..." to download TXT file ${filename}`, `/export/csv/${filename}`);
            }
        });
    })
};

let appQueryPreviewMongo = function (req, res) {
    let type = req.body.type;
    let query = req.body.query;
    let skip = req.body.skip;
    let limit = req.body.limit;


    if (!type || !query || !limit) return res.send({ s: false });

    let options = {
        hydrate: true,
        sort: {
            createdDate: -1
        },
        from: skip,
        size: limit
    };

    findAndResponsePreviewMongo(query, options, res);
};

function excuteQueryMongo(queryRaw, query, options, skip, limit, res, callback) {
    redisUtils.GetResultTypeString(redisClient, "mongo-" + queryRaw, function (error, result) {
        if (!error && result) {
            if (typeof result != 'object') {
                result = JSON.parse(result);
            }
            // console.log('get cache');
            callback(null, {
                s: true,
                d: { user: result.d.user, device: result.d.device },
                t: { user: result.t.user, device: result.t.device }
            });

            return res.json({
                s: true,
                d: { user: result.d.user, device: result.d.device },
                t: { user: result.t.user, device: result.t.device }
            });
        } else {
            UserModel.find(query)
                .sort(options.sort)
                .skip(skip)
                .limit(limit)
                .lean(true)
                .exec(function (error, userList) {
                    if (error) {
                        callback(error);

                        return res.json({
                            s: false,
                            m: error
                        })
                    }

                    let userIdList = [];
                    userList.forEach((user) => {
                        userIdList.push(user._id);
                    });

                    DeviceModel.find({ owner: { $in: userIdList } })
                        .lean(true)
                        .exec(function (error, deviceList) {
                            if (error) {
                                callback(error);

                                return res.json({
                                    s: false,
                                    m: error
                                })
                            }

                            redisUtils.CachingWithTTL(redisClient, "mongo-" + queryRaw, {
                                d: { user: userList, device: deviceList },
                                t: { user: userList.length, device: deviceList.length }
                            }, function () {
                                // console.log('cached ' + queryRaw);
                            });

                            callback(null, {
                                s: true,
                                d: { user: userList, device: deviceList },
                                t: { user: userList.length, device: deviceList.length }
                            });

                            res.json({
                                s: true,
                                d: { user: userList, device: deviceList },
                                t: { user: userList.length, device: deviceList.length }
                            });
                        });
                });
        }
    });
}

function findAndResponsePreviewMongo(query, options, res) {
    let queryRaw = query;
    options = utils.skipLimitSearchQueryDetect(query, options);
    query = utils.createQueryMongoDB(query);
    // console.log('query ', query);

    if (!query) {
        return res.json({
            s: false,
            m: 'inavild param or not found'
        });
    };
    let limit, skip;
    if (!query.limit) limit = options.size;
    if (!query.skip) skip = options.from;

    excuteQueryMongo(queryRaw, query, options, skip, limit, res, function () { });
};

let appExportFullByMongo = function (req, res) {
    let tags = req.body.tags;
    let queryRaw = tags;

    if (!tags) {
        return res.json({
            s: false
        });
    }

    let options = {
        hydrate: true,
        sort: {
            createdDate: -1
        },
        from: 0,
        size: 999999
    };

    options = utils.skipLimitSearchQueryDetect(tags, options);

    let queryMongo = utils.createQueryMongoDB(tags);

    let limit, skip;
    if (!queryMongo.limit) limit = options.size;
    if (!queryMongo.skip) skip = options.from;

    excuteQueryMongo(queryRaw, queryMongo, options, skip, limit, res, function (error, data) {
        if (!error) {
            writeExcelFullFieldsUser(data.d.user, tags, req);
        }
    });
}

function writeExcelFullFields(dataRaw, tags, req) {

    let today = moment().format('YYYY/MM/DD hh:ss');
    let filename = "[" + today.replace(/\//gi, '') + "]" + tags.replace(/ /gi, '_') + ".xls";

    let writeStream = fs.createWriteStream(config.root + `/backend/public/export/csv/${filename}`, { flags: 'w', autoClose: false });

    let header = ['Email', 'Created', 'Premium At', 'Last Login', 'Last Sync', 'Sync', 'Premium'].join('\t');
    header += "\n";

    writeStream.once('open', function (fd) {
        writeStream.write(header);

        async.eachSeries(dataRaw, function (data, cb) {
            async.setImmediate(() => {
                if (data) {
                    let row = [data.email, data.createdDate, data.premium_at, data.lastLogin, data.lastSync, data.acceptSync, data.purchased].join('\t');
                    row += "\n";

                    writeStream.write(row);
                    debug(writeStream);

                    writeStream.on('error', function (error) {
                        debug('write stream error ', error);
                        writeStream.resume();
                    });

                }

                cb();
            });

        }, function () {
            writeStream.end();
            sendNotification(req.session.adminId, 'csv_export', `Right click > "Save link as..." to download CSV file ${filename}`, `/export/csv/${filename}`);
        });
    });
}

let appExportFullUser = function (req, res) {
    let tags = req.body.tags;
    let queryRaw = tags;

    if (!tags) {
        return res.json({
            s: false
        });
    }

    let options = {
        hydrate: true,
        sort: {
            createdDate: -1
        },
        from: 0,
        size: 999999
    };

    options = utils.skipLimitSearchQueryDetect(tags, options);

    let queryMongo = utils.createQueryMongoDB(tags);

    let limit, skip;
    if (!queryMongo.limit) limit = options.size;
    if (!queryMongo.skip) skip = options.from;

    excuteQueryMongo(queryRaw, queryMongo, options, skip, limit, res, function (error, data) {
        if (!error) {
            writeExcelFullFieldsUser(data.d.user, tags, req);
        }
    });
}

function writeExcelFullFieldsUser(dataRaw, tags, req) {
    let today = moment().format('YYYY/MM/DD hh:ss');
    let filename = "[" + today.replace(/\//gi, '') + "]" + tags.replace(/ /gi, '_') + ".xls";

    let writeStream = fs.createWriteStream(config.root + `/backend/public/export/csv/${filename}`, { flags: 'w', autoClose: false });

    let header = ['Email', 'Created', 'Premium At', 'Last Login', 'Last Sync', 'Sync', 'Premium', 'subscribeProduct', 'subscribeMarket', 'expireDate', 'premium_at', 'rwProduct', 'rwMarket', 'rwExpire', 'rwLastPurchase', 'rwFirstPurchase', 'tags', 'icon_package'].join('\t');
    header += "\n";

    writeStream.once('open', function (fd) {
        writeStream.write(header);

        async.eachSeries(dataRaw, function (data, cb) {
            async.setImmediate(() => {
                if (data) {
                    // console.log(data);
                    let row = [data.email, data.createdDate, data.premium_at, data.lastLogin, data.lastSync, data.acceptSync, data.purchased, data.subscribeProduct || 'null', data.subscribeMarket || 'null', data.expireDate || 'null', data.premium_at || 'null', data.rwProduct || 'null', data.rwMarket || 'null', data.rwExpire || 'null', data.rwLastPurchase || 'null', data.rwFirstPurchase || 'null', JSON.stringify(data.tags), data.icon_package.length].join('\t');
                    row += "\n";

                    writeStream.write(row);
                    debug(writeStream);

                    writeStream.on('error', function (error) {
                        debug('write stream error ', error);
                        writeStream.resume();
                    });

                }

                cb();
            });

        }, function () {
            writeStream.end();
            sendNotification(req.session.adminId, 'csv_export', `Right click > "Save link as..." to download CSV file ${filename}`, `/export/csv/${filename}`);
        });
    });
}


module.exports = function (app, config) {
    app.get('/search-query', staticsMain);
    app.get('/search-query/*', staticsMain);
    app.post('/search-query/get', appGet);
    app.post('/search-query/get-one', appGetOne);
    app.post('/search-query/query-preview', appPreview);
    app.post('/search-query/save', appSave);
    app.post('/search-query/regenerate', appRegen);
    app.post('/search-query/regenerate-all', appRegenAll);
    app.post('/search-query/remove', appRemove);
    app.post('/search-query/export-email', appExportEmail);
    app.post('/search-query/export-full', appExportFull);

    /* Mongo */
    app.post('/search-query/mongo-export-email-by-list-userid', appExportEmailByListId);
    app.post('/search-query/query-preview-mongo', appQueryPreviewMongo);
    app.post('/search-query/export-full-mongo', appExportFullByMongo);
    app.post('/search-query/export-full-user', appExportFullUser);
};