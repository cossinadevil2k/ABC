/**
 * Created by cuongpham on 01/02/2016.
 * Converted to ES6 by cuongpham on 15/02/2016
 */

'use strict';

var Sync			= require('./sync').Sync;
var mongoose		= require('mongoose');
var SyncCodes       = require('../../config/sync_codes');
var AccountSchema	= mongoose.model('Account');

class SyncBalanceAccount extends Sync {
    constructor(request){
        super(request);

        this.syncCode = SyncCodes.BALANCE_WALLET;
        this.Schema = AccountSchema;
        this.propertiesSelect = 'balance';
        this.skipCheckAccount = true;
    }

    pullData(params, callback){
        var that = this;
        this.Schema.find(that.pullCondition(params))
            .select(that.propertiesSelect)
            .skip(params.skip)
            .limit(params.limit)
            .exec(function(err, results){
                callback(true, results || [], err);
            });
    }

    validSyncItem(obj){
        return (!obj || !obj.bl);
    }

    makeEditItem(item, obj, account, parent, callback){
        obj.balance = item.bl;

        callback(obj);
    }

    makeNewItem(){}

}

exports.SyncBalanceAccount = SyncBalanceAccount;