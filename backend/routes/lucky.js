var env = process.env.NODE_ENV;
var mongoose = require('mongoose');
var Lucky = mongoose.model('Lucky');

var getAll = function(req ,res){
    Lucky.find(function(err, items){
        if(err) res.json({s: false});
        else res.json({s: true, d: items});
    })
};

var addNew = function(req, res){
    var item = req.body;
    
    Lucky.addNew(item, function(err, result){
        if(err || !result) res.json({s: false});
        else res.json({s: true});
    });
};

var remove = function(req, res){
    var id = req.body.itemId;
    
    Lucky.findByIdAndRemove(id, function(err, result){
        res.send({s: (!err)});
    })
};

var getProduct = function(req, res){
    var url = '../../app/public/icon_pack/icon_pack.json',
        url_dev = '../../app/public/icon_pack/icon_pack_debug.json';
    var products = (env == 'production')? require(url) : require(url_dev);
    res.json({s: true, d: products});
};

module.exports = function(app, config){
    app.get('/lucky', staticsMain);
    app.get('/lucky/*', staticsMain);
    app.post('/lucky/get-item', getAll);
    app.post('/lucky/add-new', addNew);
    app.post('/lucky/remove', remove);
    app.post('/lucky/get-product', getProduct)
};
