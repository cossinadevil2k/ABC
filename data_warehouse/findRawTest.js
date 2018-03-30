const env = process.env.NODE_ENV || 'local';
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/config')[env];
const CronJob = require('cron').CronJob;
const moment = require('moment');
const async = require('async');
const LogDb = require('../model/helper/mongodb_connect_logs');
const Request = require('request');
const Slackbot = require('slackbot');
const TOKEN_SLACK = '50cXqEaCuKrX0LiyfaISgtFf';
const CHANNEL = 'https://hooks.slack.com/services/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';
const slackbot = new Slackbot('moneylover', TOKEN_SLACK);
const fs = require('fs');

const connectOptions = {
    server: {
        auto_reconnect: true
    }
};

require(path.join(__dirname, '../model/user'));
// Connect to MongoDB
mongoose.connect(config.db_url, connectOptions);
let db = mongoose.connection;

db.on('error', console.error.bind(console, ' Sync Database connection error:'));
db.once('open', function callback() {
    console.log('[' + env + '] ' + config.app.name + ' Sync Database connection opened.');
});

db.on('reconnected', function () {
    console.log('[' + env + '] ' + config.app.name + ' Database connection reconnected.');
});

db.on('disconnected', function () {
    console.log('Money DB DISCONNECTED');
});

//when nodejs process ends, close mongoose connection
process.on('SIGINT', function () {
    db.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

const User = mongoose.model('User');


// find user premium from 01/07 - 7/7

function slackPushMarkdown(content) {
    Request({
        "url": CHANNEL,
        "method": 'POST',
        "json": true,
        "body": {
            "author_name": "Metabase Bot",
            "attachments": [
                {
                    "fallback": "Hi Human! Getting a new message",
                    "pretext": "",
                    "color": "#36a64f",
                    "title": "Hi Human! Getting a new message",
                    "text": "Number of users Premium from 1-7-2017 00:00:00 -> 8-7-2017 00:00:00",
                    "fields": [
                        {
                            title: 'Amount',
                            value: content,
                            short: true
                        }
                    ],
                    "footer": "Slack API",
                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
                }
            ],
            mrkdwn: true
        }
    }, (error, res, body) => {
    });
}

function uploadFileSlack(file) {
    file = path.join(__dirname, '..', file);
    // console.log('file ', file);
    Request({
        "url": 'https://slack.com/api/files.upload',
        "method": 'POST',
        "formData": {
            "token": "xoxp-2181027373-162710118625-227199418624-82ec44c1ccd5658ab9c974047c59beba",
            "channels": "#data-warehouse",
            "file": file,
            "filename": 'users_premium_list.csv',
            "filetype": "csv"
        }
    }, (error, res, body) => {
        // console.log(JSON.parse(res.body));
    });
}

function createFileUserListXSLS(fileName, objectRow) {
    let writeStream = fs.createWriteStream(fileName, { flags: 'a' });

    let header = "Sl No" + "\t" + " UserId" + "\t" + "Register Date" + "\n";
    writeStream.write(header, 'utf-8');

    for (var i = 0; i < objectRow.length; i++) {
        let row = i + "\t" + objectRow[i].userId + "\t" + objectRow[i].register_date + "\n";
        // console.log('row ', row);
        writeStream.write(row, 'utf-8', function (error, result) {
            if (error) {
                // console.log('write err ', error);
            }
            process.nextTick(function () { });
        });
    }

    writeStream.close();
}

let getUser = function () {

    let startDate = new Date('2017-07-01');
    let endDate = new Date('2017-07-08');

    // console.log('startDate ', startDate);
    // console.log('endDate ', endDate);

    let users = [];

    User.find({
        createdDate: {
            $gte: startDate,
            $lte: endDate
        },
        premium_at: {
            $ne: null
        },
        purchased: true
    }, function (error, result) {
        if (error) {
            // console.log(error);
        } else {
            if (result.length > 0) {
                result.forEach((user) => {
                    let object = {
                        userId: user._id,
                        register_date: user.createdDate
                    }
                    users.push(object);
                });
                // slackPushMarkdown(JSON.stringify(users));
                let fileName = "user_list.csv";
                createFileUserListXSLS(fileName, users);
                fileName = path.join(__dirname, '..', fileName);
                fs.open(fileName, 'a', (err) => {
                    if (err) {
                        // console.log(err);
                    }

                    uploadFileSlack(fileName);
                })


                // console.log(users);

            }
        }
    })
}

getUser();