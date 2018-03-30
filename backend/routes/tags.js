/*
 
 */

'use strict';

// /* import lib redis */
let redisClient = require('../../config/database.js').redisClient;
let redisUtils = require('../../config/utils.js');
let async = require('async');
const KEY = 'tagsKeys';
const TAG_REGEX = /^([a-zA-Z0-9]|_)*$/gmi;

var cacheTag = function (req, res) {
    let exitsTag = false;

    async.series({
        checkParam: function (callback) {
            if (!req.body.name || !req.body.duplicate || !req.body.description) {
                return callback(-2, null);
            } else {
                return callback(null, null);
            }
        },
        checkNameExits: function (callback) {
            redisUtils.getCache(redisClient, KEY, function (error, result) {
                if (error) {
                    return callback(error, null);
                } else {
                    // let exits = false;
                    if (!result) {
                        // init 
                        exitsTag = false;
                    } else {
                        for (let i = 0; i < result.length; i++) {
                            let temp = result[i].split('|');
                            let tag = temp[0].replace(/[^\w\s]/gi, ''); //name
                            if (tag === req.body.name) {
                                exitsTag = true;
                            }
                        }
                    }

                    return callback(null, null);
                }
            });
        },
        validateName: function (callback) {
            if (!req.body.name.match(TAG_REGEX)) {
                return callback(-3, null);
            } else {
                return callback(null, null);
            }
        },
        create: function (callback) {
            if (!exitsTag) {
                if (req.body.name != null) {
                    let tag = req.body.name.trim() + '|' + req.body.duplicate + '|' + req.body.description;
                    redisUtils.cacheResult(redisClient, KEY, tag, function (error, result) {
                        if (error) {
                            return callback(error, null);
                        } else {
                            return callback(null, null);
                        }
                    });
                } else {
                    return callback(0, null);
                }
            } else {
                return callback(-1, null);
            }
        }
    }, function (error, result) {
        if (error) {
            let status = 0;
            let message = '';

            if (error == 0) {
                status = 0;
                message = 'invaid param';
            } else if (error == -1) {
                status = -1;
                message = 'duplicate tag'
            } else if (error == -2) {
                status = -1;
                message = 'imput is empty'
            } else if (error == -3) {
                status = -3;
                message = 'name or description invaild'
            }

            res.json({
                status: status,
                message: message
            });

        } else {
            res.json({
                status: 1,
                message: 'cache success'
            });
        }
    });

}

let listTag = function (req, res) {
    redisUtils.getCache(redisClient, KEY, function (error, result) {
        if (error) {
            res.json({
                status: 0,
                message: error
            });
        } else {
            res.json({
                status: 1,
                data: result
            });
        }
    });
}

let editTag = function (req, res) {
    let tagValueOld = req.body.oldValue;
    let tagValueNew = req.body.newValue;

    let exits = false;
    async.series({
        checkParam: function (callback) {
            if (!tagValueOld || !tagValueNew) {
                return callback(-2, null);
            } else {
                return callback(null, null);
            }
        },
        checkExits: function (callback) {
            redisUtils.checkExits(redisClient, KEY, tagValueOld, function (error, result) {
                if (error) {
                    return callback(error, null);
                } else {
                    if (result == 0) {
                        // value not exits in redis
                        exits = false;
                    } else if (result == 1) {
                        // value exits
                        exits = true;
                    }
                    return callback(null, null);
                }
            });
        },
        validateName: function (callback) {
            let name = tagValueNew.split('|')[0];

            if (!name.match(TAG_REGEX)) {
                return callback(-3, null);
            } else {
                return callback(null, null);
            }
        },
        delete: function (callback) {
            if (exits == true) {
                redisUtils.removeMember(redisClient, KEY, tagValueOld, function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        return callback(null, null);
                    }
                });
            } else {
                return callback(null, null);
            }
        },
        create: function (callback) {
            if (exits == true) {
                redisUtils.cacheResult(redisClient, KEY, tagValueNew, function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        return callback(null, null);
                    }
                });
            } else {
                return callback(null, null);
            }
        }
    }, function (error, result) {
        if (error) {
            let status = 0;
            let message = error;

            if (error == -2) {
                status = -2;
                message: 'input is empty';
            } else if (error == -3) {
                status = -3;
                message: 'name invaild regex';
            }

            res.json({
                status: status,
                message: message
            });
        }
        else {
            res.json({
                status: 1,
                message: 'edit success'
            });
        }
    });
}

let deleteTag = function (req, res) {

    let value = req.body.value;
    // console.log(value);
    redisUtils.removeMember(redisClient, KEY, value, function (error, result) {
        if (error) {
            res.json({
                status: 0,
                message: error
            });
        } else {
            res.json({
                status: 1,
                message: 'delete success'
            })
        }
    });
}

module.exports = function (app, config) {
    app.get('/tags', staticsMain);
    app.get('/api/tags/browse', listTag);
    app.post('/api/tags/create', cacheTag);
    app.post('/api/tags/edit', editTag);
    app.post('/api/tags/delete', deleteTag);
};
