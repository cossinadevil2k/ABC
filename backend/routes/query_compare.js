'use strict';

var mongoose = require('mongoose');
var UserModel = mongoose.model('User');
var TagsString = require('../../config/tag_constant');

var async = require('async');
var moment = require('moment');

function createUserQuery(input, startDate, endDate){
    var query = [];
    var queryItems = input.split('&&');
    var notQuery = {};

    queryItems.forEach(function(element){
        if (element.length > 0) {
            element = element.trim();
            var index = element.indexOf('recentdays:');
            if (index != -1) {
                //var days = parseInt((element.split(':')[1]), 10);
                //startDate = moment().startOf('day').subtract(days, 'days').format();
            }
            else if (element.indexOf('!' + TagsString.PURCHASE_PREMIUM) != -1){
                notQuery.notPremium = true;
            } else if (element.indexOf('limit:') === -1 && element.indexOf('skip:') === -1) {
                query.push(element);
            }
        }
    });

    query.forEach(function(element, index){
        var a = element.split(',');
        var b = [];
        a.forEach(function(e2){
            if (e2.length > 0) b.push(e2.trim());
        });
        if (b.length > 0) query[index] = {terms: {tags: b}};
    });

    if (startDate && endDate) {
        query.push({
            range: {
                createdDate: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
    }

    var result = {
        filtered: {
            filter: {
                bool: {
                    must: query
                }
            }
        }
    };

    if (notQuery.notPremium) {
        if (!result.filtered.filter.bool.must_not) {
            result.filtered.filter.bool.must_not = [];
        }
        result.filtered.filter.bool.must_not.push({terms: {tags: [TagsString.PURCHASE_PREMIUM]}});
    }

    return result;
}

function countUserByQuery(rawQuery, startDate, endDate){
    var aggs = {
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

    var query = createUserQuery(rawQuery, startDate, endDate);

    var promise = new Promise(function(resolve, reject){
        UserModel.search(query, aggs, function(err, result){
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });

    return promise;
}

function findUserByQuery(rawQuery){
    var query = createUserQuery(rawQuery);

    var promise = new Promise(function(resolve, reject){
        UserModel.search(query, function(err, result){
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });

    return promise;
}

/*****/



var appCompare = function(req, res){
    var postData = req.body;

    if (!postData.queries || !postData.startDate || !postData.endDate) {
        return res.json({s: false});
    }

    var queries = postData.queries;
    var startDate = moment(postData.startDate, 'DD/MM/YYYY');
    var endDate = moment(postData.endDate, 'DD/MM/YYYY');
    var data = [];
    var total = [];

    async.eachSeries(queries, function(query, cb){
        countUserByQuery(query, startDate, endDate)
            .then(function(result){
                data.push(result.aggregations.user_by_time.buckets);

                findUserByQuery(query)
                    .then(function(data){
                        total.push(data.hits.total);

                        cb();
                    }).catch(function(err){
                        cb(err);
                    });
            })
            .catch(function(error){
                // console.log(error);
                cb(error);
            });
    }, function(error){
        if (error) {
            res.json({s: false, e: error});
        } else {
            res.json({s: true, d: data, t: total});
        }
    });
};

module.exports = function(app, config){
    app.get('/query-compare', staticsMain);
    app.post('/query-compare/compare', appCompare);
};

