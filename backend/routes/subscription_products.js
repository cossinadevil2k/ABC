'use strict';

let mongoose = require('mongoose');
let ItemModel = mongoose.model('Item');
let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let fs = require('fs');
let async = require('async');
let product_json_path = config.subscriptionProduct;
let product_json_path_android = config.subscriptionProduct.split('.json')[0] + '_android.json';
let product_json_path_ios = config.subscriptionProduct.split('.json')[0] + '_ios.json';
let product_json_path_windows = config.subscriptionProduct.split('.json')[0] + '_windows.json';

let getProduct = function (req, res) {
    let query = { type: 2 };
    let skip = 0;
    let limit = 50;

    ItemModel.findAll(query, skip, limit, (err, list) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: list });
    })
};

let addProduct = function (req, res) {
    let item_info = req.body;
    let platform = [];

    if (!item_info) {
        return res.json({ s: false });
    }

    if (item_info.android === true) {
        platform.push('android');
    }

    if (item_info.ios === true) {
        platform.push('ios');
    }

    if (item_info.windows === true) {
        platform.push('windows');
    }

    if (item_info.metadata) {
        item_info.metadata.platform = platform;
    } else {
        item_info.metadata = {};
        item_info.metadata.platform = platform;
    }

    item_info.type = 2;
    item_info.isFree = false;

    ItemModel.createItem(item_info, (err) => {
        res.json({ s: !err });
    });
};

let buildProduct = function (req, res) {
    ItemModel.getSubscriptionDataForCache((err, list) => {
        if (err) {
            return res.json({ s: false });
        }

        let timeStamp = parseInt(new Date().getTime() / 1000, 10);
        let newData = { t: timeStamp, data: list };
        let android_list = [];
        let ios_list = [];
        let windows_list = [];
        async.series({
            buildDefault: function (cb) {
                fs.writeFile(product_json_path, JSON.stringify(newData), { encoding: 'utf8', flag: 'w+' }, function (err) {
                    if (err) {
                        cb(err, null);
                    } else {
                        cb(null, null);
                    }
                });
            },
            buildByPlatform: function (cb) {
                async.series({
                    distibutePlatform: function (done) {
                        async.eachSeries(list, function (item, next) {
                            if (item.metadata) {
                                if (item.metadata.platform) {
                                    if (item.metadata.platform.indexOf('android') != -1) {
                                        android_list.push(item);
                                    }

                                    if (item.metadata.platform.indexOf('ios') != -1) {
                                        ios_list.push(item);
                                    }

                                    if (item.metadata.platform.indexOf('windows') != -1) {
                                        windows_list.push(item);
                                    }
                                }
                            }

                            next();
                        }, done);
                    },
                    buildPlatform: function (done) {
                        async.series({
                            buildAndroidFile: function (next) {
                                let newDataAndroid = { t: timeStamp, data: android_list };
                                fs.writeFile(product_json_path_android, JSON.stringify(newDataAndroid), { encoding: 'utf8', flag: 'w+' }, next);
                            },
                            buildIosFile: function (next) {
                                let newDataIos = { t: timeStamp, data: ios_list };
                                fs.writeFile(product_json_path_ios, JSON.stringify(newDataIos), { encoding: 'utf8', flag: 'w+' }, next);
                            },
                            buildWindowFile: function (next) {
                                let newDataWindows = { t: timeStamp, data: windows_list };
                                fs.writeFile(product_json_path_windows, JSON.stringify(newDataWindows), { encoding: 'utf8', flag: 'w+' }, next);
                            }
                        }, done);
                    }
                }, cb);
            }
        }, function (err, result) {
            if (err) {
                return res.json({ s: false });
            }
            res.json({ s: true });
        });
    });
};

let updateProduct = function (req, res) {
    let itemInfo = req.body.item;
    let item_id = itemInfo._id;
    let platform = [];

    if (!item_id) {
        return res.json({ s: false });
    }

    if (itemInfo.android === true) {
        platform.push('android');
    }

    if (itemInfo.ios === true) {
        platform.push('ios');
    }

    if (itemInfo.windows === true) {
        platform.push('windows');
    }

    if (itemInfo.metadata) {
        itemInfo.metadata.platform = platform;
    } else {
        itemInfo.metadata = {};
        itemInfo.metadata.platform = platform;
    }

    delete itemInfo._id;

    if (itemInfo.__v) {
        delete itemInfo.__v;
    }

    ItemModel.editItemById(item_id, itemInfo, (err) => {
        res.json({ s: !err });
    });
};

let deleteProduct = function (req, res) {
    let item_id = req.body.id;

    if (!item_id) {
        return res.json({ s: false });
    }

    ItemModel.findByIdAndRemove(item_id, (err) => {
        res.json({ s: !err });
    });
};

let appGiftList = function (req, res) {
    let query = { type: 2, markAsGift: true };

    ItemModel.find(query, (err, result) => {
        res.json({ s: !err, d: result });
    });
};

let appChangeMarkAsGift = function (req, res) {
    let id = req.body.id;
    if (!id) return res.json({ s: false });

    ItemModel.findById(id, 'markAsGift', (err, product) => {
        if (err || !product) return res.json({ s: false });

        ItemModel.findByIdAndUpdate(id, { $set: { markAsGift: !product.markAsGift } }, err => {
            res.json({ s: !err });
        });
    });
};

module.exports = function (app, config) {
    app.get('/subscription-products', staticsMain);
    app.post('/subscription-products/add', addProduct);
    app.post('/subscription-products/get', getProduct);
    app.post('/subscription-products/gift', appGiftList);
    app.post('/subscription-products/build', buildProduct);
    app.post('/subscription-products/update-item', updateProduct);
    app.post('/subscription-products/delete', deleteProduct);
    app.post('/subscription-products/change-mark-as-gift', appChangeMarkAsGift);
};
