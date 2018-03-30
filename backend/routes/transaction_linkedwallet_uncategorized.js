'use strict';

let mongoose = require('mongoose');
let PushController = require('../../model/sync/push_controller');

const SyncCodes = require('../../config/sync_codes');
let redisClient= require('../../config/database').redisClient;

let TransactionModel = mongoose.model('Transaction');
let WalletModel = mongoose.model('Account');
let CategoryModel = mongoose.model('Category');

const TOTAL_LINKED_WALLET_KEY = 'total_linked_wallet';
const CACHED_CATEGORY_LIST = 'cached_category_list';
const HASH_NAME = 'uncategorized_transaction_cache';

let appList = function(req, res){
    const skip = req.body.skip || 0;
    const limit = req.body.limit;

    if (!limit) {
        return res.json({s: false});
    }

    function countTotalLinkedWallet(){
        return new Promise((resolve, reject) => {
            WalletModel.count({account_type: {$gt: 0}}, (err, count) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(count);
                }
            });
        });
    }

    function getCachedTotalLinkedWallet(){
        return new Promise((resolve, reject) => {
            redisClient.HGET(HASH_NAME, TOTAL_LINKED_WALLET_KEY, (err, count) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(count);
                }
            })
        });
    }

    function getCachedCategoryList(){
        return new Promise((resolve, reject) => {
            redisClient.HGET(HASH_NAME, CACHED_CATEGORY_LIST, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });
    }

    function cacheData(key, value){
        return new Promise((resolve, reject) => {
            redisClient.HSET(HASH_NAME, key, value, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        });
    }

    function checkLinkedWalletAmount(){
        return new Promise((resolve, reject) => {
            countTotalLinkedWallet()
                .then((current_count) => {
                    getCachedTotalLinkedWallet()
                        .then((cached_count) => {
                            if (cached_count == current_count) {
                                resolve(true);
                            } else {
                                resolve(false);
                                cacheData(TOTAL_LINKED_WALLET_KEY, current_count);
                            }
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    function getLinkedWallet(has_cache) {
        return new Promise((resolve, reject) => {
            if (has_cache) {
                return resolve({has_cache: true});
            }

            WalletModel.aggregate(
                {
                    $match: {
                        isDelete: false,
                        account_type: {$gt: 0}
                    }
                },
                {
                    $group: {
                        _id: 'wallets',
                        list: {$addToSet: '$_id'}
                    }
                },
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({list_wallet: result[0].list});
                    }
                }
            );
        });
    }

    function getOtherCategoryByWallet(data){
        return new Promise((resolve, reject) => {
            if (data.has_cache) {
                return getCachedCategoryList()
                    .then((raw_data) => {
                        resolve(JSON.parse(raw_data));
                    })
                    .catch(reject);
            }

            CategoryModel.aggregate(
                {
                    $match: {
                        account: {$in: data.list_wallet},
                        isDelete: false,
                        metadata: {$in: ['IS_OTHER_INCOME', 'IS_OTHER_EXPENSE']}
                    }
                },
                {
                    $group: {
                        _id: 'categories',
                        list: {$addToSet: '$_id'}
                    }
                },
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        cacheData(CACHED_CATEGORY_LIST, JSON.stringify(result[0].list));
                        resolve(result[0].list);
                    }
                }
            )
        });
    }

    function getTransactionByCategory(list_category){
        return new Promise((resolve, reject) => {
            TransactionModel.find({category: {$in: list_category}})
                .sort({createdAt: -1})
                .skip(skip)
                .limit(limit)
                .populate('account')
                .populate('category')
                .exec((err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
        });
    }

    checkLinkedWalletAmount()
        .then(getLinkedWallet)
        .then(getOtherCategoryByWallet)
        .then(getTransactionByCategory)
        .then((transactions) => {
            res.json({s: true, d: transactions})
        })
        .catch((err) => {
            // console.log(err);
            res.json({s: false});
        });


    // TransactionModel.find()
    //     .sort('-createdAt')
    //     .skip(skip)
    //     .limit(limit)
    //     .populate({
    //         path: 'account',
    //         match: {
    //             account_type: {
    //                 $gt: 0
    //             }
    //         }
    //     })
    //     .populate({
    //         path: 'category',
    //         match: {
    //             metadata: {
    //                 $in: ['IS_OTHER_INCOME', 'IS_OTHER_EXPENSE']
    //             }
    //         }
    //     })
    //     .exec((err, result) => {
    //         if (err) {
    //             console.log(err);
    //             return res.json({s: false});
    //         }
    //
    //         res.json({s: true, d: result});
    //     });
};

let appChangeCategory = function(req, res){
    let new_category_id = req.body.nc;
    let transaction = req.body.tr;
    let account_id = transaction.account._id;
    let user_id = transaction.account.owner;

    if (!new_category_id || !transaction || !account_id || !user_id) {
        return res.json({s: false});
    }

    changeCategory()
        .then(sendNotification)
        .then(() => {
            res.json({s: true});
        })
        .catch((err) => {
            // console.log(err);
            res.json({s: false});
        });

    //TODO change category
    function changeCategory(){
        return new Promise((resolve, reject) => {
            TransactionModel.findOne({_id: transaction._id}, (err, transaction) => {
                if (err) {
                    return reject(err);
                }

                if (!transaction) {
                    return reject(new Error('Transaction Not Found'));
                }

                transaction.category = new_category_id;

                transaction.save((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            });
        });
    }

    //TODO f600
    function sendNotification(){
        let info = {
            flag: SyncCodes.TRANSACTION,
            wallet_id: account_id,
            user_id: user_id
        };

        return PushController.pushSyncNotification(info);
    }
};

module.exports = function (app, config) {
    app.get('/uncategorized-transaction', staticsMain);
    app.post('/uncategorized-transaction/list', appList);
    app.post('/uncategorized-transaction/change_category', appChangeCategory);
};