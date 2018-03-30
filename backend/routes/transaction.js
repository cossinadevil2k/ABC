'use strict';

let mongoose = require('mongoose');
let TransactionModel = mongoose.model('Transaction');
let DeviceModel = mongoose.model('Device');

function checkSystemAdmin(req, res, next){
    if (!req.session.adminSystem) {
        return res.send('You have no permission to access this page');
    }

    next();
}

let appList = function(req, res){
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 50;

    TransactionModel.find()
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'account',
            populate: {
                path: 'owner'
            }
        })
        .populate('category')
        .exec((err, data) => {
            res.json({s: !err, d: data});
        });
};

let appGetOne = function(req, res){
    let id = req.body.id;

    if (!id) {
        return res.json({s: false});
    }

    TransactionModel.findById(id).lean().exec((err, data) => {
        res.json({s: !err, d: data});
    });
};

let appGetDevice = function(req, res){
    let tokenDevice = req.body.tokenDevice;

    if (!tokenDevice) {
        return res.json({s: false});
    }

    DeviceModel.findOne({tokenDevice: tokenDevice}, (err, device) => {
        res.json({s: !err, d: device});
    });
};

module.exports = function(app, config){
    app.get('/transaction', checkSystemAdmin, staticsMain);
    app.post('/transaction/list', appList);
    app.post('/transaction/get-one', appGetOne);
    app.post('/transaction/get-device', appGetDevice);
};