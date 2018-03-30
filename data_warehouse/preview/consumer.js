'use strict'

const env = process.env.NODE_ENV || 'local';
const path = require('path');
// const Postgres = require(path.join(__dirname, '../lib/postgres.js'));
const config = require(path.join(__dirname, '../../config/config.js'))[env];
// const DB = require(path.join(__dirname, '../lib/db'));
const pgp = require('pg-promise')();
const rabbitConfig = require('../config')[env];
const moment = require('moment');

const POSTGRESDB = pgp({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password
});

POSTGRESDB.any('SELECT $1::int AS number', ['2'])
    .then(function (data) {
        console.log('[' + env + ']' + ' Postgres connected!')
    })
    .catch(function (error) {
        console.log("[" + env + "]" + " Postgres Connection Failed ", error);
    })

process.on('uncaughtException', function (err) {
    // logger.log('error', JSON.stringify(err.stack));
    console.log(err.stack);
});

process.on('exit', function (code) {
    // logger.log('About to exit with code: ' + code);
    console.log('About to exit with code: ' + code);
});


const Rabbit = require('../lib/rabbit');

const WORKER_INSERT_GENERATED_DATA = rabbitConfig.EVENT_WORKER.WORKER_INSERT_GENERATED_DATA;
const WORKER_UPDATE_EXCUTED_DATA = rabbitConfig.EVENT_WORKER.WORKER_UPDATE_EXCUTED_DATA;
const EVENT_RECEIVE_RAW_SALE_INSERT = rabbitConfig.EVENT_WORKER.EVENT_RECEIVE_RAW_SALE_INSERT;
const WORKER_RECEIVE_RAW_SALE_INSERT = rabbitConfig.EVENT_WORKER.WORKER_RECEIVE_RAW_SALE_INSERT;
const EVENT_PUBLISH_FOR_INSERT = rabbitConfig.EVENT_WORKER.EVENT_PUBLISH_FOR_INSERT;
const EVENT_PUBLISH_FOR_UPDATE = rabbitConfig.EVENT_WORKER.EVENT_PUBLISH_FOR_UPDATE;

const EVENT_RECEIVE_RAW_DISCOUNT_INSERT = rabbitConfig.EVENT_WORKER.EVENT_RECEIVE_RAW_DISCOUNT_INSERT;
const WORKER_DISCOUNT_LOG_INSERT = rabbitConfig.EVENT_WORKER.WORKER_DISCOUNT_LOG_INSERT;

const PostgresWorker = new Rabbit.default({
    tag: 'white-house-worker',
    exchanges: [Rabbit.JOB_EXCHANGE],
    queues: [{
        name: WORKER_INSERT_GENERATED_DATA,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_UPDATE_EXCUTED_DATA,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_RECEIVE_RAW_SALE_INSERT,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }, {
        name: WORKER_DISCOUNT_LOG_INSERT,
        exchange: Rabbit.JOB_EXCHANGE.name,
        concurrency: 5000
    }]
});



const TABLE_NAME = "users";
const TABLE_SALE = 'purchase_report';
const TABLE_UTM_USER = 'utm_user';
const TABLE_DISCOUNT_TRACKING = 'discount_tracking';

let count = 0;

PostgresWorker.listen(EVENT_PUBLISH_FOR_INSERT, WORKER_INSERT_GENERATED_DATA, function (user, next) {
    // console.log('inserted user ', count++);
    insertPgDB(user, next);
});

PostgresWorker.listen(EVENT_PUBLISH_FOR_UPDATE, WORKER_UPDATE_EXCUTED_DATA, function (messageObject, next) {

    let userId = messageObject.userId;
    let updateData = messageObject.updateData;
    console.log('updated user ', userId);
    updateUserPostgresKnex(userId, updateData, TABLE_NAME)
        .then(function (data) {
            console.log(data);
            insertUtmUserTable(updateData, next);
            // next()
        })
        .catch(function (error) {
            // console.log('error', error);
            // next();
        });
});

let c = 0;
PostgresWorker.listen(EVENT_RECEIVE_RAW_SALE_INSERT, WORKER_RECEIVE_RAW_SALE_INSERT, function (item, next) {
    // console.log('log sale ', c++);
    insertPgDBForLogSale(item, next);
});

PostgresWorker.listen(EVENT_RECEIVE_RAW_DISCOUNT_INSERT, WORKER_DISCOUNT_LOG_INSERT, function (item, next) {
    // console.log('discount log ', c++);
    insertPgDBForLogDiscount(item, next);
});

let insertPgDBForLogDiscount = function (data, callback) {
    let rawQuery = {
        query: "INSERT INTO " + TABLE_DISCOUNT_TRACKING + "(user_id,campaign,product_id,discount_type,tracking_at) VALUES ($1,$2,$3,$4,$5) RETURNING id ",
        data: [data.user_id, data.campaign, data.product_id, data.discount_type, data.tracking_at]
    }


    POSTGRESDB.tx((db) => {
        db.query(rawQuery.query, rawQuery.data).then(resp => {
            callback();
        }).catch(err => {
            callback();
        });
    }).catch(err => {
        // callback();
    });
}

let insertUtmUserTable = function (data, callback) {
    console.log('data insert utm user ', data);
    let rawQuery = {
        query: "INSERT INTO " + TABLE_UTM_USER + " (user_id,utm_source,utm_medium,utm_term,utm_content,utm_campaign,registerd_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id ",
        data: [data.id, data.utm_source || "organic", data.utm_medium, data.utm_term, data.utm_content, data.utm_campaign, data.register_date]
    }

    POSTGRESDB.tx((db) => {
        db.query(rawQuery.query, rawQuery.data).then(resp => {
            callback();
        }).catch(err => {
            console.log('err utm ', err);
            callback();
        });
    }).catch(err => {
        console.log('err => utm ', err);
        // callback();
    });
    // callback();
}

let insertPgDBForLogSale = function (data, callback) {
    let rawQuery = {
        query: "INSERT INTO " + TABLE_SALE + " (user_id,product_id,type,price,created_at,last_update,type_name,source,rw_expire,expire_unit,expire_value) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id ",
        data: [data.user_id, data.product_id, data.type, data.price, data.created_at, data.last_update, data.type_name, data.source, data.rwExpire, convertToString(data.expire_unit), convertToString(data.expire_value)]
    }


    POSTGRESDB.tx((db) => {
        db.query(rawQuery.query, rawQuery.data).then(resp => {
            callback();
        }).catch(err => {
            // console.log('sale error ', err);
            callback();
        });
    }).catch(err => {
        // callback();
    });
}

let insertPgDB = function (user, callback) {
    insertQuery(user, TABLE_NAME)
        .then(function (resp) {
            insertUtmUserTable(user, callback);
            // callback();
        })
        .catch(function (err) {
            // callback();
        });
};

function insertQuery(data, tableName) {
    return new Promise(function (resovle, reject) {
        let userId = data.id;
        checkUserExits(userId, TABLE_NAME)
            .then(function (record) {
                if (record.length == 0) {

                    let rawQuery = {
                        query: "INSERT INTO " + tableName + "(id,register_date,last_sync,premium_date,country,android,ios"
                            + ",web,winphone,windows,premium_status,num_wallet,deactive_status,last_update,rw_expire,tags)" +
                            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id",
                        data: [
                            userId,
                            data.register_date,
                            data.last_sync,
                            data.premium_date,
                            data.country,
                            data.android,
                            data.ios,
                            data.web,
                            data.winphone,
                            data.windows,
                            data.premium_status,
                            data.num_wallet,
                            data.deactive_status,
                            data.last_update,
                            data.rwExpire,
                            convertToString(data.tags)
                        ]
                    }

                    POSTGRESDB.tx((db) => {
                        db.query(rawQuery.query, rawQuery.data).then(resp => {
                            resovle();
                        }).catch(err => {
                            // console.log('error ', err);
                            reject();
                        });
                    }).catch(err => {
                        // console.log('error ', err);
                        reject();
                    });
                } else {
                    resovle();
                }
            })
            .catch(function (err) {
                // console.log(err);
                reject();
            })
    })
}

function checkUserExits(userId, tableName) {
    return new Promise(function (resovle, reject) {
        POSTGRESDB.any('SELECT id FROM users WHERE id = $1', [userId])
            .then(function (resp) { resovle(resp) })
            .catch(function (err) { reject(err) });
    });
};

let updateUserPostgresKnex = function (userId, updateData, TABLE_NAME) {
    return new Promise(function (resovle, reject) {
        let dataUpdateObject = {
            register_date: updateData.register_date,
            country: updateData.country,
            web: updateData.web,
            ios: updateData.ios,
            windows: updateData.windows,
            android: updateData.android,
            winphone: updateData.winphone,
            deactive_status: updateData.deactive_status,
            last_sync: updateData.last_sync,
            num_wallet: updateData.num_wallet,
            premium_date: updateData.premium_date,
            premium_status: updateData.premium_status,
            last_update: new Date(),
            rwExpire: updateData.rwExpire,
            tags: updateData.tags
        }

        let rawQuery = {
            query: "UPDATE " + TABLE_NAME + " SET " +
                "register_date = $1, " +
                "country = $2, " +
                "web = $3, " +
                "ios = $4, " +
                "windows = $5, " +
                "android = $6, " +
                "winphone = $7, " +
                "deactive_status = $8, " +
                "last_sync = $9, " +
                "num_wallet = $10, " +
                "premium_date = $11, " +
                "premium_status = $12, " +
                "last_update = $13, " +
                "rw_expire = $14," +
                "tags = $15" +
                "WHERE id = $16",
            data: [
                dataUpdateObject.register_date,
                dataUpdateObject.country,
                dataUpdateObject.web,
                dataUpdateObject.ios,
                dataUpdateObject.windows,
                dataUpdateObject.android,
                dataUpdateObject.winphone,
                dataUpdateObject.deactive_status,
                dataUpdateObject.last_sync,
                dataUpdateObject.num_wallet,
                dataUpdateObject.premium_date,
                dataUpdateObject.premium_status,
                dataUpdateObject.last_update,
                dataUpdateObject.rwExpire,
                convertToString(dataUpdateObject.tags),
                userId
            ]
        }

        POSTGRESDB.tx(db => {
            db.query(rawQuery.query, rawQuery.data).then(resp => {
                if (resp) {
                    // console.log('update record ', resp);
                }
                resovle();
            }).catch(err => {
                console.log('error ', err);
                reject();
            });
        }).catch(err => {
            console.log('error ', err);
            reject(err);
        });
    });
};

function convertToTimeStamp(date) {
    return (date != null || date != undefined) ? moment(date).format('X') : 'null';
}

function convertToString(str) {
    return (str != null || str != undefined) ? str.toString() : 'null';
}