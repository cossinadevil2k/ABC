/*
 User
 */

'use strict';

let env = process.env.NODE_ENV;
let mongoose = require('mongoose');
let config = require('../../config/config')[env];
let LogDb = require('../../model/helper/mongodb_connect_logs');

let User = mongoose.model('User');
let Device = mongoose.model('Device');
let Account = mongoose.model('Account');
let PremiumLog = mongoose.model('PremiumLog');
let Issue = mongoose.model('HelpDeskIssue');
let Message = mongoose.model('HelpDeskMessage');
let Stats = mongoose.model('statsDaily');
let ItemLog = LogDb.model('ItemLog');
let ItemModel = mongoose.model('Item');
let UseCreditModel = mongoose.model('UseCredit');
let CampaignModel = mongoose.model('Campaign');
let Slackbot = require('slackbot');
let slackbot = new Slackbot('moneylover', '50cXqEaCuKrX0LiyfaISgtFf');

let Mailler = require('../../model/email');
let Permission = require('../../model/permission');
let async = require('async');
let moment = require('moment');
let validator = require('../../helper/validators');
let hook = require('./hook');
let pushController = require('../../model/sync/push_controller');
let fs = require('fs');
let redisClient = require('../../config/database').redisClient;
let utils = require('../../helper/utils');
let _ = require('underscore');
let searchQuery = require('../../helper/searchQuery');

let BackendNotification = mongoose.model('BackendNotification');
let io = require('socket.io-emitter')({ host: config.redis.host, port: config.redis.port });
let room = '/backend/notification/admin/';

let selectField = 'email purchased createdDate lastLogin acceptSync limitDevice icon_package tags expireDate firstPurchase lastPurchase ipRegistered ipLastLogin lastSync';
let inactiveMinimumDay = 15;

const ITEM_TYPE = {
    ICON: 1,
    SUBSCRIPTION: 2,
    USE_CREDIT: 3,
    PREMIUM: 5,
    SEMI_PREMIUM: 6
};

const SUBSCRIPTION_KEY = {
    premium: {
        expire: "expireDate",
        product: "subscribeProduct",
        lastPurchase: "lastPurchase",
        firstPurchase: "firstPurchase",
        market: "subscribeMarket"
    },
    linked_wallet: {
        expire: "rwExpire",
        product: "rwProduct",
        lastPurchase: "rwLastPurchase",
        firstPurchase: "rwFirstPurchase",
        market: "rwMarket"
    },
    semi_premium: {
        expire: "expireDate",
        product: "product",
        lastPurchase: "lastPurchase",
        firstPurchase: "firstPurchase",
        market: "market"
    }
};

const MARKET = {
    'android': 'googleplay',
    'ios': 'apple_store',
    'winphone': 'windowsstore'
}

function pushToSlack(channel, content) {
    slackbot.send(channel, JSON.stringify(content), function (err, response, body) {
    });
}

function checkPermissionAccessPage(req, res) {
    if (req.session.permission != 'Admin' && req.session.permission != 'Dev' && req.session.permission != 'Support') {
        return res.json({
            error: true,
            message: 'Permission denied'
        })
    }
}

function createPremiumFeedbackHelpdesk(userId, adminId, content) {
    createHelpdeskIssue(userId, adminId, "Premium Feedback", content, function (err, issueId) {
        if (!err) hook.pushPurchased(userId, issueId);
    });
}

function createHelpdeskIssue(userId, adminId, title, content, callback) {
    async.waterfall([
        function (cb) {
            //create issue
            let info = {
                name: title,
                user: userId,
                assigned: adminId,
                issueType: 1,
                metadata: {
                    p: true,
                    s: true
                }
            };

            Issue.newIssue(info, function (err, issue) {
                if (err) cb(err);
                else if (!issue) cb('create_issue_failed');
                else cb(null, issue._id);
            });
        },
        function (issueId, cb) {
            Message.newMessage(issueId, true, adminId, content, function (err, message) {
                if (err) cb(err);
                else if (!message) cb('create_message_failed');
                else cb(null, issueId);
            });
        }
    ], callback);
}

function activePremium(userId, reason, adminId, callback) {
    // User.activeUser(user_id, (status) => {
    // 	if (!status) {
    // 		return callback(true);
    // 	}
    //
    // 	callback(false, 'done');
    //
    // 	createPremiumFeedbackHelpdesk(user_id, admin_id, reason);
    // });

    let today = moment();
    let expire = moment().add(config.subscriptionExpire.premium.value, config.subscriptionExpire.premium.unit);

    let update = {
        $set: {
            purchased: true,
            premium_at: today,
            expireDate: expire,
            firstPurchase: today,
            lastPurchase: today,
            subscribeProduct: 'premium_sub_year_1',
            subscribeMarket: 'Other'
        }
    };

    User.findByIdAndUpdate(userId, update, err => {
        if (err) {
            return callback(err);
        }

        createPremiumFeedbackHelpdesk(userId, adminId, reason);
        callback();
    });
}

function saveLog(user_id, product_id, product_type, callback) {
    let options = {
        source: 'admin',
        type: product_type
    };

    ItemLog.createLog(user_id, product_id, callback, options);
}

function saveAdminLog(user_email, admin_name, product_id) {
    let action = `Send ${product_id}`;
    PremiumLog.addNew(user_email, admin_name, action, () => {
    });
}

function addAddItemIntoUserIconPack(userId, productId) {
    return new Promise((resolve, reject) => {
        User.findById(userId, (err, user) => {
            if (err) {
                // console.log(`addAddItemIntoUserIconPack`);
                // console.log(err);
                return reject(err);
            }

            if (!user) {
                return resolve();
            }

            user.icon_package.push(productId);
            user.icon_package = _.unique(user.icon_package);

            user.save(err => {
                return err ? reject(err) : resolve();
            });
        });
    });
}

function findSubscriptionUser(type, skip, limit, callback) {
    const EXPIRE_KEY = {
        premium: 'expireDate',
        'linked-wallet': 'rwExpire'
    };

    const LAST_PURCHASE_KEY = {
        premium: 'lastPurchase',
        'linked-wallet': 'rwLastPurchase'
    };

    if (!EXPIRE_KEY[type]) return callback(null, []);

    let query = {};
    let sortOption = {};
    sortOption[LAST_PURCHASE_KEY[type]] = -1;
    query[EXPIRE_KEY[type]] = { $ne: null };

    if (type === 'premium') {
        let checkPoint = moment('01-01-2110', 'DD-MM-YYYY');
        query[EXPIRE_KEY[type]] = { $lt: checkPoint };
    }

    async.series({
        data: function (cb) {
            User.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(cb)
        },
        count: function (cb) {
            User.count(query, cb);
        }
    }, callback);
}

function findNoSubscriptionUser(type, skip, limit, callback) {

    if (type === 'no-linked-wallet') {
        type = 'linked-wallet';
    }

    if (type === 'no-premium') {
        type = 'premium';
    }

    const EXPIRE_KEY = {
        premium: 'expireDate',
        'linked-wallet': 'rwExpire'
    };

    const LAST_PURCHASE_KEY = {
        premium: 'lastPurchase',
        'linked-wallet': 'rwLastPurchase'
    };

    if (!EXPIRE_KEY[type]) return callback(null, []);

    let query = {};
    let sortOption = {};
    sortOption[LAST_PURCHASE_KEY[type]] = -1;
    query[EXPIRE_KEY[type]] = { $eq: null };

    async.series({
        data: function (cb) {
            User.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(cb)
        },
        count: function (cb) {
            User.count(query, cb);
        }
    }, callback);
}

function increaseExpireDate(info, callback) {
    let keyString = SUBSCRIPTION_KEY[info.type];

    User.findById(info.userId, (err, user) => {
        if (err) {
            return callback(err);
        }

        if (!user) {
            return callback('User not found');
        }

        let today = moment();
        let update = {};

        if (!user[keyString.expire]) update[keyString.expire] = today;
        else if (user[keyString.expire] < today) update[keyString.expire] = today;

        let momentExpire = moment(update[keyString.expire]);
        update[keyString.expire] = momentExpire.add(info.value, info.unit);

        if (info.purchaseDate) {
            update[keyString.lastPurchase] = moment(info.purchaseDate, 'yyyy-mm-dd');
        } else {
            update[keyString.lastPurchase] = today;
        }

        update[keyString.market] = info.source || 'Other';
        update[keyString.product] = info.productId;

        if (!user[keyString.firstPurchase]) {
            update[keyString.firstPurchase] = update[keyString.lastPurchase];
        }

        if (info.type === 'premium') {
            if (!user.purchased) {
                update.purchased = true;
                update.premium_at = today;
            }
        }

        User.findByIdAndUpdate(info.userId, update, err => {
            if (err) {
                return callback(err);
            }

            pushSubscriptionNotification(info.type, info.userId, update[keyString.expire]);
            callback(null, update[keyString.expire]);
        });
    });
}

function pushSubscriptionNotification(type, userId, expireDate) {
    if (type === 'premium') {
        pushController.pushSubscriptionRenew(userId, expireDate);
    } else {
        pushController.pushLinkedWalletRenew(userId, expireDate);
    }
}

function clearOldDiscount(tags) {
    if (tags.length === 0) return tags;

    for (let i = 0; i < tags.length; i++) {
        if (tags[i].indexOf('discount:') !== -1) {
            tags.splice(i, 1);
            return clearOldDiscount(tags);
        }
    }

    return tags;
}

function clearOldCampaignDiscount(tags) {
    if (tags.length === 0) return tags;

    for (let i = 0; i < tags.length; i++) {
        if (tags[i].indexOf('campaign_discount:') !== -1) {
            tags.splice(i, 1);
            return clearOldCampaignDiscount(tags);
        }
    }

    return tags;
}

function clearOldDiscount2(tags) {
    if (tags.length === 0) return tags;

    tags.forEach((tag) => {
        let key = tag.split(":")[0];
        if (key === 'discount') {
            let index = tags.indexOf(key);
            tags.splice(index, 1);
        }

        if (key === 'campaign_discount') {
            let index = tags.indexOf(key);
            tags.splice(index, 1);
        }
    });

    return tags;
}

let sendToBrowser = function (res, status, data) {
    res.send({ error: status, msg: data });
};

let parseDated = function (dated) {
    return moment(dated, 'MM-DD-YYYY');
};

let totalUser = function (condition, startDate, endDate, callback) {
    condition = condition || {};
    if (startDate && endDate) condition.createdDate = { $gte: startDate._d, $lte: endDate._d };

    User.count(condition, function (err, total) {
        if (err) callback(false);
        else callback(total);
    });
};

let countUser = function (query, startDate, endDate, callback) {
    User.aggregate(
        {
            $match: {
                'createdDate': { $gte: startDate._d, $lte: endDate._d }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdDate" },
                    month: { $month: "$createdDate" },
                    days: { $dayOfMonth: "$createdDate" }
                },
                total: {
                    $sum: 1
                }
            }
        },
        {
            $group: {
                _id: {
                    year: "$_id.year",
                    month: "$_id.month"
                },
                dailyStats: {
                    $push: {
                        ngay: '$_id.days',
                        count: "$total"
                    }
                }
            }
        },
        // {
        // $group : {
        // 		_id : { year: "$_id.year" },
        // 		monthlyStats: {
        // 			$push: {
        // 				month: "$_id.month",
        // 				count: "$dailyStats",
        // 			}
        // 		}
        // 	}
        // },
        callback
    );
};

let findUsers = function (condition, limit, callback) {
    User.find(condition)
        .select(selectField)
        .sort({ createdDate: -1 })
        .skip(limit.offset)
        .limit(limit.limit)
        .lean()
        .exec(function (err, users) {
            if (err) callback(false);
            else callback(users);
        });
};
let findUsers2 = function (condition, callback) {
    User.find(condition)
        .select(selectField)
        .sort({ createdDate: -1 })
        .skip(0)
        .exec(function (err, users) {
            if (err) callback(false);
            else callback(users);
        });
};

let userUpdate = function (userInfo, callback, adminId) {
    User.findById(userInfo._id, function (err, user) {
        if (err || !user) return callback(err);

        let changeAcceptSync = (user.acceptSync != userInfo.acceptSync);
        let changePurchased = (user.purchased != userInfo.purchased);
        //let changeSkipPassword = (user.skipPassword != userInfo.skipPassword);

        if (changePurchased && userInfo.purchased) {
            return activePremium(userInfo._id, userInfo.reason, adminId, callback);
        }

        // user.email = userInfo.email;
        user.purchased = userInfo.purchased;
        user.acceptSync = userInfo.acceptSync;
        user.skipPassword = userInfo.skipPassword;
        user.tags = userInfo.tags;
        user.save(function (err, data) {
            callback(err, data);
            if (changeAcceptSync && user.acceptSync) hook.pushAcceptSync(user._id);
        });
    });
};

let appUserUpdate = function (req, res) {
    let postData = req.body;

    if (validator.isEmail(postData.email)) {
        userUpdate(postData, function (err, data) {
            res.send({ error: err, msg: !err, data: data });
        }, req.session.adminId);
    } else {
        sendToBrowser(res, true, 'Invalid type email');
    }
};


let appUserList = function (req, res) {
    checkPermissionAccessPage(req, res);

    let condition = {};
    let limit = req.body.limit;
    findUsers(condition, limit, function (users) {
        if (!users) res.send({ error: true, msg: 'Error' });
        else res.send({ error: false, data: users });
    });
};

let appUserSubscription = function (req, res) {
    checkPermissionAccessPage(req, res);
    
    let type = req.body.subscription;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 40;

    if (!type) return res.json({ s: false });

    findSubscriptionUser(type, skip, limit, (err, result) => {
        res.json({ status: !err, data: result.data, total: result.count });
    });
};

let appUserNoSubscription = function (req, res) {
    checkPermissionAccessPage(req, res);
    
    let type = req.body.subscription;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 40;

    if (!type) return res.json({ s: false });

    findNoSubscriptionUser(type, skip, limit, (err, result) => {
        res.json({ status: !err, data: result.data, total: result.count });
    });
};

let appUserSearch = function (req, res) {

    checkPermissionAccessPage(req, res);

    let condition = req.body.condition;
    let limit = req.body.limit;
    let mode = req.body.mode;

    let options = {
        sort: {
            createdDate: { order: "desc" }
        },
        from: limit.offset,
        size: limit.limit,
        hydrate: true
    };

    if (mode === 1) {
        User.findOne(condition, function (err, user) {
            if (err) res.send({ error: true });
            else {
                if (!user || user === {}) res.send({ error: false, data: [] });
                else res.send({ error: false, data: [user], total: 1 });
            }
        });

    } else {
        // mode === 0
        let mailKeyword = condition.email.split(' ');
        mailKeyword.forEach(function (key, index) {
            if (["&&", "||"].indexOf(key) == -1) {
                mailKeyword[index] = "*" + key + "*";
            } else if (key == '&&') mailKeyword[index] = "AND";
            else if (key == '||') mailKeyword[index] = "OR";
        });
        mailKeyword = mailKeyword.toString().replace(/,/g, ' ');
        User.search({
            query_string: {
                default_field: "email",
                query: mailKeyword
            }
        }, options, function (err, result) {
            if (err) res.send({ error: true });
            else {
                res.send({ error: false, data: result.hits.hits, total: result.hits.total });
            }
        });
    }
};

let appUserCount = function (req, res) {
    let startDate = parseDated(req.body.startDate);
    let endDate = parseDated(req.body.endDate).endOf('day');
    let type = req.body.type;

    if (type === 1) {
        totalUser(null, null, null, function (total) {
            if (!total) res.send({ error: true, msg: 'Error' });
            else res.send({ error: false, data: total });
        });
    } else if (type === 2) {
        totalUser(null, startDate, endDate, function (total) {
            if (!total) res.send({ error: true, msg: 'Error' });
            else res.send({ error: false, data: total });
        });
    } else if (type === 3) {
        totalUser({ acceptSync: true }, null, null, function (total) {
            if (total === false) res.send({ error: true, msg: 'Error' });
            else res.send({ error: false, data: total });
        });
    } else {
        countUser({}, startDate, endDate, function (err, user) {
            if (err) res.send({ error: true, msg: 'Error' });
            else res.send({ error: false, data: user });
        });
    }
};

let saveEmail = function (users, res) {
    let listMail = '';
    users.forEach(function (user) {
        listMail += user.email + '\n';
    });

    res.setHeader('Content-disposition', 'attachment; filename=[Zoo]Export_email' + moment().format('YYYY-MM-DD') + '.txt');
    res.setHeader('Content-type', 'text/plain');
    res.send(listMail);
};

let appExport = function (req, res) {
    if (!req.session.adminId) res.send(403);
    let keyword = req.query.keyword;
    let condition = {};
    if (keyword && keyword != 'undefined') condition = { email: new RegExp(keyword, 'i') };
    findUsers2(condition, function (users) {
        if (users) saveEmail(users, res);
        else res.send(500);
    });
};

let appUserDevice = function (req, res) {
    if (!req.session.adminId) res.send(403);
    else {
        let userId = req.body.user._id;

        //Device.find({owner: userId}, function(err, devices){
        //	if(err) res.send(500);
        //	else res.send({error: false, data: devices});
        //});

        Device.find({ owner: userId })
            .sort('platform')
            .exec(function (err, devices) {
                if (err) {
                    res.send(500);
                } else {
                    res.send({ error: false, data: devices });
                }
            });
    }
};

let appRemoveDevice = function (req, res) {
    if (!req.session.adminId) res.send(403);
    else {
        let device = req.body;
        if (device) {
            if (device.deviceId) {
                Device.unlinkUser(device, function () {
                    res.send({ error: false, data: true });
                }, true);
            } else res.send({ error: true, msg: 'Error' });
        } else res.send({ error: true, msg: 'Error' });
    }
};

let appChangeLimitDevice = function (req, res) {
    let query = req.body.userinfo;
    User.findOneAndUpdate({ "_id": query.uid }, { limitDevice: query.limitDevice }, function (err, data) {
        if (err) res.send({ err: true });
        else {
            if (data) res.send({ err: false });
        }
    });
};

let appSendPremiumCode = function (req, res) {
    let postData = req.body;

    if (postData.email && postData.lang) {
        Mailler.sendPremiumCode(postData, function (status) {
            if (status) {
                PremiumLog.addNew(postData.email, req.session.adminName, "Code sent", function (result) {
                    if (result) {
                        res.send({ s: true });
                    } else {
                        res.send({ s: false, msg: "email_sent_but_log_saving_error" });
                    }
                });
            } else {
                res.send({ s: false, msg: "send_mail_error" });
            }
        });
    } else {
        res.send({ s: false, msg: "email_and_name_required" });
    }
};

let userExport = function (req, res) {
    let platform = req.body.platform,
        limit = req.body.limit,
        skip = req.body.skip,
        sort = req.body.sort;

    let counter = 0;
    let list = "";
    let sortOption = { createdDate: (sort === 'newest') ? -1 : 1 };

    function checkPlatform(userId, platformId, callback) {
        Device.findByUser(userId, function (devices) {
            if (!devices) return callback(false);

            async.eachSeries(devices, function (device, cb) {
                if (device.platform === platformId) cb(true);
                else cb();
            }, function (result) {
                if (result) callback(true);
                else callback(false);
            });
        });
    }

    function userListHandler(listUser) {
        async.eachSeries(listUser, function (user, cb) {
            checkPlatform(user._id, platform, function (result) {
                if (result) {
                    counter++;
                    list += (user.email + '\n');
                    cb();
                } else cb();
            });
        }, function () {
            res.json({ s: true, d: list });
        });
    }

    User.find()
        .select('_id email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(function (err, result) {
            if (err) throw err;
            else {
                userListHandler(result);
            }
        });

};

let sendIconGift = function (req, res) {
    let admin = req.session.adminName;
    let postData = req.body.giftInfo;

    function give(userId, email) {
        hook.pushIconGift(userId, email, admin, postData.reason, postData.iconId, postData.iconName, postData.iconLink);
        saveLog(userId, postData.iconId, ITEM_TYPE.ICON, function () {
        });
        saveAdminLog(email, admin, postData.iconId);
        addAddItemIntoUserIconPack(userId, postData.iconId);
    }

    if (postData.userId) {
        createHelpdeskIssue(postData.userId, req.session.adminId, "Icon Feedback", postData.reason, function (err) {
            if (!err) {
                give(postData.userId, postData.userEmail);
            }
        });
    } else {
        async.eachSeries(postData.listEmail, (email, done) => {
            async.setImmediate(() => {
                if (!email || email === "") return done();
                User.findByEmail(email, (err, user) => {
                    if (err) return done(err);
                    if (!user || !user._id) return done();
                    if (user.icon_package.indexOf(postData.iconId) > -1) return done();

                    give(user._id, email);
                    done();
                });
            });
        }, err => {
            // if (err) console.log(err);
        });
    }

    res.send({ s: true });
};

let restoreWallet = function (req, res) {
    let walletId = req.body.walletId;

    if (!walletId) return res.json({ s: false });

    Account.findById(walletId, function (err, wallet) {
        if (err) throw err;
        else if (!wallet) res.json({ s: false });
        else {
            async.parallel({
                readPermission: function (cb) {
                    Permission.checkReadPermission(wallet.owner, walletId, function (errCheck, result) {
                        if (result) cb(null, true);
                        else cb(null, false);
                    });
                },
                writePermission: function (cb) {
                    Permission.checkWritePermission(wallet.owner, walletId, function (errCheck, result) {
                        if (result) cb(null, true);
                        else cb(null, false);
                    });
                }
            }, function (err, results) {
                if (!results.readPermission || !results.writePermission) {
                    //check user in list user
                    wallet.isDelete = false;
                    wallet.listUser = [];
                    wallet.tokenDevice = 'moneylover';
                    wallet.save(function (err) {
                        if (err) {
                            return res.json({ s: false });
                        }

                        //restore permission
                        if (!results.readPermission) results.readPermission = true;
                        if (!results.writePermission) results.writePermission = true;

                        Permission.setAccountPermission(wallet.owner, walletId, results.readPermission, results.writePermission, function () {
                            User.updateLastSync(wallet.owner);
                            res.json({ s: true });
                        });
                    });
                } else {
                    wallet.isDelete = false;
                    wallet.listUser = [wallet.owner];
                    wallet.tokenDevice = 'moneylover';
                    wallet.save(function (err) {
                        if (err) {
                            res.json({ s: false });
                        } else {
                            User.updateLastSync(wallet.owner);
                            res.json({ s: true });
                        }
                    });
                }
            });
        }
    });
};

let addExpire = function (req, res) {
    let userId = req.body.userId,
        timeUnit = req.body.timeUnit,
        timeValue = req.body.timeValue;

    User.setExpire(userId, timeUnit, timeValue, function (err, result) {
        if (err || !result) res.json({ s: false });
        else res.json({ s: true, d: result });
    });
};

let appGetIssueList = function (req, res) {
    let userId = req.body.userId,
        skip = req.body.skip || 0,
        limit = req.body.limit || 0;

    if (!userId) return res.send({ s: false });

    Issue.findByUser(userId, skip, limit, function (err, list) {
        if (err) res.send({ s: false });
        else res.send({ s: true, d: list });
    });
};

let appFindByTag2 = function (req, res) {
    let tags = req.body.tags,
        skip = req.body.skip,
        limit = req.body.limit;

    let options = {
        hydrate: true
    };

    if (tags.indexOf('active:') > -1) {
        options.sort = {
            lastSync: { order: "asc" }
        }
    } else {
        options.sort = {
            createdDate: { order: "desc" }
        }
    }

    options = utils.skipLimitSearchQueryDetect(tags, options);
    options.size = limit;
    if (options.from) {
        options.from += skip;
    } else {
        options.from = skip;
    }

    let query = utils.createUserQuery(tags);

    User.search(query, options, (err, result) => {
        if (err) return res.send({ s: false });
        res.send({ s: true, d: result.hits.hits, t: result.hits.total });
    });
};

let appFindAndExportCsv = function (req, res) {
    let tags = req.body.tags;

    if (!tags) {
        return res.send({ s: false, e: 'PARAM_INVALID' });
    }

    res.send({ s: true });

    let options = {
        hydrate: false,
        skip: 0,
        limit: 9999999
    };

    if (tags.indexOf('active:') > -1) {
        options.sort = {
            lastSync: { order: "asc" }
        }
    } else {
        options.sort = {
            createdDate: { order: "desc" }
        }
    }

    options = utils.skipLimitSearchQueryDetect(tags, options);

    let query = utils.createUserQuery(tags);

    User.search(query, options, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            let data = handleDataToExportCsv(result.hits.hits);
            let today = moment().format('YYYY/MM/DD');
            let filename = "[" + today.replace(/\//gi, '') + "]" + tags.replace(/ /gi, '_') + ".csv";

            fs.writeFile(config.root + '/backend/public/export/csv/' + filename, data, { flag: 'w+' }, function (err) {
                if (!err) {
                    sendNotification(req.session.adminId, 'csv_export', 'Download CSV file ' + filename + ' (open in new tab)', '/export/csv/' + filename);
                }
            });
        }
    });
};

function handleDataToExportCsv(user_list) {
    let list = '';

    user_list.forEach(function (element) {
        list += element._source.email + '\n';
    });

    return list;
}

function sendNotification(adminId, type, content, url) {
    BackendNotification.addNew(adminId, type, content, url, function (err) {
        if (!err) {
            io.emit(room + adminId, JSON.stringify({ type: type, url: url }));
        }
    });
}

let appSetSkipPassword = function (req, res) {
    //sample redis key: production-<userid>-skip-password
    let userId = req.body.userId,
        status = req.body.status;

    let liveTime = 1800;

    if (!userId) return res.json({ s: false });

    let key = env + '-' + userId + '-skip-password';

    function checkExists(key, callback) {
        redisClient.EXISTS(key, function (e, r) {
            if (e) {
                callback(e);
            } else {
                callback(!!r);
            }
        });
    }

    function createKey(key, callback) {
        redisClient.SET(key, 'true', function (err, result) {
            if (err) {
                callback(!!err);
            } else if (result) {
                redisClient.EXPIRE(key, liveTime, function (err2, result2) {
                    if (err2) {
                        callback(!!err2);
                    } else callback(!!result2);
                });
            } else callback(true);
        });
    }

    function deleteKey(key, callback) {
        redisClient.DEL(key, function (err, result) {
            if (err) {
                callback(!!err);
            } else callback(!!result);
        });
    }

    if (status) {
        //set skip = true
        checkExists(key, function (status) {
            if (status) res.json({ s: true });
            else {
                createKey(key, function (status2) {
                    res.json({ s: !!status2 });
                });
            }
        });
    } else {
        //set skip = false
        checkExists(key, function (status) {
            if (status) {
                deleteKey(key, function (status2) {
                    res.json({ s: !!status2 });
                });
            } else res.json({ s: true });
        });
    }
};

let appGetSkipPassword = function (req, res) {
    let userId = req.body.userId;

    if (!userId) return res.json({ s: false });

    let key = env + '-' + userId + '-skip-password';

    redisClient.EXISTS(key, function (err, result) {
        if (err) {
            res.json({ s: false });
        } else res.json({ s: true, d: !!result });
    });
};

let premiumCount = function (req, res) {
    let params = req.body;
    let start = params.start;
    let end = params.end;
    let mode = params.mode || 'days';
    let startTime;
    let endTime;
    let format;
    let result = [];

    if (mode === 'days') {
        startTime = moment(start, 'DD/MM/YYYY').startOf('day');
        endTime = moment(end, 'DD/MM/YYYY').startOf('day');
        format = 'DD/MM';
    } else if (mode === 'months') {
        startTime = moment(start, 'DD/MM/YYYY').startOf('month');
        endTime = moment(end, 'DD/MM/YYYY').startOf('month');
        format = 'MM/YYYY';
    } else {
        startTime = moment(start, 'DD/MM/YYYY').startOf('year');
        endTime = moment(end, 'DD/MM/YYYY').startOf('year');
        format = 'YYYY';
    }


    function countPremium(startTime, callback) {
        let tempEndTime = moment(startTime).add(1, mode);

        User.count({ premium_at: { $gte: startTime, $lt: tempEndTime } }, (err, count) => {
            if (err) return callback(err);

            result.push({
                date: startTime.format(format),
                amount: count
            });

            if (startTime.isSameOrAfter(endTime)) return callback();

            return countPremium(tempEndTime, callback);
        });
    }

    countPremium(startTime, err => {
        res.json({ s: !err, d: result });
    });
};

let appUpdateTag = function (req, res) {
    let tags = req.body.tags;
    let userId = req.body.userId;

    if (!tags || !userId) return res.send({ s: false });
    else {
        User.findByIdAndUpdate(userId, { tags: tags }, function (err, result) {
            if (err || !result) res.send({ s: false });
            else res.send({ s: true });
        });
    }
};

let appUpdateDiscount = function (req, res) {
    let discountValue = req.body.discount;
    let userId = req.body.userId;

    if (!discountValue || !userId) return res.json({ s: false });

    User.findById(userId, 'tags', (err, user) => {
        if (err) return res.json({ s: false });

        let tags = user.tags;
        tags = clearOldDiscount(tags);

        if (discountValue > 0) {
            tags.push('discount:' + discountValue);
            tags.push('campaign_discount:' + 'other');
        }

        User.findByIdAndUpdate(userId, { tags: tags }, err => {
            res.json({ s: !err });
        });
    });
};

const DISCOUNT_TYPE = {
    'ALL': '99'
}

let appUpdateDiscountListEmail = function (req, res) {
    let discountValue = req.body.discountInfo.userDiscount;
    let userDiscountList = req.body.discountInfo.listEmail;
    let type = req.body.discountInfo.type;
    let campaign = req.body.discountInfo.campaign;

    if (!type && !discountValue && !userDiscountList && !campaign) {
        return res.json({
            status: false,
            messgae: 'params inavild or not exists'
        });
    }

    switch (type) {
        case DISCOUNT_TYPE.ALL: {
            sendAllDiscount(discountValue, userDiscountList, campaign, function (err, result) {
                if (err) {
                    return res.json({
                        status: false,
                        message: err
                    });
                } else {
                    res.json({
                        status: true
                    });
                }
            });

            break;
        }
        default:
            break;
    }

}

function sendAllDiscount(discountValue, userDiscountList, campaign, cb) {
    async.eachSeries(userDiscountList, function (userEmail, next) {
        let tags;
        async.series({
            findByEmail: function (callback) {
                User.findOne({
                    email: userEmail.trim()
                }, function (error, user) {
                    if (error) {
                        callback(error, null);
                    } else {
                        if (user) {
                            tags = user.tags;
                            tags = clearOldDiscount(tags);
                            tags = clearOldCampaignDiscount(tags);

                            if (parseInt(discountValue) > 0) {
                                tags.push('discount:' + discountValue);
                                tags.push('campaign_discount:' + campaign);
                            }

                            callback(null, null);
                        } else {
                            callback(null, null);
                        }
                    }
                })
            },
            updateUserTag: function (callback) {
                User.findOneAndUpdate({ email: userEmail.trim() }, { $set: { tags: tags } }, callback);
            }
        }, next);
    }, cb);

}

let jsonpUpdateDiscount = function (req, res) {
    let email = req.query.email;
    let startDate = moment('2017-04-25 00:01', 'YYYY-MM-DD hh:mm');
    let endDate = moment('2017-04-29 16:59', 'YYYY-MM-DD hh:mm');
    let now = moment();

    if (!email) return res.jsonp({ status: false, message: "Email not found" });

    //check date
    if (now.isBefore(startDate)) {
        return res.jsonp({ status: false, message: "Event not start yet, please try again later" });
    }

    if (now.isAfter(endDate)) {
        return res.jsonp({
            status: false,
            message: "Event is end. Please subscribe our social media pages for more infomation."
        });
    }

    User.findByEmail(email, (err, user) => {
        if (err || !user || !user._id) return res.jsonp({ status: false, message: "Email not found" });

        let tags = user.tags;

        //check Thai user
        let isThai = false;
        if (tags.length > 0) {
            for (let i = 0; i < tags.length; i++) {
                if (tags[i] === 'country:vn') {
                    isThai = true;
                }
            }
        }

        if (!isThai) return res.jsonp({ status: false, message: "Event is not available in your country" });
        //////////////////

        tags = clearOldDiscount(tags);
        tags.push('discount:20');

        User.findByIdAndUpdate(user._id, { tags: tags }, err => {
            res.jsonp({ status: !err });
        });
    });
};

let appDeleteUser = function (req, res) {
    if (env === 'production') return res.json({ s: false });
    if (!req.session.adminSystem) return res.json({ s: false });

    let userId = req.body.userId;
    if (!userId) return res.json({ s: false });

    User.findByIdAndRemove(userId, function (err) {
        if (err) res.json({ s: false });
        else res.json({ s: true });
    });
};

let appInactiveUserCount = function (req, res) {
    let minimumDay = req.body.day || inactiveMinimumDay;

    let minimumDate = moment().subtract(minimumDay, 'day').startOf('day');

    let query = { lastSync: { $lt: minimumDate } };

    User.count(query, (err, count) => {
        res.send({ s: !err, d: count });
    });
};

let appInactiveUserGet = function (req, res) {
    let minimumDay = req.body.day || inactiveMinimumDay;
    let skip = req.body.skip;
    let limit = req.body.limit;
    let sort = req.body.sort || 'desc';

    if (!limit) {
        return res.send({ s: false });
    }

    if (sort !== 'asc' || sort !== 'desc') {
        return res.send({ s: false });
    }

    let minimumDate = moment().subtract(minimumDay, 'day').startOf('day');

    let query = { lastSync: { $lt: minimumDate } };

    User.find(query)
        .sort({
            lastSync: (sort === 'asc') ? 1 : -1
        })
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec((err, count) => {
            res.send({ s: !err, d: count });
        });
};

let appPurchaseHistory = function (req, res) {
    let user = req.body.user;
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;

    if (!user) {
        return res.json({ s: false });
    }

    ItemLog.findByUser(user, skip, limit, (err, result) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: true, d: result });
    });
};

let testPremium = function (req, res) {
    let startTime = moment().startOf('day');
    let today = moment().startOf('day').format('DD-MM-YYYY');
    let page = req.query.page || 1;
    let limit = 20;
    let skip = limit * (page - 1);
    let sort = req.query.sort || 'asc';

    let query_mongo = { premium_at: { $gte: startTime } };
    let query_elastic = utils.createUserQuery(`purchase:premium && premiumstartdate:${today}`);

    let result = {};

    async.parallel([
        countUserByMongo,
        getUserByElastic,
        getUserByMongo
    ], (err) => {
        if (err) {
            return res.send(err);
        }

        res.json(result);
    });

    function getUserByMongo(cb) {
        User.find(query_mongo)
            .select('email createdDate premium_at purchased lastLogin')
            .sort({ premium_at: (sort === 'desc') ? 1 : -1 })
            .skip(skip)
            .limit(limit)
            .exec((err, data) => {
                if (err) {
                    return cb(err);
                }

                if (!result.data) {
                    result.data = {};
                }

                result.data.mongo = data;

                cb();
            });
    }

    function countUserByMongo(cb) {
        User.count(query_mongo, (err, count) => {
            if (err) {
                return cb(err);
            }

            if (!result.count) {
                result.count = {};
            }

            result.count.mongo = count;

            cb();
        });
    }

    function getUserByElastic(cb) {
        let options = {
            sort: {
                premium_at: { order: sort, ignore_unmapped: true }
            },
            size: limit,
            from: skip
        };

        User.search(query_elastic, options, (err, data) => {
            if (err) {
                return cb(err);
            }

            if (!result.count) {
                result.count = {};
            }

            if (!result.data) {
                result.data = {};
            }

            result.count.elastic = data.hits.total;
            result.data.elastic = data.hits.hits;

            cb();
        });
    }
};

let appActivePremium = function (req, res) {
    let adminId = req.session.adminId;
    let adminName = req.session.adminName;
    let reason = req.body.reason;
    let user_id = req.body.user_id;
    let user_email = req.body.user_email;
    let product_id = req.body.product_id;
    let listEmail = req.body.listEmail;

    if ((!user_id && (!listEmail || listEmail.length === 0)) || !user_email || !reason) {
        return res.json({ s: false });
    }

    if (user_id) {
        activePremium(user_id, reason, adminId, (err) => {
            if (err) {
                return res.json({ s: false });
            }

            res.json({ s: true });
            hook.pushAcceptSync(user_id);
            saveLog(user_id, product_id, ITEM_TYPE.PREMIUM, () => {
            });
            saveAdminLog(user_email, adminName, product_id);
        });
    } else {
        res.json({ s: true });

        async.eachSeries(listEmail, (email, done) => {
            User.findByEmail(email, (err, user) => {
                if (err) return done(err);
                if (!user || !user._id) return done();

                activePremium(user._id, reason, adminId, (err) => {
                    if (err) return done(err);

                    hook.pushAcceptSync(user._id);
                    saveLog(user._id, product_id, ITEM_TYPE.PREMIUM, () => {
                    });
                    saveAdminLog(email, adminName, product_id);
                });
            });

        }, err => {
            if (err) console.log(err);
        });
    }
};

let appSendCredit = function (req, res) {
    let reason = req.body.reason;
    let product_id = req.body.product_id;
    let user_id = req.body.user_id;
    let listEmail = req.body.listEmail;

    if (!reason || !product_id || (!user_id && (!listEmail || listEmail.length === 0))) {
        return res.json({ s: false });
    }

    findItem(product_id)
        .then(increaseReceipt)
        .then(increaseMultipleUserReceipt)
        .catch(function (err) {
            res.json({ s: false });
        });

    function increaseReceipt(item) {
        return new Promise((resolve, reject) => {
            if (!item) {
                return reject('Item not found');
            }

            if (user_id) {
                UseCreditModel.increaseUseCredit(user_id, item.metadata.credit_type, item.metadata.credit, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        res.json({ s: true });
                        resolve();
                    }
                });
            } else {
                res.json({ s: true });
                resolve(item);
            }
        });
    }

    function increaseMultipleUserReceipt(item) {
        return new Promise((resolve, reject) => {
            async.eachSeries(listEmail, (email, done) => {
                async.setImmediate(() => {
                    User.findByEmail(email, (err, user) => {
                        if (err) return done(err);
                        if (!user || !user._id) return done();

                        UseCreditModel.increaseUseCredit(user._id, item.metadata.credit_type, item.metadata.credit, (err) => {
                            done(err);
                        });
                    });
                });
            }, err => {
                if (err) {
                    // console.log(err);
                    resolve();
                }
            });
        });
    }

    function findItem(product_id) {
        return new Promise((resolve, reject) => {
            ItemModel.findByProductId(product_id, (err, data) => {
                if (err) {
                    return reject(err);
                }

                resolve(data);
            });
        });
    }
};

let appViewCredit = function (req, res) {
    let user_id = req.body.user_id;

    if (!user_id) {
        return res.json({ s: false });
    }

    UseCreditModel.getUseCreditUser(user_id, (err, data) => {
        res.json({ s: !err, d: data });
    });
};

let appSendSubscription = function (req, res) {
    let type = req.body.type;
    let unit = req.body.unit;
    let value = req.body.value;
    let productId = req.body.productId;
    let userId = req.body.userId;
    let listEmail = req.body.listEmail;

    if (!type || !unit || !value || (!userId && (!listEmail || listEmail.length === 0)) || !productId) {
        return res.json({ s: false });
    }

    if (['premium', 'linked_wallet'].indexOf(type) === -1) {
        return res.json({ s: false });
    }

    if (userId) {
        let info = {
            userId: userId,
            productId: productId,
            unit: unit,
            value: value,
            type: type
        };

        increaseExpireDate(info, err => {
            return res.json({ s: !err });
        });
    } else {
        //listEmail
        res.json({ s: true });

        async.eachSeries(listEmail, (email, done) => {
            async.setImmediate(() => {
                if (!email) return done();

                User.fineOne({ email: email }, (err, user) => {
                    if (err) return done(err);
                    if (!user || !user._id) return done();

                    let info = {
                        userId: user._id,
                        productId: productId,
                        unit: unit,
                        value: value,
                        type: type
                    };

                    increaseExpireDate(info, err => {
                        done(err);
                    });
                });
            });
        }, err => {
            if (err) {
                return console.log(err);
            }
        });
    }
};

let appSendSemiPremiumGift = function (req, res) {
    let userId = req.body.userId;
    let productId = req.body.productId;
    let platform = req.body.platform;

    if (!userId || !productId || !platform) {
        return res.json({
            status: false,
            message: 'missing params'
        });
    }

    let updateData = {
        'semi_premium_purchased': true,
        'platform': platform,
        'expireDate': moment().add('100', 'years').toDate(),
        'firstPurchase': moment().toDate(),
        'lastPurchase': moment().toDate(),
        'product': productId,
        'market': MARKET[platform]
    };

    User.updateSemiPremium(userId, updateData, function (error, result) {
        if (error) {
            res.json({
                status: false,
                message: error
            });
        } else {
            res.json({
                status: true,
                data: result
            });
        }
    });

}

let appTogglePublicWallet = function (req, res) {
    let id = req.body.id;

    if (!id) return res.json({ s: false });

    Account.findById(id, (err, wallet) => {
        if (err) return res.json({ s: false });

        Account.findByIdAndUpdate(id, { $set: { isPublic: !wallet.isPublic } }, err => {
            res.json({ s: !err });
        });
    });
};

let appTogglePublicCampaign = function (req, res) {
    let id = req.body.id;

    if (!id) return res.json({ s: false });

    CampaignModel.findById(id, (err, campaign) => {
        if (err) return res.json({ s: false });

        CampaignModel.findByIdAndUpdate(id, { $set: { isPublic: !campaign.isPublic } }, err => {
            res.json({ s: !err });
        });
    });
};

let appChangeActivateStatus = function (req, res) {
    let id = req.body.id;

    if (!id) return res.json({ status: false });

    User.findById(id, 'isDeactivated', (err, user) => {
        if (err || !user) return res.json({ status: false });

        User.findByIdAndUpdate(id, { isDeactivated: !user.isDeactivated }, err => {
            res.json({ status: !err });
        });
    });
};

let appEmailVerify = function (req, res) {
    let id = req.query.code;

    if (!id) {
        return res.jsonp({ status: false });
    }

    User.findById(id, (err, user) => {
        if (err) {
            return res.jsonp({ status: false });
        }

        if (!user) {
            return res.jsonp({ status: false });
        }

        User.findByIdAndUpdate(id, { verifyEmail: true }, err => {
            res.jsonp({ status: !err });
        });
    });
};

let premiumCountTest = function (req, res) {
    let startDate = moment().subtract(2, 'days').startOf('days').toDate();
    let endDate = moment().subtract(2, 'days').endOf('days').toDate();

    User.count({
        premium_at: {
            $gte: startDate,
            $lt: endDate
        }
    }, (err, users) => {
        res.json({
            s: !err,
            d: {
                startDate: startDate,
                endDate: endDate,
                users: users
            }
        });
    });
}

module.exports = function (app, config) {
    app.get('/users', staticsMain);
    app.get('/gift', staticsMain);
    app.post('/users/find-and-export-to-csv', appFindAndExportCsv);
    app.get('/users/*', staticsMain);
    app.post('/user/edit', appUserUpdate);
    app.post('/user/set-customer-support', appSetSkipPassword);
    app.post('/user/get-customer-support', appGetSkipPassword);
    app.post('/user/count', appUserCount);
    app.post('/user/list', appUserList);
    app.post('/user/list-subscription', appUserSubscription);
    app.post('/user/list-no-subscription', appUserNoSubscription);
    app.post('/user/search', appUserSearch);
    app.post('/user/find-by-tag', appFindByTag2);
    app.post('/user/device', appUserDevice);
    app.post('/user/rmdevice', appRemoveDevice);
    app.post('/user/send-icon-gift', sendIconGift);
    app.get('/user/export', appExport);
    app.post('/user/changelimitdevice', appChangeLimitDevice);
    app.post('/user/issues', appGetIssueList);
    app.get('/send-premium-code', staticsMain);
    app.post('/user/send-premium-code', appSendPremiumCode);
    app.post('/user/user-export', userExport);
    app.post('/user/add-expire', addExpire);
    app.post('/user/restore-wallet', restoreWallet);
    app.post('/user/premium-count', premiumCount);
    app.get('/jsonp/premium-count-test', premiumCountTest);
    app.post('/user/update-tag', appUpdateTag);
    app.post('/user/update-discount', appUpdateDiscount);
    app.post('/user/update-discount-list-email', appUpdateDiscountListEmail);
    app.get('/jsonp/update-discount', jsonpUpdateDiscount);
    app.post('/user/delete-user', appDeleteUser);
    app.post('/user/inactive-user-count', appInactiveUserCount);
    app.post('/user/inactive-user-get', appInactiveUserGet);
    app.post('/user/purchase-history', appPurchaseHistory);
    app.post('/user/active-premium', appActivePremium);
    app.post('/user/send-credit', appSendCredit);
    app.post('/user/view-credit', appViewCredit);
    app.post('/user/send-subscription', appSendSubscription);
    app.post('/user/send-semi-gift', appSendSemiPremiumGift);
    app.post('/user/toggle-public-wallet', appTogglePublicWallet);
    app.post('/user/toggle-public-campaign', appTogglePublicCampaign);
    app.post('/user/change-activate-status', appChangeActivateStatus);
    app.get('/jsonp/email-verify', appEmailVerify);

    app.get('/user/test-get-premium-user', testPremium);
};
