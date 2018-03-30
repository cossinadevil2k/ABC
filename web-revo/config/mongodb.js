/**
 * MongoDB connect
 */
'use strict';

const mongoose = require('mongoose');
const config = require('./index');

require(config.root + '/model/activity');
require(config.root + '/model/authkey');
require(config.root + '/model/clientkey');
require(config.root + '/model/errorLog');
require(config.root + '/model/user');
require(config.root + '/model/account');
require(config.root + '/model/account_share');
require(config.root + '/model/category');
require(config.root + '/model/budget');
require(config.root + '/model/campaign');
require(config.root + '/model/transaction');
require(config.root + '/model/transaction_share');
require(config.root + '/model/balance_stats');
require(config.root + '/model/event');
require(config.root + '/model/active');
require(config.root + '/model/device');
require(config.root + '/model/invited');
require(config.root + '/model/failed_sync_item');

mongoose.connect(config.mongodb);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB error: '));
db.once('open', function callback () {
	console.log('MongoDB connected.');
});
