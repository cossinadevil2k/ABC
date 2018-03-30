'use strict';

const env = process.env.NODE_ENV;
// let kue = require('kue');
const _ = require('underscore');
const config = require('../../config/config')[env];
const fs = require('fs');
const walletNotFoundPath = config.root + '/app/public/rw_wallet_not_found_login_id.json';

const mongoose = require('mongoose');
const UserModel = mongoose.model('User');
const WalletModel = mongoose.model('Account');
const PushController = require('../../model/sync/push_controller');
const async = require('async');
const debug = require('debug')('finsifyHook');

const FinsifyController = require('../../helper/finsify-controller');

let Slackbot = require('slackbot');

let slackbot = new Slackbot('moneylover', '50cXqEaCuKrX0LiyfaISgtFf');

/*********FUNCTION***********/

function updateNotFoundList(loginId, callback) {
    fs.readFile(walletNotFoundPath, (err, content) => {
        if (err) return callback(err);
        if (!content) return callback();

        content = JSON.parse(content);
        loginId = parseInt(loginId);

        let existIndex = content.findIndex(id => id === loginId);
        if (existIndex !== -1) return callback();
        content.push(loginId);

        fs.writeFile(walletNotFoundPath, JSON.stringify(content), callback);
    });
}

function fetchDataUserFromLoginId(loginId) {
    return new Promise(function (resolve, reject) {
        FinsifyController.findFinsifyWalletByLoginIdPromise(loginId)
            .then(function (data) {
                resolve(data);
            }).catch(function (error) {
                reject(error);
            });
    });
}

function activeLinkedWalletML(login_id, accountId) {
    return new Promise((resolve, reject) => {
        if (typeof login_id != 'string') {
            login_id = login_id.toString();
        }
        if (typeof accountId != 'string') {
            accountId = accountId.toString();
        }

        WalletModel.findByRemoteWalletLoginIdUniqueAccountId(login_id, accountId, function (error, wallet) {
            if (error) {
                reject(error);
            } else {
                if (wallet) {
                    // debug('wallet_id ', wallet._id);
                    WalletModel.activeLinkedWallet(wallet._id, function () {
                        resolve();
                    });
                } else {
                    resolve();
                }
            }
        });

    });
}

/*********EXPORTS************/

let finsifyDataChanged = function (req, res) {
    let login_id = req.body.login_id;
    let accounts = req.body.accounts;
    let timestamp = req.body.timestamp || 0;

    if (!login_id) {
        return res.status(404).json({ s: false, e: 'ParamInvalid' });
    }


    let walletStatus;
    let loginSecret;

    async.series({
        findStatusWallet: function (next) {
            async.eachSeries(accounts, function (accountId, done) {
                async.setImmediate(() => {
                    WalletModel.findByRemoteWalletLoginIdUniqueAccountId(login_id, accountId.id, function (error, wallet) {
                        if (error) {
                            done(error);
                        } else {
                            if (wallet) {
                                walletStatus = wallet.rwInfo.active.status;
                                loginSecret = wallet.rwInfo.secret;

                                if (walletStatus === false) {
                                    async.series({
                                        activeLWWallet: function (cb) {
                                            activeLinkedWalletML(login_id, accountId.id)
                                                .then((data) => {
                                                    cb();
                                                }).catch((err) => {
                                                    cb();
                                                })
                                        },
                                        refreshLogin: function (cb) {
                                            FinsifyController.refreshLogin(loginSecret)
                                                .then((data) => {
                                                    cb();
                                                }).catch((err) => {
                                                    cb(err);
                                                });
                                        }
                                    }, done);
                                } else {
                                    FinsifyController.fetchTransaction(login_id, timestamp)
                                        .then(() => {
                                            done();
                                        })
                                        .catch(error => {
                                            if (_.isString(error)) {
                                                if (error === 'MoneyLoverRemoteWalletNotFound') {
                                                    updateNotFoundList(login_id, err => { });
                                                }
                                            }
                                            pushToSlack(login_id, JSON.stringify(error), function () { });
                                            done(error);
                                        });
                                }
                            } else {
                                done();
                            }
                        }
                    });
                });
            }, next);
        }
    }, function (error) {
        res.status(200).json({ s: true });
    });

};


function pushToSlack(login_id, error, callback) {
    let channelFail = '#lw-fetch-tran-fail';

    let message2;

    if (error) {
        if (error instanceof Object) {
            error = JSON.stringify(error);
        }

        if (!login_id) {
            message2 = `*Warning*: ${error}`;
        } else {
            message2 = `LoginId: \`${login_id}\`, Error: \`${error}\``;
        }

        slackbot.send(channelFail, message2, function (err, response, body) {
            callback(err);
        });
    }
};


module.exports = function (app) {
    app.post('/finsify/notify-v2', finsifyDataChanged);
};
