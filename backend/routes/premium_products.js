'use strict';

let mongoose = require('mongoose');
let ItemModel = mongoose.model('Item');

Array.prototype.trimStringElement = function(){
    this.forEach((element, index) => {
        if (typeof element === 'string') {
            this[index] = element.trim();
        }
    });
};

const TYPE = {
    ICON: 1,
    SUBSCRIPTION: 2,
    USE_CREDIT: 3,
    PREMIUM: 5,
    SEMI_PREMIUM: 6,
    OTHER: 99
};

let appList = function(req, res){
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;
    let query = {
        type: {
            $in: [TYPE.PREMIUM, TYPE.SEMI_PREMIUM, TYPE.OTHER]
        }
    };

    ItemModel.findAll(query, skip, limit, (err, data) => {
        if (err) {
            return res.json({s: false});
        }

        res.json({s: true, d: data});
    });
};

let appCreate = function(req, res){
    let product_id = req.body.product_id;
    let name = req.body.name;
    let alias = req.body.alias;
    let type = req.body.type;
    let price_gl = req.body.price_gl;
    let price_vn = req.body.price_vn;
    let isPublic = req.body.isPublic;
    let metadata = req.body.metadata;

    if (!product_id || !name || !type || !price_gl || !price_vn) {
        return res.json({s: false});
    }

    let itemInfo = {
        name: name,
        product_id: product_id,
        alias: alias,
        type: type,
        isPublic: isPublic,
        price_gl: price_gl,
        price_vn: price_vn,
        metadata : metadata
    };

    ItemModel.createItem(itemInfo, (err) => {
        res.json({s: !err});
    });
};

let appDelete = function(req, res){
    let product_id = req.body.product_id;

    ItemModel.removeItemById(product_id, (err) => {
        res.json({s: !err});
    });
};

let appEdit = function(req, res){
    let info = req.body.product;
    let product_id = info._id;
    delete info._id;

    info.alias.trimStringElement();

    ItemModel.editItemById(product_id, info, (err) => {
        res.json({s: !err});
    });
};

module.exports = function(app, config){
    app.get('/premium-products', staticsMain);
    app.post('/premium-products/list', appList);
    app.post('/premium-products/create', appCreate);
    app.post('/premium-products/delete', appDelete);
    app.post('/premium-products/edit', appEdit);
};