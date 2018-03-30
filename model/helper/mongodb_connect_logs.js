'use strict';

let env = process.env.NODE_ENV;

let mongoose = require('mongoose');

let DBNAME = 'Log';

let CONFIG = {
    local: {
        db_url: 'mongodb://127.0.0.1:27017/log'
    },
    dev: {
        db_url: 'mongodb://devLogReadWrite:n0moneyn0life@money-db:27017/dev-log'
    },
    production: {
        db_url: 'mongodb://logReadWrite:n0moneyn0happy@money-db:27017/log'
    }
};

let connectOptions = {
    server: {
        auto_reconnect: true
    }
};

let connection = mongoose.createConnection(CONFIG[env].db_url, connectOptions);

connection.on('error', function(err){
    console.log(`${DBNAME} DB connection error: ${err}`);
});
connection.once('open', function() {
    console.log(`[${env}] ${DBNAME} Database connection opened`);
});
connection.on('reconnected', function(){
    console.log(`[${env}] ${DBNAME} Database connection reconnected.`);
});
connection.on('disconnected', function(){
    console.log(`${DBNAME} DB DISCONNECTED`);
});

// process.on('SIGINT', function(){
//     connection.close(function(){
//         console.log(`${DBNAME} Mongoose default connection disconnected through app termination`);
//     });
// });

module.exports = connection;