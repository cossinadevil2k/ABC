'use strict';

let env = process.env.NODE_ENV;
let Item = require('./item');
let mongoose = require('mongoose');
let UserModel = mongoose.model('User');
let moment = require('moment');
let Error = require('../../config/error');
let config = require('../../config/config')[env];
let PushController = require('../../model/sync/push_controller');

class ItemPremium extends Item {
    constructor(info) {
        super(info);

        this.buy_only_once = true;
    }

    __checkPurchased() {
        return new Promise((resolve, reject) => {
            UserModel.findById(this.user_id, 'purchased', (err, user) => {
                if (err) {
                    return reject(Error.ERROR_SERVER);
                }

                resolve(user.purchased);
            });
        });
    }

    __afterPurchase(){
        this.__pushPremiumNotification();
        return this.__activeUserPremium();
    }

    refund(){
        return this.__deactivateUserPremium(this.user_id);
    }

    __deactivateUserPremium(userId){
        return new Promise((resolve, reject) => {
            UserModel.findByIdAndUpdate(userId, {$set: {purchased: false}}, err => {
                return err ? reject(Error.ERROR_SERVER) : resolve();
            });
        });
    }

    __activeUserPremium() {
        return new Promise((resolve, reject) => {
            // UserModel.activeUser(this.user_id, (status) => {
            //     if (status) {
            //         resolve();
            //     } else {
            //         reject(Error.ERROR_SERVER);
            //     }
            // });
            let today = moment();
            let expire = moment().add(config.subscriptionExpire.premium.value, config.subscriptionExpire.premium.unit);

            let update = {
                $set: {
                    purchased: true,
                    premium_at: today,
                    expireDate: expire,
                    firstPurchase: today,
                    lastPurchase: today,
                    subscribeProduct: 'premium_sub_year_1',
                    subscribeMarket: this.source || 'Other'
                }
            };

            UserModel.findByIdAndUpdate(this.user_id, update, err => {
                return err ? reject(Error.ERROR_SERVER) : resolve();
            });
        });
    }

    __pushPremiumNotification(){
        PushController.pushPremiumActivated(this.user_id, this.tokenDevice);
    }
}



module.exports = ItemPremium;