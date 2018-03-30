'use strict';

var env = 'dev';
process.env.NODE_ENV = env;

var kue = require('kue');
var express = require('express');
var ui = require('kue-ui');
var app = express();

var config = require('../config/config')[env];

kue.createQueue({
    prefix:'q',
    redis: {
        port: config.redis.port,
        host: config.redis.host,
        db: config.redis.kueDb,
        options: {

        }
    }
});

ui.setup({
    apiURL: '/api', // IMPORTANT: specify the api url
    baseURL: '/kue', // IMPORTANT: specify the base url
    updateInterval: 5000 // Optional: Fetches new data every 5000 ms
});

// Mount kue JSON api
app.use('/api', kue.app);
// Mount UI
app.use('/kue', ui.app);

app.listen(config.portKueUI);
