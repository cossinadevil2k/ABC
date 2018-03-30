'use strict';

var Sync = require('./sync').Sync;
var mongoose = require('mongoose');
var UserSchema = mongoose.model('User');
var SyncCodes = require('../../config/sync_codes');
var Error = require('../../config/error');

class SyncSetting extends Sync {
    constructor(request){
        super(request);

        this.syncCode = SyncCodes.SETTING;
        this.Schema = UserSchema;
        this.propertiesSelect = 'client_setting';
    }
    
    pullSetting(callback){
        if (!this.__user_id) return callback(Error.USER_NOT_LOGIN);

        let params = this.__request.body;

        if (!params || !params.okget) return callback(Error.USER_WARNING_INFO);

        this.Schema.findById(this.__user_id)
            .select(this.propertiesSelect)
            .lean(true)
            .exec((err, user) => {
                if (err) return callback(Error.ERROR_SERVER);

                if (!user) return callback(Error.USER_NOT_EXIST);

                let settingResponse = user.client_setting || {};

                callback(null, settingResponse);
            });
    }

    pushSetting(callback){
        if (!this.__user_id) return callback(Error.USER_NOT_LOGIN);

        let params = this.__request.body;

        if (!params) return callback(Error.USER_WARNING_INFO);
        
        this.Schema.updateSetting(this.__user_id, params, (err) => {
            if (err) {
                return callback(err);
            }

            callback();

            this.__pushSyncNotification();
        });
    }

    pullData(){
        
    }

    validSyncItem(){
        return true;
    }

    makeNewItem(){
        
    }

    makeEditItem(){
        
    }
}

exports.SyncSetting = SyncSetting;