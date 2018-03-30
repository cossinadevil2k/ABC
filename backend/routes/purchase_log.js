'use strict';

let LogDB = require('../../model/helper/mongodb_connect_logs');
let ItemLogModel = LogDB.model('ItemLog');
let mongoose = require('mongoose');

let appList = function(req, res){
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 50;

    ItemLogModel.findAll({}, skip, limit, (err, data) => {
        if (err) {
            // console.log(err);
            return res.json({s: false});
        }

        res.json({s: true, d: data});
    });
};

module.exports = function(app, config){
    app.get('/item-log', staticsMain);

    app.post('/item-log/list', appList);
};
