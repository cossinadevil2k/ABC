'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


/**
 * Metadata structure
 * country : country code
 * device : device platform
 */


var GroupSchema = new Schema({
    name: { type: String, trim: true, require: true },
    metadata: { type: Schema.Types.Mixed },
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

GroupSchema.statics.addNew = addNew;
GroupSchema.statics.getAll = getAll;


GroupSchema.pre('save', function (next) {
    this.updateAt = new Date();
    next();
});


mongoose.model('Group', GroupSchema);
