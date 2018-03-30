'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = Schema.Types.Mixed;

let balanceCacheSchema = new Schema({
    wallet: {type: String, ref: 'Account', trim: true, required: true, index: true},
    balance: {type: Mixed},
    mode: {type: Number, required: true, enum: [1, 2]},
    updated_at: {type: Date, default: Date.now}
});

balanceCacheSchema.index({wallet: 1, mode: 1});

const MODE = {
    ALL: 1,
    FUTURE_EXCLUDE: 2
};

/**
 * UTILITIES
 */

/**
 * FUNCTIONS
 */

let cacheBalance = function(wallet_id, balance, mode, callback){
    //check exist
    this.findByWalletIdAndMode(wallet_id, mode, (errorFindWallet, cache) => {
        if (errorFindWallet) return callback(errorFindWallet);

        if (cache) {
            cache.balance = balance;
            cache.updated_at = Date.now();
            cache.save(callback);
        } else {
            let item = new this({
                wallet: wallet_id,
                balance: balance,
                mode: mode
            });

            item.save(callback);
        }
    });
};

let findByWalletIdAndMode = function(wallet_id, mode, callback) {
    this.findOne({wallet: wallet_id, mode: mode}, callback);
};

let findByWalletId = function(wallet_id, callback) {
    this.find({wallet: wallet_id}, callback);
};

/**
 * EXPORTS
 */

balanceCacheSchema.statics.cacheBalance = cacheBalance;
balanceCacheSchema.statics.findByWalletIdAndMode = findByWalletIdAndMode;
balanceCacheSchema.statics.findByWalletId = findByWalletId;

mongoose.model('BalanceCache', balanceCacheSchema);