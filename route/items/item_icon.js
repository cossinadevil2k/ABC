'use strict';

let Item = require('./item');
let mongoose = require('mongoose');
let UserModel = mongoose.model('User');
let ItemModel = mongoose.model('Item');
let TagConstant = require('../../config/tag_constant');

let Error = require('../../config/error');

class ItemIcon extends Item {
    constructor(info) {
        super(info);

        this.buy_only_once = true;
    }
    
    __checkPurchased(){
        return new Promise((resolve, reject) => {
            UserModel.findById(this.user_id, (err, user) => {
                if (err) {
                    return reject(Error.ERROR_SERVER);
                }

                if (!user.icon_package) {
                    return resolve(false);
                }

                if (user.icon_package.length === 0) {
                    return resolve(false);
                }
                
                resolve(user.icon_package.indexOf(this.product_id) != -1);
            });
        });
    }

    __afterPurchase(){
        return new Promise((resolve, reject) => {
            UserModel.addNewIconPackage(this.product_id, this.user_id, (err) => {
                if (err) {
                    reject(Error.ERROR_SERVER);
                } else {
                    resolve();
                    this.__checkBuyCashItemAndUpdateUserTag();
                }
            });
        });
    }

    refund(){
        return this.__removeIconPackage(this.product_id, this.user_id);
    }

    __removeIconPackage(productId, userId){
        return new Promise((resolve, reject) => {
            UserModel.findById(userId, (err, user) => {
                if (err || !user) {
                    return reject(Error.ERROR_SERVER);
                }

                if (!user.icon_package || user.icon_package.length === 0) {
                    return resolve();
                }

                let itemIndex = user.icon_package.indexOf(productId);

                if (itemIndex === -1) {
                    return resolve();
                }

                user.icon_package.splice(itemIndex, 1);

                user.save(err => {
                    return err ? reject(Error.ERROR_SERVER) : resolve();
                });
            });
        });
    }

    __checkBuyCashItemAndUpdateUserTag(){
        return new Promise((resolve, reject) => {
            this.__checkIsFreeIcon()
                .then((isFree) => {
                    if (!isFree) {
                        return this.__updateTag();
                    }

                    resolve();
                })
                .then((result) => {
                    resolve(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });

    }

    __checkIsFreeIcon(){
        return new Promise((resolve, reject) => {
            ItemModel.findByProductId(this.product_id, (err, product) => {
                if (err) {
                    return reject(err);
                }

                if (!product) {
                    return reject('ProductNotFound');
                }

                resolve(product.isFree);
            });
        });
    }

    __updateTag(){
        return new Promise((resolve, reject) => {
            UserModel.updateTags(this.user_id, [TagConstant.PAY_CASH_ICON], (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    }
}

module.exports = ItemIcon;