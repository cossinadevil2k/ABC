'use strict';
var request = require('request');
var async = require('async');
var moment = require('moment');
// var finsifyController = require('../helper/finsify-controller/index.js');
var loginInfo = {
    acc_id: 1611954,
    timestamp: 1504224000000,
    secret: "acf89a99-8fac-438e-be79-fe86c03685f8"
}
const tokenDevice = 'moneylover';

let FINSIFY_PROFILE = {
    production: {
        host: 'api.finsify.com',
        public_key: 'Tu5dvG07KVpx6b',
        secret_key: '75167f66-22dc-415d-b799-c0dd73b951ca'
    },
    dev: {
        host: 'sandbox.zoostd.com',
        public_key: 'sE5dve74KVpx6k',
        secret_key: '75167f66-22dc-415d-b799-c0dd73b951ca'
    },
    local: {
        host: 'sandbox.zoostd.com',
        public_key: 'sE5dve74KVpx6k',
        secret_key: '75167f66-22dc-415d-b799-c0dd73b951ca'
    }
};

let finsifyOptions = FINSIFY_PROFILE['production'];

let walletInfo = {
    "_id": "2070EB063FF54DE09EE7E3FD004C4246",
    "name": "Vietcombank",
    "currency_id": 4,
    "owner": { "_id": "598fc88db90882b301f0d146" },
    "tokenDevice": "moneylover",
    "lastEditBy": "598fc88db90882b301f0d146",
    "permission": {
        "a:2070EB063FF54DE09EE7E3FD004C4246:w": [
            "598fc88db90882b301f0d146"
        ],
        "a:2070EB063FF54DE09EE7E3FD004C4246:r": [
            "598fc88db90882b301f0d146"
        ]
    },
    "metadata": "{\"login_id\":\"93001\",\"secret\":\"acf89a99-8fac-438e-be79-fe86c03685f8\",\"p_name\":\"Vietcombank\",\"acc_id\":\"1611954\",\"is_free\":false,\"acc_type\":\"current\",\"hasBalance\":true,\"service_id\":\"8\",\"type\":\"bank\",\"acc_name\":\"0861000033951\",\"balance\":\"117026.00\"}",
    "rwInfo": {
        "acc_id": "1611954",
        "login_id": "93001",
        "secret": "acf89a99-8fac-438e-be79-fe86c03685f8",
        "balance": 117026,
        "service_id": 8,
        "last_refresh": "2017-10-03T04:51:59.800Z",
        "active": {
            "message": null,
            "error": null,
            "status": true
        }
    },
    "transaction_notification": true,
    "archived": false,
    "account_type": 2,
    "isPublic": false,
    "exclude_total": false,
    "icon": "/icon/provider/8",
    "listUser": [
        "598fc88db90882b301f0d146"
    ],
    "createdAt": "2017-08-24T12:56:04.489Z",
    "updateAt": "2017-10-03T04:51:59.813Z",
    "isDelete": false,
    "balance": 117026,
    "iconUrl": "https://assets.finsify.com/services/provider_8-logo.png"
}

function getTransactionFromFinsify(loginInfo, callback) {
    //get transaction list
    let url = '/transaction?account_id=' + loginInfo.acc_id + '&timestamp=' + loginInfo.timestamp;

    requestExec(url, 'GET', { loginSecret: loginInfo.secret })
        .then((data) => {
            callback(null, data);
        })
        .catch(callback);
}

function requestExec(url, method, data) {
    return new Promise((resolve, reject) => {
        let requestOptions = {
            url: `https://${finsifyOptions.host}/v2${url}`,
            method: method,
            json: true,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Client-id': finsifyOptions.public_key,
                'Service-secret': finsifyOptions.secret_key,
            }
        };

        if (data && data.loginSecret) {
            requestOptions['headers']['Login-secret'] = data.loginSecret;
        }

        if (data && data.body) {
            requestOptions['body'] = data.body;
        }

        request(requestOptions, (err, response, body) => {
            if (err) {
                return reject(err);
            }

            if (body) {

                resolve(body.data);
            } else {
                return resolve(response.body);
            }

        });
    });
}

let getTransactionFromFinsifyPromise = function (loginInfo, timestamp) {
    return new Promise((resolve, reject) => {
        getTransactionFromFinsify(loginInfo, function (err, result) {
            if (err) {
                reject(err)
            }
            else {
                parseFinsifyToMoneyLoverTransaction(result, function (transaction) {
                    // console.log(transaction);
                });
                resolve(result)
            };
        })
    })
}

let parseFinsifyToMoneyLoverTransaction = function (transactionList, callback) {
    // console.log(transactionList);
    async.eachSeries(transactionList, function (trans, cb) {
        parseFinsifyToMoneyLoverTransactionTask(trans, walletInfo, function (transaction) {
            callback(transaction);
            cb();
        })
    }, function () {
        callback();
    })
}

function parseFinsifyToMoneyLoverTransactionTask(data, walletInfo, callback) {
    //_id là 4 character cuối của walletId + OriginalID của finsify transaction
    let result = {
        _id: walletInfo._id + data.original_id,
        account: walletInfo._id,
        displayDate: moment(data.date, 'YYYY-MM-DD').format(),
        amount: Math.abs(data.amount),
        note: data.description,
        tokenDevice: tokenDevice,
        lastEditBy: walletInfo.owner._id
    };

    if (data.currency) result.original_currency = data.currency;
    if (data.meta) {
        if (data.meta.address) result.address = data.meta.address;
        if (data.meta.longtitude) result.longtitude = data.meta.longtitude;
        if (data.meta.latitude) result.latitude = data.meta.latitude;
    }

    if (data.updated_at) result.updateAt = data.updated_at;

    callback(result);
}

getTransactionFromFinsifyPromise(loginInfo, loginInfo.timestamp);