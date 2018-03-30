'use strict';

let mongoose = require('mongoose');
let UserModel = mongoose.model('User');
let PhoneValidateCodeModel = mongoose.model('PhoneValidationCode');

const utils = require('../helper/utils');
const Error = require('../config/error');

/**
 * UTILITIES
 */

function checkLogin(req, res, next){
    if (!req.user_id) {
        return res.json({s: false, e: Error.ERROR_SERVER});
    }

    next();
}

function phonenumber(inputtxt) {
    let phoneno = /^[\s()+-]*([0-9][\s()+-]*){6,20}$/;
    return phoneno.test(inputtxt);
}

function phoneParser(phone){
    phone = phone.toString();

    if (phone.startsWith('+')) {
        phone = phone.substring(1, phone.length);
    }

    if (phone.startsWith('0')) {
        phone = phone.substring(1, phone.length);
        phone = '84' + phone;
    }

    return phone;
}

function addPhoneIntoUserInfo(user_id, phone){
    return new Promise((resolve, reject) => {
        UserModel.addPhoneNumber(user_id, phoneParser(phone), (err) => {
            if (err) {
                reject(Error.ERROR_SERVER);
            } else {
                resolve();
            }
        });
    });
}

function createConfirmationCode(phone, user_id){
    return new Promise((resolve, reject) => {
        let code = utils.uid(6);

        PhoneValidateCodeModel.createCode(user_id, phone, code, function(err) {
            if (err) {
                reject(Error.ERROR_SERVER);
            } else {
                resolve();
            }
        });
    });
}

function checkPhoneExist(phone){
    return new Promise((resolve, reject) => {
        UserModel.findByPhoneNumber(phoneParser(phone), (err, users) => {
            if (err) {
                return reject(Error.ERROR_SERVER);
            }

            if (users && users.length > 0) {
                return reject(Error.PHONE_NUMBER_ALREADY_USED);
            }

            resolve();
        });
    });
}

/*
    FUNCTIONS
 */

let appAdd = function(req, res){
    let user_id = req.user_id;
    let phone = req.body.phone;

    if (!user_id) {
        return res.json({s: false, e: Error.USER_NOT_LOGIN});
    }

    if (!phone) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }
    
    if (!phonenumber(phone)) {
        return res.json({s: false, e: Error.PHONE_NUMBER_INVALID});
    }

    checkPhoneExist(phone)
        .then(() => {
            createConfirmationCode(phone, user_id)
        })
        .then(() =>{
            addPhoneIntoUserInfo(user_id, phone)
        })
        .then(() => {
            res.json({s: true});
        })
        .catch((err) => {
            res.json({s: false, e: err});
        });
};

let appConfirm = function(req, res){
    let user_id = req.user_id;
    let phone = req.body.phone;
    let code = req.body.code;

    if (!user_id) {
        return res.json({s: false, e: Error.USER_NOT_LOGIN});
    }

    if (!phone || !code) {
        return res.json({s: false, e: Error.PARAM_INVALID});
    }

    if (!phonenumber(phone)) {
        return res.json({s: false, e: Error.PHONE_NUMBER_INVALID});
    }

    PhoneValidateCodeModel.validate(user_id, phoneParser(phone), code, (err, status, wrong_count) => {
        if (err) {
            console.log(err);
            res.json({s: false, e: Error.ERROR_SERVER});
        }

        if (status) {
            return res.json({s: true});
        }

        if (wrong_count) {
            return res.json({s: false, e: Error.PHONE_NUMBER_WRONG_CONFIRMATION_CODE, c: wrong_count});
        }

        res.json({s: false, e: Error.PHONE_NUMBER_WRONG_CONFIRMATION_CODE});
    });
};

module.exports = function(server, config){
    server.post('/phone/add', appAdd);
    server.post('/phone/confirm', appConfirm);
};