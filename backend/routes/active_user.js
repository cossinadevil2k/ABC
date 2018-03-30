'use strict';

const mongoose = require('mongoose');
const moment = require('moment');
const async = require('async');

const User = mongoose.model('User');
const StatsDaily = mongoose.model('statsDaily');

const inactiveMinimumDay = 15;

const TABLE_CODE_USER_COUNTRY = {
    7: 1703,
    30: 1704,
    100: 1705
};

function getActiveUser(days, skip, limit, sort, callback){
    let minimumDate = moment().subtract(days, 'day').startOf('day');

    let query = {lastSync: {$gte: minimumDate}};

    User.find(query)
        .sort({
            lastSync: (sort === 'asc')? 1: -1
        })
        .skip(skip)
        .limit(limit)
        .exec(callback);
}

let appCount = function(req, res){
    const days = [7, 30, 100];

    let result = {};

    async.each(days, (day, cb) => {
        let minimumDate = moment().subtract(day, 'day').startOf('day');
        let query = {lastSync: {$gte: minimumDate}, createdDate: {$lt: minimumDate}};

        User.count(query, (err, count) => {
            if (err) return cb(err);

            result[day] = count;

            cb();
        });
    }, (error) => {
        if (error) {
            return res.json({s: false});
        }

        User.count((errTotal, countTotal) => {
            if (errTotal) return res.json({s: false});

            result.total = countTotal;
            res.json({s: true, d: result});
        });
    });


};

let appGet = function(req, res){
    let minimumDay = req.body.day || inactiveMinimumDay;
    let skip = req.body.skip;
    let limit = req.body.limit;
    let sort = req.body.sort || 'desc';

    if (!limit) {
        return res.send({s: false});
    }

    if (sort !== 'asc' || sort !== 'desc') {
        return res.send({s: false});
    }

    getActiveUser(minimumDay, skip, limit, sort)
        .then((user_list) => {
            res.json({s: true, d: user_list});
        })
        .catch((err) => {
            res.json({s: false});
        });
};

let appUserByCountry = function(req, res){
    let dayType = req.body.day;

    if (!dayType) return res.json({s: false});

    let tableCode = TABLE_CODE_USER_COUNTRY[dayType];

    if (!tableCode) return res.json({s: false});

    StatsDaily.findOne({table: tableCode})
        .sort('-createAt')
        .exec((err, data) => {
            if (err) return res.json({s: false});

            res.json({s: true, d: data});
        });
};

module.exports = function(app, config){
    app.get('/active', staticsMain);

    app.post('/active/count', appCount);
    app.post('/active/get', appGet);
    app.post('/active/user-by-country', appUserByCountry);
};
