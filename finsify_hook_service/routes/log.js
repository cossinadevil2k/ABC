'use strict';

const mongoose = require('mongoose');
const LogDb = require('../../model/helper/mongodb_connect_logs');
const TransactionModel = mongoose.model('Transaction');
const CategoryModel = mongoose.model('Category');
const CategoryEditedLog = LogDb.model('FinsifyCategoryChangelog');
const LogTable = LogDb.model('FinsifyFetchLog');
const LogFinsifyHookLog = LogDb.model('FinsifyHookLog');

const moment = require('moment');

const transaction_field_select = 'account address amount category campaign createdAt displayDate exclude_report latitude longtitude note updateAt original_currency';

const ERROR = {
    UNKNOWN: 1,
    PARAM_INVALID: 2,
    START_DATE_GREATER_END_DATE: 3
};

function checkDate(start_date, end_date) {
    let sd = moment.unix(start_date);
    let ed = moment.unix(end_date);

    return sd.isBefore(ed);
}

function handleClassifyResult(list) {
    if (list.length === 0) {
        return [];
    }

    list.forEach((log, index) => {
        if (log.transaction.category.type === 2) {
            list[index].transaction.amount = list[index].transaction.amount * -1;
        }
    });

    return list;
}

let findByChangedDate = function (start_date, end_date, callback) {
    //UNIX timestamp
    const startDate = moment.unix(start_date);
    const endDate = moment.unix(end_date);

    const query = {
        changed_date: {
            '$gte': startDate,
            '$lte': endDate
        }
    };

    let population = {
        path: 'transaction',
        model: TransactionModel,
        select: transaction_field_select,
        populate: {
            path: 'category',
            select: 'type',
            model: CategoryModel
        }
    };

    CategoryEditedLog.find(query)
        .select('-changed_date')
        .sort('-changed_date')
        .populate(population)
        .exec(callback);
};

let appGet = function (req, res) {
    let start_date = req.body.start_date;
    let end_date = req.body.end_date;

    if (!start_date || !end_date) {
        return res.send({ status: false, error: ERROR.PARAM_INVALID });
    }

    if (!checkDate(start_date, end_date)) {
        return res.send({ status: false, error: ERROR.START_DATE_GREATER_END_DATE });
    }

    findByChangedDate(start_date, end_date, (err, list) => {
        if (err) {
            return res.send({ status: false, error: ERROR.UNKNOWN });
        }

        res.send({ status: true, data: list });
    });
};

let appWrongCategoryLog = function (req, res) {
    let start_time = req.body.start_time;
    let end_time = req.body.end_time;

    LogTable.getLogByTime(start_time, end_time, (err, results) => {
        if (err) {
            return res.json({ status: false });
        }

        res.json({ status: true, data: results });
    });
};

let appEmailUnsubscribe = function (req, res) {
    // console.log(`EMAIL HOOK TEST`);
    let postData = req.body;
    // console.log(postData);

    res.send('ok');
};

let appFinsifyHookLog = function (req, res) {
    LogFinsifyHookLog.getLog(null, null, function (error, results) {
        if (error) {
            res.json({
                status: false,
                message: error
            });
        } else {
            res.json({
                status: true,
                data: results
            });
        }
    })
}

module.exports = function (app) {
    app.post('/category_changelog', appGet);
    app.post('/wrong_category_log', appWrongCategoryLog);
    app.post('/email-unsubscribe', appEmailUnsubscribe);
    app.post('/finsify/hook-log', appFinsifyHookLog);
};