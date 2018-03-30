'use strict';

let moment = require('moment');
let async = require('async');
let Turnover = require('../../helper/turnover');
let Big = require('big.js');

/*************/

let appTotal = function(req, res) {
    let start = req.body.start;
    let end = req.body.end;
    let mode = req.body.mode;
    let startTime = moment(start, 'DD/MM/YYYY');
    let endTime = moment(end, 'DD/MM/YYYY');

    if (!start || !end || !mode) return res.json({status: false});

    let data = [];

    function exec(date, callback) {
        let start;
        let end;
        let unit;

        if (mode === 'Daily') {
            start = moment(date).startOf('day');
            end = moment(date).startOf('day');
            unit = 'days';
        } else if (mode === 'Weekly') {
            start = moment(date).startOf('week');
            end = moment(date).startOf('week').add(1, 'weeks').subtract(1, 'days');
            unit = 'weeks';
        } else {
            //Monthly
            start = moment(date).startOf('month');
            end = moment(date).startOf('month').add(1, 'months').subtract(1, 'days');
            unit = 'months';
        }

        Turnover.getTurnoverByDateRange(start, end, (err, result) => {
            if (err) return callback(err);

            let out = {amount: result};

            if (start.isSame(end)) {
                out['date'] = end.format('DD/MM');
            } else if (end.isSameOrBefore(endTime)) {
                out['date'] = start.format('DD/MM') + ' - ' + end.format('DD/MM');
            } else {
                out['date'] = start.format('DD/MM') + ' - ' + endTime.format('DD/MM');
            }

            data.push(out);

            if (end.isSameOrAfter(endTime)) return callback();

            date.add(1, unit);
            exec(date, callback);
        });
    }

    exec(startTime, err => {
        res.json({status: !err, data: data});
    });
};

let appTopPurchase = function(req, res) {
    let start = req.body.start;
    let end = req.body.end;
    if (!start || !end) return res.json({status: false});

    let startTime = moment(start, 'DD/MM/YYYY');
    let endTime = moment(end, 'DD/MM/YYYY');

    Turnover.getAmountGroupByProductId(startTime, endTime, (err, result) => {
        if (err) return res.json({status: false});

        result.sort((a, b) => {
            return b.amount - a.amount;
        });

        res.json({status: true, data: result});
    });
};

let appTotalProduct = function(req, res) {
    let start = req.body.start;
    let end = req.body.end;
    let mode = req.body.mode;

    if (!start || !end || !mode) return res.json({status: false});
    
    let startTime = moment(start, 'DD/MM/YYYY');
    let endTime = moment(end, 'DD/MM/YYYY');
    let output = [];

    function exec(date, callback) {
        let start;
        let end;
        let unit;

        if (mode === 'Daily') {
            start = moment(date).startOf('day');
            end = moment(date).startOf('day');
            unit = 'days';
        } else if (mode === 'Weekly') {
            start = moment(date).startOf('week');
            end = moment(date).startOf('week').add(1, 'weeks');
            unit = 'weeks';
        } else {
            //Monthly
            start = moment(date).startOf('month');
            end = moment(date).startOf('month').add(1, 'months');
            unit = 'months';
        }

        Turnover.getTurnoverGroupByProductType(start, end, (err, result) => {
            if (err) return callback(err);


            if (start.isSame(end)) {
                result.date = end.format('DD/MM');
            } else if (end.isSameOrBefore(endTime)) {
                result.date = start.format('DD/MM') + ' - ' + end.format('DD/MM');
            } else {
                result.date = start.format('DD/MM') + ' - ' + endTime.format('DD/MM');
            }

            output.push(result);

            if (start.isSameOrAfter(endTime)) {
                callback();
            } else {
                exec(start.add(1, unit), callback);
            }
        });
    }

    exec(startTime, err => {
        res.json({status: !err, data: output});
    });
};

let appTotalPlatform = function(req, res) {
    let start = req.body.start;
    let end = req.body.end;
    let mode = req.body.mode;
    if (!start || !end) return res.json({status: false});

    let startTime = moment(start, 'DD/MM/YYYY');
    let endTime = moment(end, 'DD/MM/YYYY');

    const PLATFORM_TO_MARKET = {
        iOS: ['apple_store', 'App Store'],
        Android: ['googleplay', 'Google Play', 'google play'],
        Windows: ['windowsstore']
    };
    
    let output = [];
    
    function exec(date, callback) {
        let record = {};
        let start;
        let end;
        let unit;

        if (mode === 'Daily') {
            start = moment(date).startOf('day');
            end = moment(date).startOf('day');
            unit = 'days';
        } else if (mode === 'Weekly') {
            start = moment(date).startOf('week');
            end = moment(date).startOf('week').add(1, 'weeks').subtract(1, 'days');
            unit = 'weeks';
        } else {
            //Monthly
            start = moment(date).startOf('month');
            end = moment(date).startOf('month').add(1, 'months').subtract(1, 'days');
            unit = 'months';
        }

        async.series([
            function(cb) {
                let platform = 'iOS';
                record[platform] = new Big(0);

                async.eachSeries(PLATFORM_TO_MARKET[platform], (market, done) => {
                    Turnover.getTurnoverByMarketAndDateRange(market, start, end, (err, result) => {
                        if (err) return done(err);

                        record[platform] = record[platform].plus(result);
                        done();
                    });
                }, err => {
                    if (err) return cb(err);

                    record[platform] = record[platform].toFixed(2);
                    cb();
                });
            },

            function(cb) {
                let platform = 'Android';
                record[platform] = new Big(0);

                async.eachSeries(PLATFORM_TO_MARKET[platform], (market, done) => {
                    Turnover.getTurnoverByMarketAndDateRange(market, start, end, (err, result) => {
                        if (err) return done(err);

                        record[platform] = record[platform].plus(result);
                        done();
                    });
                }, err => {
                    if (err) return cb(err);

                    record[platform] = record[platform].toFixed(2);
                    cb();
                });
            },

            function(cb) {
                let platform = 'Windows';
                record[platform] = new Big(0);

                async.eachSeries(PLATFORM_TO_MARKET[platform], (market, done) => {
                    Turnover.getTurnoverByMarketAndDateRange(market, start, end, (err, result) => {
                        if (err) return done(err);

                        record[platform] = record[platform].plus(result);
                        done();
                    });
                }, err => {
                    if (err) return cb(err);

                    record[platform] = record[platform].toFixed(2);
                    cb();
                });
            }
        ], err => {
            if (err) return callback(err);

            if (start.isSame(end)) {
                record.date = end.format('DD/MM');
            } else if (end.isSameOrBefore(endTime)) {
                record.date = start.format('DD/MM') + ' - ' + end.format('DD/MM');
            } else {
                record.date = start.format('DD/MM') + ' - ' + endTime.format('DD/MM');
            }

            output.push(record);

            if (start.isSameOrAfter(endTime)) return callback();

            return exec(start.add(1, unit), callback);
        });
    }

    exec(startTime, err => {
        res.json({status: !err, data: output});
    });
};

let appTopCountry = function(req, res) {
    let start = req.body.start;
    let end = req.body.end;
    if (!start || !end) return res.json({status: false});

    let startTime = moment(start, 'DD/MM/YYYY').startOf('day');
    let endTime = moment(end, 'DD/MM/YYYY').add(1, 'days').startOf('day');

    Turnover.getTurnoverByCountry(startTime, endTime, (err, result) => {
        res.json({status: !err, data: result});
    });
};

module.exports = function(app) {
    app.get('/item-chart', staticsMain);
    app.post('/item-chart/total', appTotal);
    // app.post('/item-chart/by-product', appByProduct);
    app.post('/item-chart/top-purchase', appTopPurchase);
    app.post('/item-chart/total-by-type', appTotalProduct);
    app.post('/item-chart/total-by-platform', appTotalPlatform);
    app.post('/item-chart/top-country', appTopCountry);
};
