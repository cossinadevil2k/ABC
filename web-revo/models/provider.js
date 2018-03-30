'use strict';

var env = process.env.NODE_ENV;
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fs = require('fs');

var utils = require('../helper/utils');
var config = require('../config/config')[env];
var filename = config.provider_cache;
var filename2 = config.root + '/landing-page/data/provider_cache_production.json';

var providerSchema = new Schema({
    _id: {type: String, required: true, unique: true, index: true},
    realId: {type: Number, required: true, index: true},
    name: {type: String, trim: true, index: true},
    code: {type: String, trim: true, index: true},
    home_url: {type: String},
    country_code: {type: String},
    service: {type: Number, index: true}, //1: SaltEdge, 2: Finsify,
    disabled: {type: Boolean, default: false, index: true},
    icon: {type: String},
    meta_search: {type :String, default: ""},
    is_free: {type: Boolean, default: false, index: true},
    created_at: {type: Date},
    updated_at: {type: Date},
    is_debug: {type: Boolean},
    hasBalance: {type: Boolean},
    type: {type: String},
    primary_color: {type: String}
});

function checkProvider(info){
    if (!info.id) return false;
    if (!info.name) return false;
    if (!info.code) return false;
    if (!info.country_code) return false;
    if (!info.service) return false;

    return true;
}

var SERVICE = {
    1: "saltedge",
    2: "finsify"
};

function generateJsonFile(ProviderModel, service, callback){
    var query = {disabled: false};
    if (service && service < 3) {
        query.service = service;
    }

    ProviderModel.find(query)
        .select('name code service home_url country_code icon is_free meta_search is_debug hasBalance type primary_color')
        .sort('name')
        .exec(function(err, result){
            if (!err) {
                var timeStamp = parseInt(new Date().getTime()/1000, 10);
                var imageUrl = 'https:' + config.site.urlStatic3 + 'img/icon/provider/';
                var newData = {status: "active", t: timeStamp, data: result, image_url: imageUrl};
                fs.writeFile(filename, JSON.stringify(newData), callback);
                fs.writeFile(filename2, JSON.stringify(newData), function(){});
                utils.cacheTimestamp('p', timeStamp);
            } else {
                callback(err);
            }
        });
}

/**
 * FUNCTIONS
 */

let addNew = function(info, callback){
    let ok = checkProvider(info);

    if (!ok) {
        return callback('provider_info_invalid');
    }

    let newItem = new this({
        _id: SERVICE[info.service] + '_' + info.id,
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

let changeDisabledStatus = function(id, status, callback){
    this.findByIdAndUpdate(id, {disabled: status}, callback);
};

let changeFreeStatus = function(id, status, callback){
    this.findByIdAndUpdate(id, {is_free: status}, callback);
};

let changeMetaSearch = function(id, meta, callback) {
    this.findByIdAndUpdate(id, {meta_search: meta}, callback);
};

let changeDebugStatus = function(id, status, callback){
    this.findByIdAndUpdate(id, {is_debug: status}, callback);
};

let updateProvider = function(id, update, callback){
    this.findByIdAndUpdate(id, update, callback);
};

let getAll = function(options, callback){
    let query = {};

    if (options.query) {
        query = options.query;
    }

    this.find(query)
        .sort({disabled: 1, code: 1})
        .skip(options.skip)
        .limit(options.limit)
        .exec(callback);
};

let getSaltEdgeProvider = function(skip, limit, callback){
    let query = {service: 1, disabled: false};

    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback)
};

let getSaltEdgeProviderForBackEnd = function(disabled ,skip, limit, callback){
    let query = {service: 1};

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

let getFinsifyProvider = function(skip, limit, callback) {
    var query = {service: 2, disabled: false};
    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback);
};

let getFinsifyProviderForBackEnd = function(disabled, skip, limit, callback) {
    let query = {service: 2};

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

let getIconlessProvider = function(skip, limit, callback){
    let query = {icon: {$exists: false}, disabled: false};

    this.find(query)
        .sort('_id')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(callback);
};

let cacheProviderList = function(service, callback){
    generateJsonFile(this, service, callback);
};

let search = function(keyword, skip, limit, callback){
    this.find({name: {$regex: new RegExp(keyword, 'i')}})
        .sort('name')
        .skip(skip)
        .limit(limit)
        .lean(true)
        .exec(callback);
};

let updateIconName = function(id, callback){
    var that = this;

    this.findById(id, function(err, provider){
        if (err || !provider) callback(err, provider);
        else {
            that.findByIdAndUpdate(id, {icon: provider.code}, callback);
        }
    });
};

let findByCode = function(code, callback){
    this.findOne({code: code}, callback);
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
providerSchema.statics.cacheProviderList = cacheProviderList;
providerSchema.statics.search = search;
providerSchema.statics.updateIconName = updateIconName;
providerSchema.statics.findByCode = findByCode;

mongoose.model('Provider', providerSchema);