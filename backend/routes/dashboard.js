/*
 Dashboard
 */

'use strict';

let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let utils = require('../../helper/utils');
let moment = require('moment');
let async = require('async');
let elasticsearch = require('elasticsearch');
let esClient = new elasticsearch.Client({
    host: config.elasticsearch.hostUrl
});

const USER_COUNT_MODE = {
    DAILY: 1,
    MONTHLY: 2,
    YEARLY: 3
};

let mongoose = require('mongoose');
let UserModel = mongoose.model('User');

let pushLogIndexName = env + '_notification_error';

/**********************/



/**********************/

let appGetDbStats = function(req, res){
    mongoose.connection.db.stats(function(err, stats){
        if(!err) {
            res.send({s: true, stats:stats})
        } else {
            res.send({s: false})
        }
    });
};

let appNotificationFailList = function(req, res){
    let skip = req.body.skip;
    let limit = req.body.limit;
    
    let options = {
        index: pushLogIndexName,
        from: skip,
        size: limit
    };
    
    esClient.search(options, function(error, results){
        if (error) {
            // console.log(error);
            res.json({s: false, d: []});
        } else {
            res.json({s: true, d: results.hits.hits});
        }
    });
};

let appUserStats = function(req, res) {
    let startTime = req.body.start_time;
    let endTime = req.body.end_time;
    let mode = req.body.mode;
    let start;
    let end;
    let result = [];
    
    if (!startTime || !endTime || !mode || [1, 2, 3].indexOf(mode) === -1) {
        return res.json({status: false});
    }


    if (mode === USER_COUNT_MODE.DAILY) {
        start = moment(startTime, 'DD/MM/YYYY');
        end = moment(endTime, 'DD/MM/YYYY').add(1, 'days');
    } else if (mode === USER_COUNT_MODE.MONTHLY) {
        start = moment(startTime, 'DD/MM/YYYY').startOf('month');
        end = moment(endTime, 'DD/MM/YYYY').add(1, 'months').startOf('month');
    } else {
        start = moment(startTime, 'DD/MM/YYYY').startOf('year');
        end = moment(endTime, 'DD/MM/YYYY').add(1, 'years').startOf('year');
    }

    countNewUser(start, err => {
        res.json({status: !err, data: result});
    });

    function countNewUser(st, cb) {
        let et;
        let format;

        if (mode === USER_COUNT_MODE.DAILY) {
            et = moment(st).add(1, 'days');
            format = 'DD/MM/YYYY';
        } else if (mode === USER_COUNT_MODE.MONTHLY) {
            et = moment(st).add(1, 'months');
            format = 'MM/YYYY';
        } else {
            et = moment(st).add(1, 'years');
            format = 'YYYY';
        }

        let query = {
            createdDate: {
                $gte: st,
                $lt: et
            }
        };

        UserModel.count(query, (err, count) => {
            if (err) return cb(err);

            result.push({
                date: st.format(format),
                total: count
            });

            if (et.isSameOrAfter(end)) return cb();

            return countNewUser(et, cb);
        });
    }
};

let appUserDesktop = function(req, res) {
    let query = utils.createUserQuery('device:windows');

    UserModel.search(query, {size: 500000}, (err, result) => {
        if (err) return res.json({status: false});

        let count = 0;

        async.eachSeries(result.hits.hits, (user, done) => {
            async.setImmediate(function() {
                if (!user || !user._source.tags || user._source.tags.length === 0) return done();

                let hasOtherMobilePlatform = false;

                user._source.tags.forEach(tag => {
                    if (tag.indexOf('device:') !== -1) {
                        let platform = tag.split(':')[1];

                        if (platform !== 'windows' && platform !== 'web') {
                            hasOtherMobilePlatform = true;
                        }
                    }
                });

                if (hasOtherMobilePlatform) count++;

                done();
            });
        }, err => {
            res.json({status: !err, total: result.hits.total, hasMobile: count});
        });
    });
};

let appUserWeb = function(req, res) {
    let query = utils.createUserQuery('device:web');

    UserModel.search(query, {size: 500000}, (err, result) => {
        if (err) return res.json({status: false});

        let count = 0;

        async.eachSeries(result.hits.hits, (user, done) => {
            async.setImmediate(function() {
                if (!user || !user._source.tags || user._source.tags.length === 0) return done();

                let hasOtherMobilePlatform = false;

                user._source.tags.forEach(tag => {
                    if (tag.indexOf('device:') !== -1) {
                        let platform = tag.split(':')[1];

                        if (platform !== 'windows' && platform !== 'web') {
                            hasOtherMobilePlatform = true;
                        }
                    }
                });

                if (hasOtherMobilePlatform) count++;

                done();
            });
        }, err => {
            res.json({status: !err, total: result.hits.total, hasMobile: count});
        });
    });
};

let appLoadPermission = function(req,res){
   if(!req.session){
       return res.json({
            status : false
       });
   }

   return res.json({
       status : true,
       data : req.session
   });
}

module.exports = function(app, config){
    app.post('/dbstats', appGetDbStats);
    app.get('/notification-fail', staticsMain);
    app.post('/notification-fail/list', appNotificationFailList);
    app.get('/dashboard/*', staticsMain);
    app.post('/dashboard/user-stats', appUserStats);
    app.post('/dashboard/user-desktop', appUserDesktop);
    app.post('/dashboard/user-web', appUserWeb);
    app.post('/permission/load',appLoadPermission);
};
