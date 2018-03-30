'use strict';

let mongoose = require('mongoose');
let UseCreditModel = mongoose.model('UseCredit');
let Item = require('./item');
let Error = require('../../config/error');

class ItemCredit extends Item {
    constructor(info) {
        super(info);
    }

    __afterPurchase() {
        return new Promise((resolve, reject) => {
            let credit_amount = this.credit || 3;

            UseCreditModel.increaseUseCredit(this.user_id, this.credit_type, credit_amount, (err, credit) => {
                if (err) {
                    reject(Error.ERROR_SERVER);
                } else {
                    resolve(credit);
                }
            });
        });
    }

    refund(){
        return new Promise((resolve, reject) => {
            let credit_amount = this.credit || 3;
            credit_amount = credit_amount * -1;

            UseCreditModel.increaseUseCredit(this.user_id, this.credit_type, credit_amount, (err, credit) => {
                if (err) {
                    reject(Error.ERROR_SERVER);
                } else {
                    resolve(credit);
                }
            });
        });
    }
}

module.exports = ItemCredit;