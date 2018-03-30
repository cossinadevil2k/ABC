'use strict';

const mongoose = require('mongoose');
const async = require('async');
const _ = require('underscore');
const moment = require('moment');
const fs = require('fs');
const Big = require('big.js');
const utils = require('./helper/utils');
const walletBalanceCalculator = require('./helper/wallet-balance');

require('./model/account');
require('./model/campaign');
require('./model/category');
require('./model/transaction');
require('./model/user');
require('./model/device');
require('./model/provider');


const env	= process.env.NODE_ENV;
const config = require('./config/config')[env];

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');

    start();
});

let WalletModel = mongoose.model('Account');
let CategoryModel = mongoose.model('Category');
let TransactionModel = mongoose.model('Transaction');

function start() {
    const walletId = process.env.WALLET_ID;
    let FUTURE_INCLUDED = process.env.FUTURE_INCLUDED || false;
    console.log(`Wallet Id: ${walletId}`);

    FUTURE_INCLUDED = FUTURE_INCLUDED !== 'false';

    walletBalanceCalculator(walletId, FUTURE_INCLUDED, WalletModel, TransactionModel)
        .then(console.log)
        .catch(console.log);
}