'use strict';

const Item = require('./item');
const mongoose = require('mongoose');
const UserModel = mongoose.model('User');
const WalletModel = mongoose.model('Account');
const Error = require('../../config/error');
const pushController = require('../../model/sync/push_controller');
const moment = require('moment');
const FinsifyHelper = require('../../helper/finsify-controller/index');
const async = require('async');

const debug = require('debug')('iap-subscription');

const SUBSCRIPTION_KEY = {
    premium: {
        expire: "expireDate",
        product: "subscribeProduct",
        lastPurchase: "lastPurchase",
        firstPurchase: "firstPurchase",
        market: "subscribeMarket"
    },
    linked_wallet: {
        expire: "rwExpire",
        product: "rwProduct",
        lastPurchase: "rwLastPurchase",
        firstPurchase: "rwFirstPurchase",
        market: "rwMarket"
    }
};

class ItemSubscription extends Item {
    constructor() {
        super();

        this.buyOnlyOnce = false;
    }

    __afterPurchase(purchaseInfo) {
        debug('__afterPurchase func');
        return new Promise((resolve, reject) => {
            this.__updateExpireDate(purchaseInfo)
                .then(() => {
                    debug('__reactiveFinsifyAccount ');
                    this.__reactiveFinsifyAccount(purchaseInfo.userId);
                })
                .then(() => {
                    debug('__activeWalletML ');
                    this.__activeWalletML(purchaseInfo.userId);
                })
                .then((expire_date) => {
                    this.constructor.pushNotification(purchaseInfo.userId, expire_date, purchaseInfo.tokenDevice);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    refund() {
        return new Promise((resolve, reject) => {
            UserModel.findById(this.user_id, (err, user) => {
                if (err || !user) {
                    return reject(Error.ERROR_SERVER);
                }

                if (!user.expireDate) {
                    return resolve();
                }

                if (!user.lastPurchase) {
                    user.expireDate = moment();
                    user.lastPurchase = moment();
                } else {
                    user.expireDate = user.lastPurchase;
                }

                user.save(err => {
                    return err ? reject(Error.ERROR_SERVER) : resolve();
                })
            });
        });
    }

    __updateExpireDate(purchaseInfo) {
        if (purchaseInfo.expire_date_ms) {
            debug('__setExpireDate');
            return this.__setExpireDate(purchaseInfo);
        }
        debug('__increaseExpireDate');

        return this.__increaseExpireDate(purchaseInfo);
    }

    __increaseExpireDate(purchaseInfo) {
        // let type = (!this.metadata || !this.metadata.type) ? 'premium' : this.metadata.type;
        let type = 'premium';
        if (purchaseInfo.metadata) {
            if (purchaseInfo.metadata.type) {
                type = purchaseInfo.metadata.type;
            }
        }
        let keyString = SUBSCRIPTION_KEY[type];
        debug('type ', type);

        return new Promise((resolve, reject) => {
            UserModel.findById(purchaseInfo.userId, (err, user) => {
                if (err) {
                    return reject(err);
                }

                let today = moment();

                if (!user[keyString.expire]) user[keyString.expire] = today;
                else if (user[keyString.expire] < today) user[keyString.expire] = today;

                let momentExpire = moment(user[keyString.expire]);
                user[keyString.expire] = momentExpire.add(purchaseInfo.expire_value, purchaseInfo.expire_unit);

                if (purchaseInfo.purchase_date) {
                    user[keyString.lastPurchase] = moment(purchaseInfo.purchase_date, 'yyyy-mm-dd');
                } else {
                    user[keyString.lastPurchase] = moment();
                }

                user[keyString.market] = purchaseInfo.source;
                user[keyString.product] = purchaseInfo.product_id;

                if (!user[keyString.firstPurchase]) {
                    user[keyString.firstPurchase] = user[keyString.lastPurchase];
                }

                user.save(err => {
                    if (err) {
                        return reject(err);
                    }

                    this.__pushNotification(type, user._id, user[keyString.expire], purchaseInfo.tokenDevice);
                    resolve(user[keyString.expire]);
                });
            });
        });
    }

    __setExpireDate(purchaseInfo) {
        let type = 'premium';
        if (purchaseInfo.metadata) {
            if (purchaseInfo.metadata.type) {
                type = purchaseInfo.metadata.type;
            }
        }
        let keyString = SUBSCRIPTION_KEY[type];
        debug('type ', type);

        return new Promise((resolve, reject) => {
            UserModel.findById(purchaseInfo.userId, (err, user) => {
                if (err) {
                    return reject(err)
                }

                if (!user) {
                    return resolve();
                }

                let update = { $set: {} };

                update['$set'][keyString.expire] = new Date(purchaseInfo.expire_date_ms);
                update['$set'][keyString.product] = purchaseInfo.product_id;
                if (purchaseInfo.purchase_date_ms) update['$set'][keyString.lastPurchase] = new Date(purchaseInfo.purchase_date_ms);
                if (purchaseInfo.source) update['$set'][keyString.market] = purchaseInfo.source;

                if (!user[keyString.firstPurchase]) {
                    update['$set'][keyString.firstPurchase] = update['$set'][keyString.lastPurchase];
                }

                UserModel.findByIdAndUpdate(purchaseInfo.userId, update, (err) => {
                    if (err) {
                        return reject(err);
                    }

                    this.__pushNotification(type, user._id, user[keyString.expire], purchaseInfo.tokenDevice);
                    resolve();
                });
            });
        });
    }

    __pushNotification(type, user_id, expire_date, tokenDevice) {
        if (type === 'premium') {
            pushController.pushSubscriptionRenew(user_id, expire_date, tokenDevice);
        } else {
            pushController.pushLinkedWalletRenew(user_id, expire_date, tokenDevice);
        }
    }

    __findWalletByUser(user_id) {
        return new Promise((resolve, reject) => {
            WalletModel.getLinkedWalletListByUserId(user_id, (wallets) => {
                debug('__findWalletByUser ', wallets);
                return resolve(wallets);
            });
        })
    }

    __activeWalletML(user_id) {
        return new Promise((resolve, reject) => {
            this.__findWalletByUser(user_id).then((wallets) => {
                async.eachSeries(wallets, (wallet, next) => {

                    let walletId = wallet._id;
                    debug('__activeWalletML ', walletId)
                    WalletModel.activeLinkedWallet(walletId, next);
                }, (error) => {
                    resolve();
                });
            }).catch((error) => {
                reject(error);
            })
        });
    }

    __reactiveFinsifyAccount(userId) {
        // console.log('__reactiveFinsifyAccount function');

        return new Promise((resolve, reject) => {
            this.__findLoginSecretFromUserId(userId)
                .then((data) => {
                    debug('__findLoginSecretFromUserId data ', data);
                    FinsifyHelper.activeFinsifyAccount(data)
                        .then((result) => {
                            resolve(result);
                        }).catch((err) => {
                            debug('reactive finsify service error ', err);
                            return reject(err);
                        });
                }).catch((err) => {
                    debug("__findLoginSecretFromUserId error ", err);
                    return reject(err);
                });
        });
    }

    __findLoginSecretFromUserId(userId) {
        return new Promise((resolve, reject) => {
            let listLoginSecret = [];
            WalletModel.getLinkedWalletListByUserId(userId, (wallets) => {
                if (wallets.length > 0) {
                    wallets.forEach((wallet) => {
                        if (wallet.rwInfo) {
                            listLoginSecret.push(wallet.rwInfo.secret);
                        }
                    });
                    return resolve(listLoginSecret);
                }

                resolve(listLoginSecret);
            });
        });
    }

    static pushNotification(user_id, expire_date, tokenDevice) {
        pushController.pushSubscriptionRenew(user_id, expire_date, tokenDevice);
    }
}

module.exports = ItemSubscription;