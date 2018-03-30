




'use strict';

let env = process.env.NODE_ENV;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const config = require('../../config/config')[env];
const Auto_Email_Push = mongoose.model('EmailAutomationPush');
const Automation_Log = mongoose.model('Automation_Log');
const Campaign_Marketing = mongoose.model('CampaignMarketing');
const GroupModel = mongoose.model('Group');
const GroupCampaignAutoModel = mongoose.model('AutoCampaignGroup');
const PushSessionNotificationModel = mongoose.model('PushNotificationSession');
const DeviceNotificationModel = mongoose.model('DeviceNotification');

const moment = require('moment');
const async = require('async');

const mailwizzSdk = require('node-mailwizz-sdk');

const AUTO_TYPE = {
    'Email': 1,
    'Push': 2
};

const MODE = {
    'daily': 'daily',
    'monthly': 'monthly'
}
/* MailWizzSDK */

const configMailWizz = {
    dev: {
        publicKey: '8d30e77bc26f04c920628c01c93877e110bdee70',
        secret: '6b3b9cfd26fc892c45b58076bfd8467a5afc492b',
        baseUrl: 'https://wizz.finsify.com/api'
    },
    production: {
        publicKey: '55745ccb210c8e997c5ff79503a45a06d3ba02ba',
        secret: 'b1e062892ba068895ea15b703178d129250b397e',
        baseUrl: 'https://wizz.finsify.com/api'
    }
};

let wizzConfig = (env === 'production') ? configMailWizz.production : configMailWizz.dev;

/****FUNCTIONS*****/
let updateEmailPushCollection = function (condition, updateData, callback) {
    Auto_Email_Push.findOneAndUpdate(condition, { $set: updateData }, { new: true }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    });
};
let updateGroup_EmailPushCollection = function (condition, updateData, callback) {
    GroupModel.findOneAndUpdate(condition, { $set: updateData }, { new: true }, function (err, result) {
        if (err) {
            callback(err, null)
        } else {
            callback(null, result)
        }
    })
};
let updateCampaign = function (condition, updateData, callback) {
    Campaign_Marketing.findOneAndUpdate(condition, { $set: updateData }, { new: true }, function (err, result) {
        if (err) {
            callback(err, null)
        } else {
            callback(null, result)
        }
    })

}

let updateGroup = function (condition, updateData, callback) {
    GroupModel.findOneAndUpdate(condition, { $set: updateData }, { new: true }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}
let findGroupFromGroupId = function (condition, callback) {
    GroupCampaignAutoModel.findOne({ autoId: condition }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}

let findAutoFromGroupId = function (groupId, callback) {
    GroupCampaignAutoModel.find({ groupId: groupId }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}

let findByCampaignId = function (campaignId, callback) {
    GroupCampaignAutoModel.find({ campaignId: campaignId }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}


let findtoDuplicate = function (condition, callback) {
    GroupModel.findOne({ _id: condition }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}
let findtoDuplicateCampaign = function (condition, callback) {
    Campaign_Marketing.findOne({ _id: condition }, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    })
}
let findChildGroupFromGroupId = function (condition, callback) {
    Auto_Email_Push.findOne({ _id: condition }, function (err, result) {
        if (err) {
            callback(err, null);
        } else callback(null, result);
    })
}
let deleteCampaignCollection = function (condition, callback) {
    Campaign_Marketing.remove(condition, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    })
}
let delelteGroupCollection = function (condition, callback) {
    GroupModel.remove(condition, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    })
}
let deleteEmailPushCollection = function (condition, callback) {
    Auto_Email_Push.remove(condition, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    });
};

let createAutomationCollection = function (data, callback) {
    let dataObject = new Auto_Email_Push(data);
    dataObject.save(callback);
}

let createGroupCampaginAutoCollection = function (data, callback) {
    GroupCampaignAutoModel.addNew(data, callback);
}

function addDay(day, num) {
    day = moment(day).add(num.toString(), 'days');
    return day;
}

function addMonth(month, num) {
    month = moment(month).add(num.toString(), 'months');
    return month;
}

function parseHourRunToUpdateNextRunFirst(hourRun) {
    let nextRun = null;
    let time = hourRun.split(":");
    let hour = parseInt(time[0]);
    if (hour > 7) {
        hour -= 7;
    } else {
        // <= 7
        switch (hour) {
            case 7:
                hour = 0;
                break;
            case 6:
                hour = 23;
                break;
            case 5:
                hour = 22;
                break;
            case 4:
                hour = 21;
                break;
            case 3:
                hour = 20;
                break;
            case 2:
                hour = 19;
                break;
            case 1:
                hour = 18;
                break;
            case 0:
                hour = 17;
                break;
        }
    }

    let mintute = parseInt(time[1]);

    let year = moment().year();
    let month = moment().month();
    let day = moment().date();

    let currentHour = moment().hour();

    if (currentHour > hour) {

        let newTime;
        newTime = addDay(moment(), 1);
        month = newTime.month();
        year = newTime.year();
        day = newTime.date();
    }

    nextRun = moment({ y: year, M: month, d: day, h: hour, m: mintute, s: 0, ms: 123 }).toDate().toISOString();
    return nextRun;
}
/****EXPORTS****/

let appGetTemplates = function (req, res) {
    let page = req.body.page;
    let limit = 10000;

    if (!page || !limit) {
        return res.json({
            status: false,
            message: 'input is not empty'
        });
    }

    if (typeof page !== 'number' || typeof limit !== 'number') {
        return res.json({
            status: false,
            message: 'input invaild'
        });
    }

    let Template = new mailwizzSdk.Templates(wizzConfig);

    Template.getTemplates(page, limit)
        .then(function (result) {
            result = JSON.parse(result);

            res.json({
                status: true,
                data: result.data
            })

        })
        .catch(function (err) {
            //handle error here
            res.json({
                status: false,
                message: err
            })
        });
};

let appCreateEmailPushAutomation = function (req, res) {
    let name = req.body.name;
    let type = req.body.type;
    let hourRun = req.body.hourRun;
    let mode = req.body.mode;
    let search_query = req.body.search_query;
    let group = req.body.group;
    let campaign = req.body.campaign;
    let tracking = req.body.tracking;

    let template_info;
    let subject;
    let fromName;
    let fromEmail;
    let replyTo;
    let pushObject;

    // email
    if (type == AUTO_TYPE.Email) {
        template_info = req.body.template_info;
        subject = req.body.subject;
        fromName = req.body.fromName;
        fromEmail = req.body.fromEmail;
        replyTo = req.body.replyTo;

        if (!name || !search_query || !template_info || !mode || !subject || !fromName || !fromEmail || !replyTo || !type || !hourRun) {
            return res.json({
                status: false,
                message: 'input is empty'
            });
        }

        if (!template_info.name || !template_info.id) {
            return res.json({
                status: false,
                message: 'template is empty'
            });
        }
    }

    // push
    if (type == AUTO_TYPE.Push) {
        if (typeof req.body.pushObject == 'object') {
            pushObject = req.body.pushObject;
        } else {
            pushObject = JSON.parse(req.body.pushObject);
        }


        if (Object.keys(pushObject).length === 0) {
            return res.json({
                status: false,
                message: 'push param is empty'
            });
        }
    }

    let hourRunTime = parseHourRunToUpdateNextRunFirst(hourRun.toString());

    if (typeof hourRunTime == 'string') {
        hourRunTime = moment(hourRunTime);
    }


    let metadata = {
        hourRun: hourRun
    };

    if (type == AUTO_TYPE.Email) {
        metadata.subject = subject;
        metadata.fromEmail = fromEmail;
        metadata.fromName = fromName;
        metadata.replyTo = replyTo;
        metadata.template = {
            id: template_info.id,
            name: template_info.name,
            thumbUrl: template_info.thumb || null
        }
    }

    if (type == AUTO_TYPE.Push) {
        metadata = pushObject;
        metadata.hourRun = hourRun;
    }


    let auto_id;

    async.series({
        createAutomation: function (callback) {
            let object = new Auto_Email_Push({
                name: name,
                searchQuery: search_query,
                metadata: metadata,
                isEnabled: true,
                mode: mode,
                type: type,
                nextRun: hourRunTime,
                tracking: tracking
            });

            object.save(function (error, result) {
                if (error) {
                    callback(error, null);
                } else {
                    auto_id = result._id;
                    callback(null, result);
                }
            });
        },
        createGroupCampaginAuto: function (callback) {
            let data = {
                autoId: auto_id,
                campaignId: campaign,
                groupId: group
            };

            GroupCampaignAutoModel.addNew(data, callback);
        }
    }, function (error, results) {
        res.json({ status: !error, data: results.createAutomation });
    });

};

let appEmailPushAutomationGetAll = function (req, res) {

    let limit = req.body.limit || 10;
    let skip = req.body.skip || 0;
    let page = req.body.page || 1;

    let customData = [];
    let populateDataInclude = [];
    let defaulValue = [];

    function count(done) {
        Auto_Email_Push.count()
            .exec(done);
    }

    function find(total, done) {
        Auto_Email_Push.find()
            .skip(skip)
            .limit(limit)
            .populate('searchQuery')
            .sort({ createdAt: -1 })
            .exec(function (error, results) {
                if (error) {
                    done(error);
                } else {
                    defaulValue = results;
                    done(null, results);
                }
            });
    }

    function report(automations, done) {
        async.eachSeries(automations, function (auto, cb) {
            async.setImmediate(() => {
                let searchQueryId = auto.searchQuery._id;
                let messageId = auto.metadata._id;
                let automationId = auto._id;
                //console.log('gia tri messageId:',messageId)
                appReport(searchQueryId, messageId, function (error, reports) {
                    if (error) {
                        cb();
                    } else {

                        if (!reports) {
                            reports = {
                                total: 0,
                                open: 0,
                                sent: 0,
                                error: 0
                            }
                        }
                        let copy = Object.assign({}, auto)._doc;
                        copy.report = reports;
                        customData.push(copy);
                        //console.log('gia tri cutomData:', customData)
                        cb();
                    }
                });
            })

        }, function () {
            done(null, customData);
        });
    }

    function populateData(automationData, done) {

        async.eachSeries(automationData, function (automation, cb) {
            async.setImmediate(() => {
                GroupCampaignAutoModel.findOne({
                    autoId: automation._id
                }, function (error, data) {
                    if (error) {
                        cb();
                    } else {
                        if (data) {
                            let campaignId = data.campaignId;
                            let groupId = data.groupId;
                            async.parallel({
                                populateCampaign: function (next) {
                                    Campaign_Marketing.findOne({
                                        _id: campaignId
                                    }, next);
                                },
                                populateGroup: function (next) {
                                    GroupModel.findOne({
                                        _id: groupId
                                    }, next);
                                }
                            }, function (error, populateResult) {
                                if (error) {
                                    cb();
                                } else {
                                    automation.campaign = populateResult.populateCampaign;
                                    automation.group = populateResult.populateGroup;

                                    populateDataInclude.push(automation);

                                    cb();
                                }
                            })

                        } else {
                            cb();
                        }
                    }
                })
            })
        }, function () {
            //console.log('gia tri cuoi cung:',populateDataInclude)
            done(null, populateDataInclude);
        })
    }

    function callback(error, result) {
        if (error) {
            return res.json({
                status: false,
                message: error
            });
        } else {
            // if (populateDataInclude.length > 0) {
            //     return res.json({
            //         status: true,
            //         data: populateDataInclude
            //     });
            // } else if (customData.length > 0) {
            //     return res.json({
            //         status: true,
            //         data: customData
            //     });
            // } else {
            //     return res.json({
            //         status: true,
            //         data: defaulValue
            //     });
            // }

            return res.json({
                status: true,
                data: defaulValue
            });
        }
    }

    async.waterfall([
        count,
        find,
        report,
        populateData
    ], callback);

};

let appUpdateEmailPushAutomation = function (req, res) {
    let data = req.body;

    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is required'
        });
    }

    let options = {};
    let metadata = {};

    if (data.name) {
        options.name = data.name;
    }

    if (data.type) {
        options.type = data.type;
    }

    if (data.hourRun) {
        metadata.hourRun = data.hourRun;
        options.nextRun = parseHourRunToUpdateNextRunFirst(data.hourRun);
    }

    if (data.mode) {
        options.mode = data.mode;
    }

    if (data.lastRun) {
        options.lastRun = data.lastRun;
    }
    if (data.searchQuery) {
        options.searchQuery = data.searchQuery;
    }

    if (data.type == AUTO_TYPE.Email) {
        if (data.template) {
            metadata.template = data.template;
        }

        if (data.subject) {
            metadata.subject = data.subject;
        }

        if (data.fromEmail) {
            metadata.fromEmail = data.fromEmail;
        }

        if (data.fromName) {
            metadata.fromName = data.fromName;
        }

        if (data.replyTo) {
            metadata.replyTo = data.replyTo;
        }
    }

    if (data.type === AUTO_TYPE.Push) {
        if (typeof data.pushObject === 'string') {
            metadata = JSON.parse(data.pushObject);
            metadata.hourRun = data.hourRun;
        } else {
            // object
            metadata = data.pushObject;
            metadata.hourRun = data.hourRun;
        }
    }


    let condition = {};
    condition._id = data._id;
    let updateData = options;

    if (metadata) {
        updateData.metadata = metadata;
    }

    updateEmailPushCollection(condition, updateData, function (err, result) {
        if (err) {
            res.json({
                status: false,
                message: err
            });
        } else {
            res.json({
                status: true,
                data: result
            });
        }
    });

};
/*------------------------------------------------------*/
let appDeleteCampaign = function (req, res) {
    let data = req.body;

    if (!data._id) {
        return res.json({
            status: false,
            message: '_id id required!'
        })
    }

    let condition = {};
    condition._id = data._id;

    deleteCampaignCollection(condition, function (error, result) {
        if (error) {
            res.json({
                status: false,
                message: error
            })
        } else {
            res.json({
                status: true,
                message: 'delete successfully!'
            })
        }
    })

}
let appUpdateCampaign = function (req, res) {
    let data = req.body;
    if (!data) {
        return res.json({
            status: false,
            message: '_id is required!'
        })
    }
    let options = {};
    if (data.name) {
        options.name = data.name;
    }
    if (data.type) {
        options.type = data.type;
    }

    let condition = {};
    condition._id = data._id;
    let updateData = options;
    async.waterfall([
        function (callback) {
            findByCampaignId(data._id, callback);
        },
        function (items, callback) {
            async.eachSeries(items, (item, cb) => {
                async.setImmediate(() => {
                    let updateData1 = {
                        type: data.type
                    }

                    updateEmailPushCollection({ _id: item.autoId }, updateData1, cb);
                })
            }, callback);
        }
    ], function (error, results) {
        if (error) {
            return res.json({
                status: false
            });
        }

        updateCampaign(condition, updateData, function (err, result) {
            if (err) {
                res.json({
                    status: false,
                    message: err
                });
            } else {
                res.json({
                    status: true,
                    data: result
                })
            }
        })
    });
}
let appDuplicateCampaign = function (req, res) {
    let data = req.body;

    if (!data) {
        return res.json({
            status: false,
            message: 'missing params'
        })
    }

    let condition = {};
    let number_copies = 1;
    condition._id = data._id;
    if (data.copies) {
        number_copies = data.copies;
    }

    findtoDuplicateCampaign(condition, function (err, result) {
        if (!err) {
            for (let i = 0; i < number_copies; i++) {
                let duplicateValue = new Campaign_Marketing({ name: result.name, type: result.type, owner: result.owner, isDisable: result.isDisable })
                duplicateValue.save(function (error) {
                    if (error) {
                        return res.json({
                            status: false,
                            message: error
                        })
                    }
                })
            }

            return res.json({
                status: true
            });

        } else {
            res.json({
                status: false,
                message: err
            })
        }
    })



}
let appisEnabledCampaign = function (req, res) {
    let data = req.body;
    //console.log('gia tri body tu campaign',data)
    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is require'
        });
    }
    if (typeof data.isDisable !== 'boolean') {
        res.json({
            status: false,
            message: 'isDisable is boolean'
        })
    }
    let condition = {};
    condition._id = data._id;
    let updateData = {};
    updateData.isDisable = data.isDisable;
    async.parallel([
        function (callback) {
            updateCampaign(condition, updateData, callback);
        },
        function (callback) {
            async.waterfall([
                function (next) {
                    GroupCampaignAutoModel.find({
                        campaignId: data._id
                    }, next);
                },
                function (items, next) {
                    async.eachSeries(items, (item, cb) => {
                        async.setImmediate(() => {
                            async.parallel([
                                function (done) {
                                    updateEmailPushCollection({ _id: item.autoId }, { isEnabled: data.isDisable }, done);
                                },
                                function (done) {
                                    updateGroup({ _id: item.groupId }, { isDisable: data.isDisable }, done);
                                }
                            ], cb);
                        })
                    }, next);
                }
            ], callback);
        }
    ], function (err, result) {
        if (err) {
            res.json({
                status: false,
                message: err
            })
        } else {
            res.json({
                status: true,
                data: result[0]
            })
        }
    })
}

let appIsEnabledGroup = function (req, res) {
    let data = req.body;
    //console.log('gia tr body:', data)
    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is require'
        });
    }
    if (typeof data.isDisable !== 'boolean') {
        return res.json({
            status: false,
            message: 'isDisable is boolean'
        });
    }
    let condition = {};
    condition._id = data._id;
    let updateData = {};
    updateData.isDisable = data.isDisable;
    async.parallel([
        function (callback) {
            updateGroup_EmailPushCollection(condition, updateData, callback)
        },
        function (callback) {
            async.waterfall([
                function (done) {
                    findAutoFromGroupId(data._id, done);
                },
                function (items, done) {
                    async.eachSeries(items, (item, cb) => {
                        async.setImmediate(() => {
                            updateEmailPushCollection({ _id: item.autoId }, { isEnabled: data.isDisable }, cb);
                        });
                    }, done);
                }
            ], callback)
        }
    ], function (err, result) {
        if (err) {
            res.json({
                status: false,
                message: err
            })
        } else {
            res.json({
                status: true,
                data: result[0]
            })
        }
    })
}

let appDuplicateGroup = function (req, res) {
    let data = req.body;

    if (!data) {
        return res.json({
            status: false,
            message: 'missing params'
        })
    }

    let condition = {};
    let number_copies = data.copies || 1;
    condition._id = data._id;

    findtoDuplicate(condition, function (err, result) {
        if (!err) {
            for (let i = 0; i < number_copies; i++) {
                let duplicateValue = new GroupModel({ updateAt: new Date(), name: result.name, owner: result.owner, metadata: { countries: result.metadata.countries, devices: result.metadata.devices }, isDisable: result.isDisable });

                duplicateValue.save(function (err1) {
                    if (err1) {
                        return res.json({
                            status: false,
                            message: err
                        });
                    }
                })
            }

            return res.json({
                status: true
            });


        } else {
            res.json({
                status: false,
                message: err
            })
        }
    });
}

let appUpdateGroup = function (req, res) {
    let data = req.body;
    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is required'
        })
    }
    let options = {};
    let metadata = {};

    if (data.name) {
        options.name = data.name;
    }

    if (data.devices) {
        metadata.devices = data.devices;
    }

    if (data.countries) {
        metadata.countries = data.countries;
    }

    if (data.createdAt) {
        options.createdAt = data.createdAt;
    }

    if (data.updateAt) {
        options.updateAt = data.updateAt;
    }

    let condition = {};
    condition._id = data._id;
    let updateData = options;
    if (metadata) {
        updateData.metadata = metadata;
    }
    updateGroup(condition, updateData, function (err, result) {
        if (err) {
            res.json({
                status: false,
                message: err
            });
        } else {
            res.json({
                status: true,
                data: result
            })
        }
    });
};

let appDeleteGroup = function (req, res) {
    let data = req.body;
    //console.log('gia tri nhan duoc tai server:',data)
    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is required'
        });
    }
    let condition = {}
    condition._id = data._id;
    delelteGroupCollection(condition, function (error, result) {
        if (error) {
            res.json({
                status: false,
                message: error
            });
        } else {
            res.json({
                status: true,
                message: 'delete successfully'
            })
        }
    })

}
let appIsEnabled = function (req, res) {
    let data = req.body;
    //console.log('gia tri body:', data)

    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is required'
        });
    }

    if (typeof data.isEnabled !== 'boolean') {
        return res.json({
            status: false,
            message: 'isEnabled is boolean'
        });
    }

    let condition = {};
    condition._id = data._id;

    let updateData = {};
    updateData.isEnabled = data.isEnabled;

    updateEmailPushCollection(condition, updateData, function (error, result) {
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
            //Sau khi click vao icon check thi se gui tra lai data tu trong database trong collecttion emailautomationpushes
        }
    });
};

let appDeleteEmailPush = function (req, res) {
    let data = req.body;

    if (!data._id) {
        return res.json({
            status: false,
            message: '_id is required'
        });
    }
    let condition = {};
    condition._id = data._id;

    deleteEmailPushCollection(condition, function (error, result) {
        if (error) {
            res.json({
                status: false,
                message: error
            });
        } else {
            res.json({
                status: true,
                message: 'delete successfully'
            });
        }
    });
};

let appAutomationLogBrowse = function (req, res) {
    let limit = req.body.limit;
    let offset = req.body.offset;

    if (!limit || !offset) {
        limit = 40;
        offset = 0;
    };

    let query = {
        limit: limit,
        offset: offset
    };

    Automation_Log.getAll(query, function (error, result) {
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

let appClearAutomationLog = function (req, res) {
    let role = req.session.permission;

    if (role === 'Admin') {
        Automation_Log.clearData(function (error, result) {
            if (error) {
                res.json({
                    status: false,
                    message: error
                });
            } else {
                res.json({
                    status: true,
                    message: 'delete successfully'
                });
            }
        });
    } else {
        res.json({
            status: false,
            message: 'Permission denined'
        });
    }
}

const MAP_TYPE_SEARCH = {
    "Campaign": "1",
    "Group": "2",
    "Automation": "3"
}

let appSearchAutomaion = function (req, res) {
    let keyword = req.body.keyword;
    let type = req.body.type;
    switch (type) {
        case MAP_TYPE_SEARCH.Campaign: {
            searchByCampaignName({ name: keyword }, function (error, result) {
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
            break;
        }
        case MAP_TYPE_SEARCH.Group: {
            searchByGroupName({ name: keyword }, (error, result) => {
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
            break;
        }
        case MAP_TYPE_SEARCH.Automation: {
            searchByName({ name: keyword }, function (error, result) {
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
            break;
        }
        default: {
            searchByName({ name: keyword }, function (error, result) {
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
            break;
        }
    }


}


let appLiveSearch = function (req, res) {
    let keyword = req.body.keyword;
    let type = req.body.type;

    switch (type) {
        case MAP_TYPE_SEARCH.Campaign: {
            liveSearchByCampagin({ name: keyword }, function (error, result) {
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
            break;
        }
        case MAP_TYPE_SEARCH.Group: {
            liveSearchByGroup({ name: keyword }, (error, result) => {
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
            break;
        }
        case MAP_TYPE_SEARCH.Automation: {
            liveSearch({ name: keyword }, function (error, result) {
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
            break;
        }
        default: {
            liveSearch({ name: keyword }, function (error, result) {
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
            break;
        }
    }
}


let searchByName = function (data, callback) {
    let condition = {
        name: new RegExp('^' + data.name + '$', "i")
    };

    Auto_Email_Push.find(condition)
        .lean(true)
        .exec(callback);
};

let searchByCampaignName = function (data, callback) {
    let condition = {
        name: new RegExp('^' + data.name + '$', "i")
    };

    Campaign_Marketing.find(condition).lean(true).exec(callback);
}

let searchByGroupName = function (data, callback) {
    let condition = {
        name: new RegExp('^' + data.name + '$', "i")
    };

    GroupModel.find(condition).lean(true).exec(callback);
}

let liveSearch = function (data, callback) {
    let toSearch = data.name.split(" ").map(function (n) {
        return {
            name: new RegExp(n.trim(), 'i')
        };
    });

    Auto_Email_Push.find({ $and: toSearch }).limit(50).exec(callback);
};

let liveSearchByCampagin = function (data, callback) {
    let toSearch = data.name.split(" ").map(function (n) {
        return {
            name: new RegExp(n.trim(), 'i')
        };
    });

    Campaign_Marketing.find({ $and: toSearch }).limit(50).exec(callback);
}

let liveSearchByGroup = function (data, callback) {
    let toSearch = data.name.split(" ").map(function (n) {
        return {
            name: new RegExp(n.trim(), 'i')
        };
    });

    GroupModel.find({ $and: toSearch }).limit(50).exec(callback);
}


let appCreateCampaign = function (req, res) {
    let campaign_name = req.body.name;
    let auto_type = req.body.type;
    let adminId = req.session.adminId;

    if (!campaign_name || !auto_type) {
        return res.json({
            status: false,
            message: 'param invaild or missing'
        });
    }

    Campaign_Marketing.addNew({
        name: campaign_name,
        type: auto_type,
        owner: adminId
    }, function (error, results) {
        if (error) {
            return res.json({
                status: false,
                message: error
            });
        }

        return res.json({
            status: true,
            data: results
        });
    })
}

let appBrowseCampaign = function (req, res) {
    let limit = req.body.limit;
    let skip = req.body.skip;

    if (!limit || !skip) {
        limit = 10000;
        skip = 0;
    }

    Campaign_Marketing.getAll(skip, limit, function (error, campaigns) {
        if (error) {
            return res.json({
                status: false,
                message: error
            });
        }

        return res.json({
            status: true,
            data: campaigns
        });
    })
}

let appGroupCreate = function (req, res) {
    let name = req.body.name;
    let countries = req.body.countries;
    let devices = req.body.devices;
    let adminId = req.session.adminId;


    if (!name || !countries || !devices) {
        return res.json({
            status: false,
            message: 'param inavaild or missing'
        });
    }

    let data = {
        name: name,
        owner: adminId,
        metadata: {
            countries: countries,
            devices: devices
        }
    }

    GroupModel.addNew(data, function (error, group) {
        if (error) {
            return res.json({
                status: fase,
                message: error
            })
        }

        return res.json({
            status: true,
            data: group
        });
    })
}

let appBrowseGroup = function (req, res) {
    let limit = req.body.limit;
    let skip = req.body.skip;

    if (!limit || !skip) {
        limit = 10000;
        skip = 0;
    }

    GroupModel.getAll(skip, limit, function (error, groups) {
        if (error) {
            return res.json({
                status: false,
                message: error
            });
        }
        return res.json({
            status: true,
            data: groups
        });
    })
}

let appReport = function (searchQueryId, messageId, callback) {

    if (!searchQueryId || !messageId) {
        return callback();
    }
    let pushId;
    async.series({
        findPushSessionNotification: function (cb) {
            PushSessionNotificationModel.findOne({
                searchQuery: searchQueryId,
                notification: messageId
            }, function (error, pushSession) {
                if (error) {
                    cb(error, null);
                } else {
                    if (pushSession) {
                        pushId = pushSession._id;
                    }
                    cb(null, null);
                }
            })
        },
        findDeviceNotification: function (cb) {
            if (pushId) {
                async.parallel({
                    total: function (done) {
                        DeviceNotificationModel.countTotalBySession(pushId, done);
                    },
                    open: function (done) {
                        DeviceNotificationModel.countOpenedDeviceBySession(pushId, done);
                    },
                    sent: function (done) {
                        DeviceNotificationModel.countSentDeviceBySession(pushId, done);
                    },
                    error: function (done) {
                        DeviceNotificationModel.countErrorDeviceBySession(pushId, done);
                    }
                }, function (error, result) {
                    cb(null, result);
                });
            } else {
                cb(null, null);
            }
        }
    }, function (error, results) {
        callback(null, results.findDeviceNotification);
    })
}

let appFilterItem = function (req, res) {
    let campaignId = req.body.campaign;
    let groupId = req.body.groupId;

    let query = {};

    if (campaignId && groupId) {
        query["$and"] = [
            {
                campaignId: campaignId
            },
            {
                groupId: groupId
            }
        ]
    } else if (campaignId && !groupId) {
        query.campaignId = campaignId;
    } else if (!campaignId && !groupId) {
        query.groupId = groupId;
    } else {
        // ! campaign && ! group
    }


    function listCampaignGroupAuto(callback) {
        GroupCampaignAutoModel.find(query)
            .lean(true)
            .exec(callback);
    }

    function listAutomation(listIdAuto, callback) {
        let listId = [];

        listIdAuto.forEach((item) => {
            listId.push(item.autoId);
        });

        Auto_Email_Push.find({
            _id: { "$in": listId }
        }, callback);
    }

    async.waterfall([
        listCampaignGroupAuto,
        listAutomation
    ], function (error, results) {
        if (error) {
            return res.json({
                status: false,
                message: error
            })
        }

        return res.json({
            status: true,
            data: results
        });
    });
}

let appDuplicateAuto = function (req, res) {
    let copies = req.body.number;
    let campaignId = req.body.campaign;
    let groupId = req.body.group;
    let auto = req.body.auto;

    if (!auto || !groupId || !campaignId) {
        return res.json({
            status: false,
            message: 'missing param'
        })
    }

    auto = JSON.parse(auto);

    let dataArray = [];

    for (let i = 0; i < copies; i++) {
        let dataInsert = {
            name: auto.name,
            searchQuery: auto.searchQuery,
            metadata: auto.metadata,
            mode: auto.mode,
            lastRun: auto.lastRun,
            nextRun: auto.nextRun,
            isEnabled: auto.isEnabled,
            tracking: auto.tracking || 'null',
            type: auto.type
        };

        dataArray.push(dataInsert)
    }
    let autoId;

    async.eachSeries(dataArray, function (item, next) {
        async.setImmediate(() => {
            async.series([
                function (cb) {
                    createAutomationCollection(item, function (err, result) {
                        if (err) {
                            cb(err);
                        } else {
                            autoId = result._id;
                            cb();
                        }
                    });
                },
                function (cb) {
                    if (!autoId) {
                        return cb();
                    }

                    let dataObject = {
                        autoId: autoId,
                        campaignId: campaignId,
                        groupId: groupId
                    }

                    createGroupCampaginAutoCollection(dataObject, function (error, result) {
                        if (error) {
                            cb();
                        } else {
                            cb();
                        }
                    });

                }
            ], next);
        })

    }, function (err, results) {
        if (err) {
            return res.json({
                status: false,
                message: err
            })
        }

        return res.json({
            status: true
        });
    })
}

module.exports = function (app, config) {
    app.get('/email_push_automation', staticsMain);
    app.get('/email_push_automation/*', staticsMain);

    app.post('/api/template/browse', appGetTemplates);
    app.post('/api/email_push_automation/create', appCreateEmailPushAutomation);
    app.post('/api/email_push_automation/browse', appEmailPushAutomationGetAll);
    app.post('/api/email_push_automation/update', appUpdateEmailPushAutomation);
    app.post('/api/email_push_automation/enable', appIsEnabled);
    app.post('/api/email_push_automation/delete', appDeleteEmailPush);
    app.post('/api/automation/search', appSearchAutomaion);
    app.post('/api/automation/liveSearch', appLiveSearch);
    app.post('/api/automation/filter', appFilterItem);
    app.post('/api/automation/duplicate', appDuplicateAuto);
    /*--------------------*/

    app.get('/automation_log/', staticsMain);
    app.get('/automation_log/*', staticsMain);
    app.post('/api/automation_log/browse', appAutomationLogBrowse);
    app.post('/api/automation_log/clear', appClearAutomationLog);

    app.get('/campaign', staticsMain);
    app.get('/campaign/*', staticsMain);
    app.post('/api/campaign-marketing/create', appCreateCampaign);
    app.post('/api/campaign-marketing/browse', appBrowseCampaign);
    app.post('/api/campaign-marketing/enablecampaign', appisEnabledCampaign);
    app.post('/api/group/duplicateCampaign', appDuplicateCampaign)
    app.post('/api/campaign/update', appUpdateCampaign)
    app.post('/api/campaign/delete', appDeleteCampaign)

    app.get('/group', staticsMain);
    app.get('/group/*', staticsMain);
    app.post('/api/group/create', appGroupCreate);
    app.post('/api/group/browse', appBrowseGroup);
    app.post('/api/group/enablegroup', appIsEnabledGroup);
    app.post('/api/group/delete', appDeleteGroup)
    app.post('/api/group/update', appUpdateGroup)
    app.post('/api/group/duplicategroup', appDuplicateGroup)
};
