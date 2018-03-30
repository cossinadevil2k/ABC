'use strict';

const LogDB = require('../../model/helper/mongodb_connect_logs');
/*****IMPORT DB SCHEMAS*****/
require('../../model/finsify_category_edited_log');
require('../../model/activity');
require('../../model/backend_notification');
require('../../model/admin');
require('../../model/device');
require('../../model/user');
require('../../model/authkey');
require('../../model/clientkey');
require('../../model/account');
require('../../model/account_share');
require('../../model/category');
require('../../model/budget');
require('../../model/campaign');
require('../../model/transaction');
require('../../model/balance_stats');
require('../../model/event');
require('../../model/active');
require('../../model/adminLog');
require('../../model/messages');
require('../../model/invited');
require('../../model/maildata');
require('../../model/statsDaily');
require('../../model/purchasedstat');
require('../../model/redeem');
require('../../model/bankmsg');
require('../../model/errorLog');
require('../../model/category_promotion');
require('../../model/sponsor');
require('../../model/sponsored_subscribe');
require('../../model/premiumlog');
require('../../model/openedLog');
require('../../model/helpdesk_issue_stat');
require('../../model/helpdesk_performance');
require('../../model/helpdesk_issue');
require('../../model/helpdesk_faq');
require('../../model/helpdesk_faq_section');
require('../../model/helpdesk_message');
require('../../model/failed_sync_item');
require('../../model/lucky');
require('../../model/subscription_log');
require('../../model/subscription_code');
require('../../model/coupon');
require('../../model/provider');
require('../../model/partner');
require('../../model/extend_remote_wallet');
require('../../model/device_notification');
require('../../model/search_query');
require('../../model/push_notification_session');
require('../../model/milestone');
require('../../model/item');
require('../../model/receipt');
require('../../model/use_credit');
require('../../model/item_log');
require('../../model/sync_error_log');
require('../../model/auto_email');
require('../../model/register_devML');
require('../../model/helpDeskDailyResolve');
require('../../model/helpdesk_daily_static');
require('../../model/automation_log');
require('../../model/finsify_hook_log');
require('../../model/subscription_renew_log');
require('../../model/finsify_fetch_log');

const ItemLogModel = LogDB.model('ItemLog');
const mongoose = require('mongoose');
const ProductModel = mongoose.model('Item');
const UserModel = mongoose.model('User');
const ErrorCode = require('../../config/error');
const debug = require('debug')('iproduct:debug');

const async = require('async');
const selectn = require('selectn');

const ITEM_TYPE = {
    ICON: 1,
    SUBSCRIPTION: 2,
    CREDIT: 3,
    PREMIUM: 5,
    SEMI_PREMIUM: 6,
    OTHER: 99
};

const ERROR = {
    ITEM_NOT_REGISTER: 220,
    ITEM_ALREADY_PURCHASED: 221
};

class Item {
    constructor() {
        this.buyOnlyOnce = false;
    }

    static get Type() {
        return ITEM_TYPE;
    }

    static get Error() {
        return ERROR;
    }

    static setPurchaseInfo(purchaseInfo, productInfo) {
        return new Promise((resolve, reject) => {
            purchaseInfo.product_id = productInfo.product_id;
            purchaseInfo.expire_unit = productInfo.expire_unit;
            purchaseInfo.expire_value = productInfo.expire_value;
            if (productInfo.price_credit) {
                purchaseInfo.price_credit = productInfo.price_credit;
            } else {
                purchaseInfo.price_credit = 0;
            }
            purchaseInfo.credit = selectn('metadata.credit', productInfo);
            purchaseInfo.credit_type = selectn('metadata.credit_type', productInfo);
            purchaseInfo.type = productInfo.type;
            purchaseInfo.isFree = productInfo.isFree;
            purchaseInfo.metadata = productInfo.metadata;

            return resolve(purchaseInfo);
        });
    }

    __saveLog(purchaseInfo) {
        debug('__saveLog ', purchaseInfo)
        return new Promise((resolve, reject) => {
            let options = {
                type: purchaseInfo.type
            };

            if (purchaseInfo.source) {
                options.source = purchaseInfo.source;
            }

            if (purchaseInfo.purchase_date_ms) {
                options.purchaseDateMs = purchaseInfo.purchase_date_ms;
            }

            ItemLogModel.createLog(purchaseInfo.userId, purchaseInfo.product_id, (err, result) => {
                if (err) {
                    console.log(err);
                    reject(ErrorCode.ERROR_SERVER);
                } else {
                    debug('savelog result ', result);
                    resolve();
                }
            }, options);
        });
    }

    purchase(purchaseInfo) {
        debug('purchase');
        return new Promise((resolve, reject) => {
            this.__beforePurchase()
                .then(() => {
                    return this.__saveLog(purchaseInfo);
                })
                .then(() => {
                    return this.__afterPurchase(purchaseInfo);
                })
                .then((data) => {
                    resolve(data);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    __beforePurchase() {
        return new Promise((resolve, reject) => {
            this.constructor.__checkProductExist(this.product_id)
                .then(() => {
                    if (!this.buy_only_once) {
                        return resolve();
                    }

                    return this.__checkPurchased();
                })
                .then((purchased) => {
                    if (purchased) {
                        reject(ERROR.ITEM_ALREADY_PURCHASED);
                    } else {
                        resolve();
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    __checkPurchased() {
        throw new Error('__beforePurchase should be override');
    }

    __afterPurchase() {
        throw new Error('__afterPurchase should be override');
    }

    refund() {
        throw new Error('__refund should be override');
    }

    static __checkProductExist(product_id) {
        return new Promise((resolve, reject) => {
            ProductModel.findByProductId(product_id, (err, product) => {
                if (err) {
                    console.log(err);
                    return reject(ErrorCode.ERROR_SERVER);
                }

                if (!product) {
                    return reject(ERROR.ITEM_NOT_REGISTER);
                }

                resolve(product);
            });
        });
    }
}

module.exports = Item;