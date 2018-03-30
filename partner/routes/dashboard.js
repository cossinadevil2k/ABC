'use strict';

var env = process.env.NODE_ENV;

var config = require('../../config/config')[env];
var utils = require('../../helper/utils');

var mongoose = require('mongoose');
var elasticsearch = require('elasticsearch');
var async = require('async');
var moment = require('moment');

var WalletModel = mongoose.model('Account');
var UserModel = mongoose.model('User');

var esClient = new elasticsearch.Client({
    host: config.elasticsearch.hostUrl
});

function countElastic(table, tags, callback) {
    let index = `${env}_${table}`;
    
    let query = utils.createUserQuery(tags);
    
    esClient.count({
        index: index,
        body: {query: query}
    }, function(err, result){
        callback(err, result.count);
    });
}

function createUserQuery(input, startDate, endDate){
    let query = utils.createUserQuery(input);

    query.filtered.filter.bool.must.push({
        range: {
            createdDate: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    return query;
}

function countWalletByDay(provider, startDate, endDate){
    return new Promise(function (resolve, reject) {
        WalletModel.aggregate(
            {
                $match: {
                    'createdAt': {$gte: startDate._d, $lte: endDate._d},
                    'rwInfo.service_id': provider
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
                    dailyStats: {
                        $push: {
                            ngay: '$_id.days',
                            count: "$total"
                        }
                    }
                }
            },
            function(err, result){
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }
        );
    });
}

function coundUserByQuery(rawQuery, startDate, endDate){
    let aggs = {
        aggs: {
            'user_by_time': {
                date_histogram: {
                    field: 'createdDate',
                    interval: 'day',
                    format: 'dd-MM-yyyy'
                }
            }
        }
    };

    let query = createUserQuery(rawQuery, startDate, endDate);

    var promise = new Promise(function(resolve, reject){
        UserModel.search(query, aggs, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.aggregations.user_by_time.buckets);
            }
        });
    });

    return promise;
}

var appStats = function(req, res) {
    let provider = req.session.partnerProvider;

    let tags = `linked:${provider}`;

    let countUserByProvider = function(callback) {
        countElastic('user', tags, callback);
    };

    let countWalletByProvider = function(callback) {
        WalletModel.count({"rwInfo.p_code": provider}, callback)
    };

    async.parallel({
        users: countUserByProvider,
        wallets: countWalletByProvider
    }, function(err, results){
        if (err) {
            res.send({s: false});
        } else {
            res.send({s: true, d: results});
        }
    });
};

var appCharts = function(req, res){
    let provider = req.session.partnerProvider;

    let postData = req.body;
    let startDate = moment(postData.startDate);
    let endDate = moment(postData.endDate).endOf('day');

    countWalletByDay(provider, startDate, endDate)
        .then((result) => {
            res.json({s: true, d: result});
        })
        .catch((err) => {
            res.json({s: false});
        });
};

module.exports = function(app, config){
    app.post('/dashboard/stats', appStats);
    app.post('/dashboard/charts', appCharts);
};
