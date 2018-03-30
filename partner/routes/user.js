'use strict';

var mongoose = require('mongoose');

var utils = require('../../helper/utils');

var UserModel = mongoose.model('User');

function findElastic(tags, skip, limit, callback) {
    let query = utils.createUserQuery(tags);

    var options = {
        hydrate: true,
        sort: {
            createdDate: {order: "desc"}
        },
        from: skip,
        size: limit
    };

    UserModel.search(query, options, function(err, results){
        callback(err, results.hits.hits);
    });
}

var appList = function(req, res) {
    let skip = req.body.skip;
    let limit = req.body.limit;
    
    let provider = req.session.partnerProvider;
    let tag = `linked:${provider}`;
    
    findElastic(tag, skip, limit, function(err, userList){
        if (err) {
            res.send({s: false});
        } else {
            res.send({s: true, d: userList});
        }
    });
};


module.exports = function(app, config){
    app.get('/users', staticsMain);
    app.post('/users/list', appList);
};
