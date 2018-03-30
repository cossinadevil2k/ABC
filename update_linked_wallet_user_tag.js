'use strict';
process.env.NODE_ENV = 'production';

var mongoose = require('mongoose');
var async = require('async');
var _ = require('underscore');
var sprintf	= require("sprintf-js").sprintf;
var TagConstant = require('./config/tag_constant');

require('./model/account');
require('./model/campaign');
require('./model/category');
require('./model/transaction');
require('./model/user');
require('./model/device');
require('./model/provider');


var env	= process.env.NODE_ENV;
var config	= require('./config/config')[env];

mongoose.connect(config.db_url);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

var WalletModel = mongoose.model('Account');
var UserModel = mongoose.model('User');
var CategoryModel = mongoose.model('Category');

function getLinkedWalletAndGroupbyUser(callback){
    WalletModel.aggregate(
        {
            $match: {
                account_type: 2, isDelete: false
            }
        }, 
        {
            $group: {
                _id: '$owner',
                providers: {
                    $push: '$rwInfo.p_code'
                }
            }
        },
        function(err, result){
            callback(err, result);
        }
    );
}

function generateTagForListUser(data, callback){
    async.eachSeries(data, function (element, cb) {
        generateTagForUser(element, cb);
    }, callback);
}

function generateTagForUser(data, callback) {
    if (!data.providers || data.providers.length === 0) {
        return callback();
    }
    
    let tags = [];
    
    data.providers.forEach(function(provider_code){
        tags.push(sprintf(TagConstant.LINKEDWALLET, provider_code));
    });
    
    tags = _.uniq(tags);
    
    UserModel.updateTags(data._id, tags, callback);
}

async.waterfall([
    getLinkedWalletAndGroupbyUser,
    generateTagForListUser
], function(error){
    console.log(error);
});
