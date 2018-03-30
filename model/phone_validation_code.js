'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let phoneValidateSchema = new Schema({
    user: {type: String, required: true, trim: true, ref: 'User', index: true},
    phone_number: {type: String, required: true, trim: true, index: true},
    code: {type: String, required: true, trim: true, lowercase: true},
    created_date: {type: Date, default: Date.now},
    wrong_count: {type: Number, default: 0},
    verified: {type: Boolean, default: false, index: true}
});

phoneValidateSchema.index({user: 1, phone_number: 1});

/**
 * UTILITIES
 */



/**
 * IMPLEMENTS
 */

let createCode = function (user_id, phone, code, callback) {
    checkExist((err, is_exists) => {
        if (err) {
            return callback(err);
        }

        if (is_exists) {
            return callback('Phone number exists');
        }

        let item = new this();

        item.user = user_id;
        item.phone_number = phone;
        item.code = code;

        item.save(callback);
    });


    function checkExist(cb){
        this.findOne({phone_number: phone})
            .exec((err, codeInfo) => {
                if (err) {
                    return cb(err)
                }

                cb(null, !!codeInfo);
            });
    }
};

let validate = function (user_id, phone, code, callback) {
    let query = {
        user: user_id,
        phone_number: phone
    };

    this.findOne(query, (err, codeInfo) => {
        if (err) {
            return callback(err);
        }

        if (!codeInfo) {
            return callback(null, false);
        }

        if (codeInfo.code == code) {
            //nhập đúng, remove
            this.findByIdAndRemove(codeInfo._id, function(){});
            return callback(null, true);
        }

        //else nhập sai
        //tăng số lần sai thêm 1
        codeInfo.wrong_count = codeInfo.wrong_count + 1;
        callback(null, false, codeInfo.wrong_count);

        if (codeInfo.wrong_count === 5) {
            //remove
            this.findByIdAndRemove(codeInfo._id, function(){});
        } else {
            codeInfo.save(function(){});
        }
    });
};

/**
 * EXPORTS
 */

phoneValidateSchema.statics.createCode = createCode;
phoneValidateSchema.statics.validate = validate;

mongoose.model('PhoneValidationCode', phoneValidateSchema);