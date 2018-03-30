var mongoose = require('mongoose');
var Code = mongoose.model('SubscriptionCode');

var genCode = function(req, res){
    var amount = req.body.amount,
        hasExpire = req.body.hasExpire,
        expireDate = req.body.expireDate || null,
        product = req.body.productId;

    if (!amount || !product || (hasExpire && !expireDate)) return res.json({s: false});

    Code.addCode(amount, product, expireDate, function(err, result){
        if (err) res.json({s: false});
        else res.json({s: true});
    });
};

var getCode = function(req, res){
    var product = req.body.product || null,
        skip = req.body.skip,
        limit = req.body.limit,
        filter = req.body.filter;

    var option = null;
    if (filter) option = {filter: filter};

    Code.findByProduct(product, skip, limit, option, function(err, result){
        if (err) res.json({s: false});
        else res.json({s: true, d: result});
    });
};

var getProduct = function(req, res){
    var list = require('../../landing-page/data/subscription_product.json');
    res.json({s: true, d: list});
};

var countCode = function(req, res){
    var productId = req.body.productId || null;

    Code.getInfo(productId, function(err, result){
        res.json({s: true, d: result});
    });
};

module.exports = function(app, config){
    app.get('/subscription-code', staticsMain);
    app.post('/subscription-code/product-list', getProduct);
    app.post('/subscription-code/get', getCode);
    app.post('/subscription-code/count', countCode);
    app.post('/subscription-code/generate', genCode);
};