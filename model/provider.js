'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let fs = require('fs');

let providerSchema = new Schema({
    realId: { type: Number, required: true, index: true },
    name: { type: String, trim: true, index: true },
    code: { type: String, trim: true, index: true },
    home_url: { type: String },
    country_code: { type: String },
    service: { type: Number, index: true }, //1: SaltEdge, 2: Finsify,
    disabled: { type: Boolean, default: false, index: true },
    icon: { type: String },
    meta_search: { type: String, default: "" },
    is_free: { type: Boolean, default: false, index: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    is_debug: { type: Boolean },
    hasBalance: { type: Boolean },
    type: { type: String },
    primary_color: { type: String }
});

function checkProvider(info) {
    if (!info.id) return false;
    if (!info.name) return false;
    if (!info.code) return false;
    if (!info.country_code) return false;
    if (!info.service) return false;

    return true;
}

let SERVICE = {
    1: "saltedge",
    2: "finsify"
};

/**
 * FUNCTIONS
 */

let addNew = function (info, callback) {
    let ok = checkProvider(info);

    if (!ok) {
        return callback('provider_info_invalid');
    }

    let newItem = new this({
        realId: info.id,
        name: info.name,
        code: info.code || info.provider_code,
        country_code: info.country_code,
        service: info.service
    });

    if (info.hasBalance) newItem.hasBalance = info.hasBalance;
    if (info.is_debug) newItem.debug = info.is_debug;
    if (info.meta_search) newItem.meta_search = info.meta_search;
    if (info.icon) newItem.icon = info.icon;
    if (info.home_url) newItem.home_url = info.home_url;
    if (info.created_at) newItem.created_at = info.created_at;
    if (info.updated_at) newItem.updated_at = info.updated_at;

    newItem.save(callback);
};

let changeDisabledStatus = function (id, status, callback) {
    this.findByIdAndUpdate(id, { disabled: status }, callback);
};

let changeFreeStatus = function (id, status, callback) {
    this.findByIdAndUpdate(id, { is_free: status }, callback);
};

let changeMetaSearch = function (id, meta, callback) {
    this.findByIdAndUpdate(id, { meta_search: meta }, callback);
};

let changeDebugStatus = function (id, status, callback) {
    this.findByIdAndUpdate(id, { is_debug: status }, callback);
};

let updateProvider = function (id, update, callback) {
    this.findByIdAndUpdate(id, update, callback);
};

let getAll = function (options, callback) {
    let query = {};
    let skip = null;
    let limit = null;

    if (options.query) {
        query = options.query;
    }
    if (options.skip) {
        skip = options.skip;
    }
    if (options.limit) {
        limit = options.limit;
    }

    this.find(query)
        .sort({ disabled: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(callback);
};

let getSaltEdgeProvider = function (skip, limit, callback) {
    let query = { service: 1, disabled: false };

    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback)
};

let getSaltEdgeProviderForBackEnd = function (disabled, skip, limit, callback) {
    let query = { service: 1 };

    if (disabled != null) {
        query.disabled = disabled;
    }

    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback)
};

let getFinsifyProvider = function (skip, limit, callback) {
    let query = { service: 2, disabled: false };
    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback);
};

let getFinsifyProviderForBackEnd = function (disabled, skip, limit, callback) {
    let query = { service: 2 };

    if (disabled != null) {
        query.disabled = disabled;
    }

    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback);
};

let getIconlessProvider = function (skip, limit, callback) {
    let query = { icon: { $exists: false }, disabled: false };

    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
};

let search = function (keyword, skip, limit, callback) {
    this.find({ name: { $regex: new RegExp(keyword, 'i') } })
        .sort('name')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback);
};

let updateIconName = function (id, callback) {
    this.findById(id, (err, provider) => {
        if (err || !provider) callback(err, provider);
        else {
            this.findByIdAndUpdate(id, { icon: provider.code }, callback);
        }
    });
};

let findByCode = function (code, callback) {
    this.findOne({ code: code }, callback);
};

let findElse = function (data, callback) {
    let query = {};
    let skip = null;
    let limit = null;

    if (data.realId) {
        query.realId = data.realId;
    }
    if (data.skip) {
        skip = data.skip;
    }
    if (data.limit) {
        limit = data.limit;
    }

    if (data.type) {
        query.type = data.type;
    }

    this.find(query)
        .sort({ disabled: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(callback);
};

let findByRealId = function (data, callback) {
    let query = {};
    let skip = null;
    let limit = null;

    if (data.realId) {
        query.realId = { $in: data.realId }; // array
    }
    if (data.skip) {
        skip = data.skip;
    }
    if (data.limit) {
        limit = data.limit;
    }

    this.find(query)
        .sort()
        .skip(skip)
        .limit(limit)
        .exec(callback);
};


let searchByName = function (data, callback) {
    let condition = {
        name: new RegExp('^' + data.name + '$', "i"),
        type : data.type
    };

    this.find(condition)
        .exec(callback);
};

let liveSearch = function (data, callback) {
    let toSearch = data.name.split(" ").map(function (n) {
        return {
            name: new RegExp(n.trim(), 'i'),
            type : data.type
        };
    });

    this.find({ $and: toSearch }).limit(50).exec(callback);
};

providerSchema.statics.addNew = addNew;
providerSchema.statics.changeDisabledStatus = changeDisabledStatus;
providerSchema.statics.changeFreeStatus = changeFreeStatus;
providerSchema.statics.changeMetaSearch = changeMetaSearch;
providerSchema.statics.changeDebugStatus = changeDebugStatus;
providerSchema.statics.updateProvider = updateProvider;
providerSchema.statics.getAll = getAll;
providerSchema.statics.getSaltEdgeProvider = getSaltEdgeProvider;
providerSchema.statics.getSaltEdgeProviderForBackEnd = getSaltEdgeProviderForBackEnd;
providerSchema.statics.getFinsifyProvider = getFinsifyProvider;
providerSchema.statics.getFinsifyProviderForBackEnd = getFinsifyProviderForBackEnd;
providerSchema.statics.getIconlessProvider = getIconlessProvider;
providerSchema.statics.search = search;
providerSchema.statics.updateIconName = updateIconName;
providerSchema.statics.findByCode = findByCode;
providerSchema.statics.findElse = findElse;
providerSchema.statics.findByRealId = findByRealId;
providerSchema.statics.searchByName = searchByName;
providerSchema.statics.liveSearch = liveSearch;

mongoose.model('Provider', providerSchema);
