'use strict';

let mongoose = require('mongoose');

require('./model/account');
require('./model/campaign');
require('./model/category');
require('./model/transaction');
require('./model/user');
require('./model/device');
require('./model/provider');
require('./model/clientkey');


let env	= process.env.NODE_ENV;
let config	= require('./config/config')[env];

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

const User = mongoose.model('User');
let stream = User.synchronize();
let count = 0;

stream.on('data', function(err, doc){
	count++;
	console.log(count);
});
stream.on('close', function(){
	console.log('indexed all User documents!');
});
stream.on('error', function(err){
	console.log(err);
});
