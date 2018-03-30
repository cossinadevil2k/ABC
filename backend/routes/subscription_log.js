var mongoose = require('mongoose');
var Log = mongoose.model('SubscriptionLog');
var User = mongoose.model('User');

var getAll = function(req, res){
    var skip = req.body.skip,
        limit = req.body.limit;

    Log.getAll(skip, limit, function(err, list){
        if(err) res.json({s: false});
        else res.json({s: true, d: list});
    });
};

var getByUserEmail = function(req, res){
    var email = req.body.email,
        skip = req.body.skip,
        limit = req.body.limit;

    User.findByEmail(email, function(err, user){
        if(err || !user) res.json({s: false});
        else {
            Log.getByPayer(user._id, skip, limit, function(err2, list){
                if(err2) res.json({s: false});
                else res.json({s: true, d: list});
            })
        }
    });
};

var getByUserId = function(req, res){
    var userId = req.body.userId,
        skip = req.body.skip,
        limit = req.body.limit;

    Log.getByPayer(userId, skip, limit, function(err, list){
        if (err) res.json({s: false});
        else res.json({s: true, d: list});
    })
};

module.exports = function(app, config){
    app.get('/subscription-log', staticsMain);
    app.post('/subscription-log/get-all', getAll);
    app.post('/subscription-log/get-by-user-email', getByUserEmail);
    app.post('/subscription-log/get-by-user-id', getByUserId);
};