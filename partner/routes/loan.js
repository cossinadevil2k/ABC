'use strict';

var mongoose    = require('mongoose');
var PartnerDB 	= require('../../model/helper/mongodb_connect_partner');
var Loan        = PartnerDB.model('Loan');

let getInfo = function(req, res){
    let providerId = req.session.partnerProviderId;
    let skip = 0;
    let limit = 0;
    Loan.getLoansByProviderId(providerId, skip, limit, function(err, result){
        res.send({s: !err, d: result});
    });
};

let addNew = function(req, res){

    let postData = req.body.postData;
    if (!postData.car.interestRate || !postData.car.adjustableRate ||
        !postData.house.interestRate || !postData.house.adjustableRate || !postData.personal.interestRate ||  !postData.personal.adjustableRate) {
            return res.send({s: false})
    }

    let info = {
        bankId: req.session.partnerId,
        provider: req.session.partnerProviderId,
        ageRequirement: {
            min: Number(postData.ageRequirement.min),
            max: Number(postData.ageRequirement.max)
        },
        minSalaryRequirement: Number(postData.minSalaryRequirement),
        gracePeriod: Number(postData.gracePeriod),

        personal: {
            interestRate: Number(postData.personal.interestRate),
            loanTenure: {
                min: Number(postData.personal.loanTenure.min),
                max: Number(postData.personal.loanTenure.max)
            },
            maximumLendingRate: Number(postData.personal.maximumLendingRate),
            priviledge: {
                interestRate: Number(postData.personal.priviledge.interestRate),
                numberMonth: Number(postData.personal.priviledge.numberMonth)
            },
            adjustableRate: Number(postData.personal.adjustableRate),
        },

        car: {
            interestRate: Number(postData.car.interestRate),
            loanTenure: {
                min: Number(postData.car.loanTenure.min),
                max: Number(postData.car.loanTenure.max)
            },
            maximumLendingRate: Number(postData.car.maximumLendingRate),
            priviledge: {
                interestRate: Number(postData.car.priviledge.interestRate),
                numberMonth: Number(postData.car.priviledge.numberMonth)
            },
            adjustableRate: Number(postData.car.adjustableRate),
        },

        house: {
            interestRate: Number(postData.house.interestRate),
            loanTenure: {
                min: Number(postData.house.loanTenure.min),
                max: Number(postData.house.loanTenure.max)
            },
            maximumLendingRate: Number(postData.house.maximumLendingRate),
            priviledge: {
                interestRate: Number(postData.house.priviledge.interestRate),
                numberMonth: Number(postData.house.priviledge.numberMonth)
            },
            adjustableRate: Number(postData.house.adjustableRate),
        },

    };
    Loan.addNew(info, function(err, result){
        let status = !(err || !result);
		res.send({s: status});
    });
}

let editInfo = function(req, res){
    let id = req.body.id;
    let postData = req.body.postData;
    if (!postData.car.interestRate || !postData.car.adjustableRate ||
        !postData.house.interestRate || !postData.house.adjustableRate || !postData.personal.interestRate ||  !postData.personal.adjustableRate) {
            return res.send({s: false})
    }

    let updates = {
        bankId: req.session.partnerId,
        provider: req.session.partnerProviderId,
        ageRequirement: {
            min: Number(postData.ageRequirement.min),
            max: Number(postData.ageRequirement.max)
        },
        minSalaryRequirement: Number(postData.minSalaryRequirement),

        personal: {
            interestRate: Number(postData.personal.interestRate),
            loanTenure: {
                min: Number(postData.personal.loanTenure.min),
                max: Number(postData.personal.loanTenure.max)
            },
            maximumLendingRate: Number(postData.personal.maximumLendingRate),
            priviledge: {
                interestRate: Number(postData.personal.priviledge.interestRate),
                numberMonth: Number(postData.personal.priviledge.numberMonth)
            },
            adjustableRate: Number(postData.personal.adjustableRate),
            gracePeriod: Number(postData.personal.gracePeriod),
        },

        car: {
            interestRate: Number(postData.car.interestRate),
            loanTenure: {
                min: Number(postData.car.loanTenure.min),
                max: Number(postData.car.loanTenure.max)
            },
            maximumLendingRate: Number(postData.car.maximumLendingRate),
            priviledge: {
                interestRate: Number(postData.car.priviledge.interestRate),
                numberMonth: Number(postData.car.priviledge.numberMonth)
            },
            adjustableRate: Number(postData.car.adjustableRate),
            gracePeriod: Number(postData.car.gracePeriod),
        },

        house: {
            interestRate: Number(postData.house.interestRate),
            loanTenure: {
                min: Number(postData.house.loanTenure.min),
                max: Number(postData.house.loanTenure.max)
            },
            maximumLendingRate: Number(postData.house.maximumLendingRate),
            priviledge: {
                interestRate: Number(postData.house.priviledge.interestRate),
                numberMonth: Number(postData.house.priviledge.numberMonth)
            },
            adjustableRate: Number(postData.house.adjustableRate),
            gracePeriod: Number(postData.house.gracePeriod),
        },

        editedAt: Date.now(),
    };

    Loan.editInfo(id, updates, function(err, result){
        let status = !(err || !result);
        if (status) {
            res.send({s: status, m:'Edit Success'})
        } else {
            res.send({s: status, m:'Edit Fails'})
        }
    });
};

let deleteAll = function(req, res){
    var id = req.body.id;
    Loan.removeByLoanId(id, function(status){
        if(status){
            res.send({error: false, msg:"Deleted"});
        } else {
            res.send({error: true, msg:"Deleting due to error"});
        }
    });
};

module.exports = function(app, config){
    app.get('/loan', staticsMain);

    app.post('/loan/getInfo', getInfo);
    app.post('/loan/add', addNew);
    app.post('/loan/edit', editInfo);
    app.post('/loan/delete', deleteAll);
};
