'use strict';

var mongoose = require('mongoose');
var PartnerDB = require('./helper/mongodb_connect_partner');
var Schema = mongoose.Schema;
var ProviderModel = mongoose.model('Provider');
var utils = require('./helper/utils');

var PartnerSchema = new Schema({
    name: {type: String, required: true, trim: true, index: true},
    description: {type: String, trim:true},
    address: {type: String, trim: true},
    country: {type: String},
    tel: {type: String, trim: true},
    email: {type: String, trim: true, index: true, unique: true},
    createdDate: {type: Date, default: Date.now},
    updateAt: {type: Date, default: Date.now},
    hashed_password: {type: String, required: true},
    salt: {type: String},
    provider: {type: String , required: true, index: true},
    lastLogin: {type: Date}
});

function validateData(data){
    if (!data) return false;
    if (!data.name) return false;
    if (!data.country) return false;
    if (!data.email) return false;
    if (!data.password) return false;
    if (!data.provider) return false;

    return true;
}

var updateLastLogin = function(){
    this.lastLogin = Date.now();

    this.save();
};

var findByEmail = function(email, callback) {
    this.findOne({email: email})
        .populate({path: 'provider', model: ProviderModel})
        .exec(callback);
};

var appGetList = function(skip, limit, callback){
    this.find()
        .sort('name')
        .skip(skip)
        .limit(limit)
        .populate({path: 'provider', model: ProviderModel})
        .lean()
        .exec(callback);
};

var appAddNew = function(obj, callback){
    if (!validateData(obj)) {
        return callback('InvalidInfo');
    }

    let salt = utils.uid(5);

    let data = new this({
        name: obj.name,
        description: obj.description,
        country: obj.country,
        email: obj.email,
        salt: salt,
        provider: obj.provider
    });

    data.hashed_password = utils.encryptPassword(obj.password, salt);

    if (obj.address) data.address = obj.address;
    if (obj.tel) data.tel = obj.tel;

    data.save(callback);
};

var appEditPartner = function(obj, callback){
    var partnerId = obj._id;

    let info = {
        email: obj.email,
        updateAt: Date.now()
    };

    this.findByIdAndUpdate(partnerId, info, callback);
};

var appDeletePartner = function(partnerId, callback){
    this.findByIdAndRemove(partnerId, callback);
};

var appChangePassword = function (email, password, callback) {
    this.findByEmail(email, function(err, partner) {
        if (err) {
            return callback(err);
        }

        if (!partner) {
            return callback('PartnerNotFound');
        }

        partner.hashed_password = utils.encryptPassword(password, partner.salt);

        partner.save(function(saveError) {
            callback(saveError);
        });
    });
};

var appLogin = function(email, password, callback) {
    let errMessage = 'WrongEmailOrPassword';

    this.findByEmail(email, function(err, partner){
        if (err) {
            return callback(err);
        }

        if (!partner) {
            return callback(errMessage);
        }

        if (!utils.authenticateString(partner.hashed_password, password, partner.salt)) {
            return callback(errMessage);
        }

        let data = {
            _id: partner._id,
            email: partner.email,
            name: partner.name,
            description: partner.description,
            address: partner.address,
            country: partner.country,
            tel: partner.tel,
            provider: partner.provider,
            lastLogin: partner.lastLogin
        };

        callback(null, data);

        partner.updateLastLogin();
    });
};

var appCountByProviderId = function (provider_id, callback) {
    this.count({provider: provider_id}, callback);
};

var appFindByProviderId = function (provider_id, skip, limit, callback) {
    this.find({provider: provider_id})
        .sort('name')
        .skip(skip)
        .limit(limit)
        .populate({path: 'provider', model: ProviderModel})
        .lean()
        .exec(callback);
};

/**
 * EXPORTS
 */
PartnerSchema.methods.updateLastLogin = updateLastLogin;

PartnerSchema.statics.findByEmail = findByEmail;
PartnerSchema.statics.getList = appGetList;
PartnerSchema.statics.addNew = appAddNew;
PartnerSchema.statics.editPartner = appEditPartner;
PartnerSchema.statics.deletePartner = appDeletePartner;
PartnerSchema.statics.changePassword = appChangePassword;
PartnerSchema.statics.login = appLogin;
PartnerSchema.statics.countByProviderId = appCountByProviderId;
PartnerSchema.statics.findByProviderId = appFindByProviderId;

PartnerDB.model('Partner', PartnerSchema);