'use strict';

let pm2 = require('pm2');
let redisClient = require('../../config/database').redisClient;
let async = require('async');
let os = require('os');

let appGetProcesses = function (req, res) {
    pm2.connect(function () {
        pm2.list(function (err, list) {
            pm2.disconnect();
            if (!err) res.send({s: true, list: list});
            else res.send({s: false});
        });
    });
};

let appRestartProcesses = function (req, res) {
    let pm_id = req.body.pm_id;
    pm2.connect(function () {
        pm2.restart(pm_id, function (err, proc) {
            if (!err) {
                res.send({s: true});
            } else {
                res.send({s: false, 'error': err});
            }
            pm2.disconnect();
        });
    });
};

let appStopProcesses = function (req, res) {
    let pm_id = req.body.pm_id;
    pm2.connect(function () {
        pm2.stop(pm_id, function (err, proc) {
            if (!err) {
                res.send({s: true});
            } else {
                res.send({s: false, 'error': err});
            }
            pm2.disconnect();
        });
    });
};

let appGetServerInfo = function (req, res) {
    res.json({
        status: true,
        data: {
            uptime: os.uptime(),
            memoryUsage: {
                totalMemory: os.totalmem(),
                freeMemory: os.freemem()
            }
        }
    });
};

let checkPermission = function (req, res, next) {
    if (req.session.adminSystem) next();
    else res.send({s: false, m: "Permission Error"});
};

let appRedisInfo = function (req, res) {
    redisClient.INFO(function (err, result) {
        if (err) res.send({s: false});
        else res.send({s: true, d: result});
    });
};

module.exports = function (app, config) {
    app.get('/systems-info', staticsMain);
    app.post('/processesstats', appGetProcesses);
    app.post('/restartprocess', checkPermission, appRestartProcesses);
    app.post('/stopprocess', checkPermission, appStopProcesses);
    app.post('/serverinfo', appGetServerInfo);
    app.get('/redis-info', appRedisInfo);
};
