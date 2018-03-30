'use strict';

let mongoose = require('mongoose');
let moment = require('moment');

require('./model/user');
require('./model/item');
require('./model/item_log');

let env	= process.env.NODE_ENV;
let config	= require('./config/config')[env];

mongoose.connect(config.db_url);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

let Turnover = require('./helper/turnover');
let Date = process.env.DATE;
let ProductId = process.env.PRODUCT_ID;

let data = [];
let LIMIT = 7;

let startDate = moment(Date, 'DD/MM/YYYY');
let endDate = moment(Date, 'DD/MM/YYYY').subtract(7, 'days');

// function doIt(dayToSubtract, callback) {
//     let startTime = moment(startDate).subtract(dayToSubtract, 'days');
//     Turnover.getTurnoverByDate(startTime, (err, result) => {
//         if (err) return callback(err);
//
//         data.push({date: startTime.format('DD/MM/YYYY'), amount: result});
//
//         if (dayToSubtract < LIMIT) {
//             dayToSubtract++;
//             return doIt(dayToSubtract, callback);
//         } else {
//             callback();
//         }
//     });
// }
//
// doIt(0, err => {
//     console.log(err);
//     console.log(data);
// });

// function calculateByProductId(dayToSubtract, callback) {
//     let startTime = moment(startDate).subtract(dayToSubtract, 'days');
//     Turnover.getTurnoverByProductIdAndDate(ProductId, startTime, (err, result) => {
//         if (err) return callback(err);
//
//         data.push({date: startTime.toISOString(), amount: result});
//
//         if (dayToSubtract < LIMIT) {
//             dayToSubtract++;
//             return calculateByProductId(dayToSubtract, callback);
//         } else {
//             callback();
//         }
//     });
// }
//
// calculateByProductId(0, err => {
//     console.log(err);
//     console.log(data);
// });

function stat(callback) {
    Turnover.getAmountGroupByProductId(endDate, startDate, (err, result) => {
        if (err) return callback(err);

        result.sort((a, b) => {
            return b.amount - a.amount;
        });
        callback(null, result);
    });
}

stat(console.log);
