'use strict';

let env = process.env.NODE_ENV;

let config = require('../../config/config')[env];
let path = require('path');


module.exports = function() {
    var winston = require('winston');
    var logger = new(winston.Logger)({
        transports: [
            new(winston.transports.File)({
                filename: path.join(__dirname, '../', config.log_path + getDate() + '.log')
            })
        ]
    });
    return logger;
};

function getDate() {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + "_" + month + "_" + day;
}
