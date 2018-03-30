'use strict';

let env = process.env.NODE_ENV;

let CONFIG = {
    local: {
        db_url: 'mongodb://127.0.0.1:27017/partner'
    },
    dev: {
        db_url: 'mongodb://devPartnerReadWrite:733bay610@money-db:27017/partnerDev'
    },
    production: {
        db_url: 'mongodb://partnerReadWrite:73376motkhong@money-db:27017/partner'
    }
};

let mongoose = require('mongoose');

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};

let connection = mongoose.createConnection(CONFIG[env].db_url, connectOptions);

let db = mongoose.connection;

db.on('error', function(err){
    console.log(`Partner DB connection error: ${err}`);
});
db.once('open', function() {
    console.log(`[${env}] Partner Database connection opened`);
});
db.on('reconnected', function(){
    console.log(`[${env}] Partner Database connection reconnected.`);
});
db.on('disconnected', function(){
    console.log('Partner DB DISCONNECTED');
});

// process.on('SIGINT', function(){
//     db.close(function(){
//         console.log('PARTNER Mongoose default connection disconnected through app termination');
//     });
// });

module.exports = connection;