let mongoose = require('mongoose');
let env = 'sandbox';
let config = require('../../config/config')[env];
const DBNAME = 'moneyloverDev';
let connectOptions = {
    server: {
        auto_reconnect: true
    }
};

let connection = mongoose.createConnection(config.db_url, connectOptions);
connection.on('error', function(err){
    console.log(`${DBNAME} DB connection error: ${err}`);
});
connection.once('open', function() {
    console.log(`[sandbox] ${DBNAME} Database connection opened`);
});
connection.on('reconnected', function(){
    console.log(`[sandbox] ${DBNAME} Database connection reconnected.`);
});
connection.on('disconnected', function(){
    console.log(`${DBNAME} DB DISCONNECTED`);
});

let logDb = mongoose.createConnection(config.db_log, connectOptions);

logDb.on('error', function(err){
    console.log(`Log DB connection error: ${err}`);
});
logDb.once('open', function() {
    console.log(`[${env}] Log Database connection opened`);
});
logDb.on('reconnected', function(){
    console.log(`[${env}] Log Database connection reconnected.`);
});
logDb.on('disconnected', function(){
    console.log(`Log DB DISCONNECTED`);
});

let partnerDb = mongoose.createConnection(config.db_partner, connectOptions);

partnerDb.on('error', function(err){
    console.log(`Partner DB connection error: ${err}`);
});
partnerDb.once('open', function() {
    console.log(`[${env}] Partner Database connection opened`);
});
partnerDb.on('reconnected', function(){
    console.log(`[${env}] Partner Database connection reconnected.`);
});
partnerDb.on('disconnected', function(){
    console.log(`Partner DB DISCONNECTED`);
});

let oauthDb = mongoose.createConnection(config.db_oauth, connectOptions);

oauthDb.on('error', function(err){
    console.log(`Oauth DB connection error: ${err}`);
});
oauthDb.once('open', function() {
    console.log(`[${env}] Oauth Database connection opened`);
});
oauthDb.on('reconnected', function(){
    console.log(`[${env}] Oauth Database connection reconnected.`);
});
oauthDb.on('disconnected', function(){
    console.log(`Oauth DB DISCONNECTED`);
});

// process.on('SIGINT', function(){
//     connection.close(function(){
//         console.log(`${DBNAME} Mongoose default connection disconnected through app termination`);
//     });
// });

module.exports = {
    moneyDb: connection,
    logDb: logDb,
    partnerDb: partnerDb,
    oauthDb: oauthDb
};
