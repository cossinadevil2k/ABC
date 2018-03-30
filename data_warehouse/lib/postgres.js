// let env = process.env.NODE_ENV || 'local';
// const config = require('../../config/config')[env];

// var knex = require('knex')({
//     client: 'pg',
//     connection: {
//         host: config.postgres.host,
//         user: config.postgres.user,
//         password: config.postgres.password,
//         database: config.postgres.database,
//         port: config.postgres.port
//     },
//     pool: {min: 2, max: 5000000},
//     acquireConnectionTimeout: 10000,
//     debug: false
// });

// process.on('uncaughtException', function (err) {
//     // logger.log('error', JSON.stringify(err.stack));
//     console.log(err.stack);
// });

// process.on('exit', function (code) {
//     // logger.log('About to exit with code: ' + code);
//     console.log('About to exit with code: ' + code);
// });

// knex.raw('select 1+1 as result').then(function (id) {
//     if (id) {
//         console.log("[" + env + "]" + " Postgres Connected!");
//     } else {
//         console.log("[" + env + "]" + " Postgres Connection Failed");
//     }
// });

// module.exports = knex;