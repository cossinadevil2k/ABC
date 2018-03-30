var mongoose = require('mongoose');
var Coupon = mongoose.model('Coupon');

var appGet = function(req, res){
    var option = req.body.option,
        skip = req.body.skip || 0,
        limit = req.body.limit || 0;

    Coupon.getAllForBackend(option, skip, limit, function(err, result){
        if (err) res.json({s: false});
        else res.json({s: true, d: result});
    });
};

var appNew = function(req, res){
    var postData = req.body;
    postData.creator = req.session.adminId;

    Coupon.addNew(postData, function(err, result){
        if (err) res.json({s: false});
        else res.json({s: true, d: result});
    });
};

var appEdit = function(req, res){
    var postData = req.body;

    if(!postData) return res.json({s: false});

    Coupon.edit(postData, function(err){
        if (err) res.json({s: false});
        else res.json({s: true});
    });
};

var appDelete = function(req, res){
    var couponId = req.body.id;

    if (!couponId) return res.json({s: false});

    Coupon.deleteCoupon(couponId, function(err){
        if (err) res.json({s: false});
        else res.json({s: true});
    })
};

module.exports = function(app, config){
    app.get('/coupon', staticsMain);
    app.post('/coupon/get-all', appGet);
    app.post('/coupon/new', appNew);
    app.post('/coupon/edit', appEdit);
    app.post('/coupon/delete', appDelete);
};