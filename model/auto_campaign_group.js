'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AutoCampaignGroupMarketingSchema = new Schema({
    autoId: { type: String, ref: 'EmailAutomationPush', require: true },
    campaignId: { type: String, ref: 'CampaignMarketing', require: true },
    groupId: { type: String, ref: 'Group', require: true },
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date }
});

let addNew = function (data, callback) {
    let that = this;
    that.findOne({
        autoId: data.autoId,
        campaignId: data.campaignId,
        groupId: data.groupId
    }, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            if (!result) {
                let newData = new that(data);
                newData.save(callback);
            } else {
                callback('exists', null);
            }
        }
    })
}

let getAll = function (skip, limit, callback) {
    this.find()
        .skip(skip)
        .limit(limit)
        .sort({ "updateAt": -1 })
        .lean(true)
        .exec(callback);
}

AutoCampaignGroupMarketingSchema.statics.addNew = addNew;
AutoCampaignGroupMarketingSchema.statics.getAll = getAll;

AutoCampaignGroupMarketingSchema.pre('save', function (next) {
    this.updateAt = new Date();
    next();
});


mongoose.model('AutoCampaignGroup', AutoCampaignGroupMarketingSchema);
