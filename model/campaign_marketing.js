'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Metadata structure
 * automation_type : type of notification automation (Email/ Push)
 */

const AUTO_TYPE = {
    'Email': 1,
    'Push': 2
};

var CampaignMarketingSchema = new Schema({
    name: { type: String, trim: true, require: true },
    type: { type: Number, enum: [AUTO_TYPE.Email, AUTO_TYPE.Push] },
    owner: { type: Schema.Types.ObjectId, ref: 'Administrator' },
    isDisable: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date }
});

let addNew = function (data, callback) {
    let that = this;
    that.findOne({
        name: data.name
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
        .populate('owner')
        .sort({ "updateAt": -1 })
        .lean(true)
        .exec(callback);
}

CampaignMarketingSchema.statics.addNew = addNew;
CampaignMarketingSchema.statics.getAll = getAll;

CampaignMarketingSchema.pre('save', function (next) {
    this.updateAt = new Date();
    next();
});


mongoose.model('CampaignMarketing', CampaignMarketingSchema);
