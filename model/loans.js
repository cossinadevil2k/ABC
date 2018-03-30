/**
 *      LOANS MODAL
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var PartnerDB 	= require('./helper/mongodb_connect_partner');

var formAttribute = {
    interestRate: {type: Number, required: true},
    adjustableRate: {type: Number, required: true},
    maximumLendingRate: {type: Number},
    priviledge: {
        interestRate: Number,
        numberMonth: Number
    },
    loanTenure: {
        min: Number,
        max: Number
    },
    gracePeriod: {type: Number},
};

var loansSchema = new Schema({
    bankId: {type: String, ref: 'Partner', required: true},
    provider: {type: String, ref: 'Provider', index: true, required: true},
    createdAt: {type: Date, default: Date.now},
    editedAt: {type: Date, default: Date.now},
    ageRequirement: {
        min: Number,
        max: Number
    },
    minSalaryRequirement: Number,

    personal: formAttribute,
    car: formAttribute,
    house: formAttribute,
});

var selectGetAll = 'bankId createdAt editedAt ageRequirement minSalaryRequirement personal car house provider';

var selectForClient = 'bankId provider ageRequirement minSalaryRequirement car house personal';

var getLoansByProviderId = function(providerId, skip, limit, callback){
    this.find({provider: providerId})
        .select(selectGetAll)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('bankId', 'name')
        .lean()
        .exec(callback);
};

var getLoansFromClient = function(skip, limit, plan, callback){
    this.find()
        .select(selectForClient)
        .sort(plan+'.interestRate')
        .skip(skip)
        .limit(limit)
        .populate('bankId', 'name')
        .populate('provider', 'icon')
        .lean()
        .exec(callback)
};

var getDetailByBankId = function(bankId, callback){
    this.find({_id: bankId})
        .select(selectGetAll)
        .populate('bankId', 'name')
        .populate('provider', 'icon')
        .lean()
        .exec(callback);
};

var getBanks = function(callback){
    this.find()
        .select("bankId provider car house personal")
        .populate('bankId', 'name')
        .populate('provider', 'icon')
        .lean()
        .exec(callback)
};

var addNew = function(info, callback){
    var loan = new this(info);
    loan.save(callback);
};

var editInfo = function(id, updates, callback){
    this.findByIdAndUpdate(id, updates, callback);
};

var removeByLoanId = function(id, callback){
    this.findByIdAndRemove(id, function(err){
        callback(!err)
    });
};

loansSchema.statics.getLoansByProviderId = getLoansByProviderId;
loansSchema.statics.getDetailByBankId = getDetailByBankId;
loansSchema.statics.getLoansFromClient = getLoansFromClient;
loansSchema.statics.getBanks = getBanks;
loansSchema.statics.addNew = addNew;
loansSchema.statics.editInfo = editInfo;
loansSchema.statics.removeByLoanId = removeByLoanId;

PartnerDB.model('Loan', loansSchema);
