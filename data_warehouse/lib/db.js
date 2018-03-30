// const pg = require('pg');
// let env = process.env.NODE_ENV || 'local';
// const config = require('../../config/config')[env];

// let configConnection = {
//     user : config.postgres.user,
//     database : config.postgres.database,
//     password : config.postgres.password,
//     host : config.postgres.host,
//     port : config.postgres.port,
//     max : 100,
//     idleTimeoutMillis : 30000
// };

// const pool = new pg.Pool(configConnection);

// process.on('uncaughtException', function (err) {
//     // logger.log('error', JSON.stringify(err.stack));
//     console.log(err.stack);
// });

// process.on('exit', function (code) {
//     // logger.log('About to exit with code: ' + code);
//     console.log('About to exit with code: ' + code);
// });

// pool.on('error',function(error,client){
//     console.error('idle client error', err.message, err.stack);
// });

// //export the query method for passing queries to the pool
// module.exports.query = function (text, values, callback) {
//   console.log('query:', text, values);
//   return pool.query(text, values, callback);
// };

// // the pool also supports checking out a client for
// // multiple operations, such as a transaction
// module.exports.connect = function (callback) {
//   return pool.connect(callback);
// };