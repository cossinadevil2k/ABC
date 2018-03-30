'use strict';

require('../model/item_log');

let LogDb = require('../model/helper/mongodb_connect_logs');
let ItemLog = LogDb.model('ItemLog');

let Error = require('../config/error');

function checkServerMaintainLoginRequired(res){
    if (global.isServerMaintain){
        return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
    }
}

function checkServerMaintain(res){
    if (global.isServerMaintain){
        return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
    }
}

function checkLogin(req, res, next) {
    if (!req.user_id) {
        return res.send({s: false, e: Error.USER_NOT_LOGIN});
    }

    next();
}

let appBuy = function(req, res){
    checkServerMaintain(res);

    // let purStt = req.body;
    //
    // if(purStt.gift){
    //     if(purStt.sender){
    //         let admin = purStt.sender,
    //             email = purStt.email,
    //             action = "Give " + purStt.item;
    //         PremiumLog.addNew(email, admin, action, function(result){
    //             if(!result){
    //                 res.send({status: false, msg:"gift_log_error"});
    //             } else {
    //                 res.send({status: true});
    //             }
    //         });
    //     } else {
    //         res.send({status: false, msg:"sender_not_found"});
    //     }
    // } else {
    //     let ps = new PurchasedStat();
    //     ps.appId = purStt.appId;
    //     ps.source = purStt.source;
    //     ps.platform = purStt.pl;
    //     ps.item = purStt.item;
    //
    //     ps.save(function (err, data) {
    //         if (err) res.send({status: false, msg: "purchased_log_error"});
    //         else res.send({status: true, msg: "purchase log saved"});
    //     });
    // }
    
    res.send({status: true});
};

let appItemBuy = function (req, res) {
    let user_id = req.user_id;
    let product_id = req.body.pd;

    if (!product_id) {
        return res.send({s: false})
    }

    res.send({s: true});

    ItemLog.createLog(user_id, product_id, (err) => {

    });
};

module.exports = function(app, config){
    app.post('/purchasedstat/buy', appBuy);
    app.post('/item/buy', checkLogin, appItemBuy);
};