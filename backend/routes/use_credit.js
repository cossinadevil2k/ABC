'use strict';

let mongoose = require('mongoose');
let ItemModel = mongoose.model('Item');

const TYPE = {
    ICON: 1,
    SUBSCRIPTION: 2,
    USE_TURN: 3,
    PREMIUM: 5,
    SEMI_PREMIUM: 6
};

let appCreate = function(req, res){
    let item = req.body.item;

    if (!item || item === {}) {
        return res.json({s: false});
    }

    item.type = TYPE.USE_TURN;

    ItemModel.createItem(item, (err) => {
        if (err) {
            // console.log(err);
        }

        res.json({s: !err});
    });
};

let appList = function(req, res){
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;

    let query = {type: TYPE.USE_TURN};

    ItemModel.findAll(query, skip, limit, (err, data) => {
        if (err) {
            // console.log(err);
            return res.json({s: false});
        }

        res.json({s: true, d: data});
    });
};

let appDelete = function(req, res){
    let id = req.body.id;

    if (!id) {
        return res.json({s: false});
    }

    ItemModel.findByIdAndRemove(id, (err) => {
        res.json({s: !err});
    });
};

let appUpdate = function(req, res){
    let item = req.body.item;
    
    if (!item || item === {}) {
        return res.json({s: false});
    }
    
    let id = item._id;
    delete item._id;
    
    ItemModel.editItemById(id, item, (err) => {
        res.json({s: !err});
    });
};

module.exports = function(app, config){
    app.get('/use-credits', staticsMain);
    app.post('/use-credits/create', appCreate);
    app.post('/use-credits/list', appList);
    app.post('/use-credits/delete', appDelete);
    app.post('/use-credits/update', appUpdate);
};