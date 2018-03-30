'use strict';

var mongoose    = require('mongoose');
var Provider    = mongoose.model('Provider');
var PartnerDB 	= require('../../model/helper/mongodb_connect_partner');
var Loan        =  PartnerDB.model('Loan');
var url         = require('url');
var numeral     = require('numeral');

let skip = 0;
let limit = 0;

let getBankFollowLoan = function(req, res){
    //get query string variables
    let url_parts   = url.parse(req.url, true);
    let query       = url_parts.query;

    Loan.getLoansFromClient(skip, limit, query.p, function(err, result){
        if (result || !err) {
            res.render('conformityBanks', {
                result: result,
                userWant: query,
                numeral: numeral,
            })
        } else {
            res.redirect('/404')
        }
    });
};

let getBankList = function(req, res){
    Loan.getBanks(function(err, result){
        if (result || !err) {
            res.render('bankList', {
                result: result,
            })
        } else {
            res.redirect('/404')
        }
    });
};

let getDetailFollowBankId = function(req, res){
    let bankId = req.params.bankId; //5732e28cb713d4bb1779d80b
    Loan.getDetailByBankId(bankId, function(err, result){
        if (result || !err) {
            res.render('bankDetail', {
                result: result,
                numeral: numeral,
            })
        } else {
            res.redirect('/404')
        }
    });
};



module.exports = function(app, config){
    app.get('/404', function(req, res){
		res.render('404')
	});
    app.get('/', function(req, res){
        res.render('index')
    });
    app.get('/loan', function(req, res){
        res.render('loan')
    });
    app.get('/iwant', getBankFollowLoan);
    app.get('/bank', getBankList);
    app.get('/bank/:bankId', getDetailFollowBankId);

    app.use(function(req, res, next) {
        res.status(404);
        if (req.accepts('html')) {
            res.redirect('/404');
            return;
        }
        if (req.accepts('json')) {
            res.send({ error: 'Not found' });
            return;
        }
        res.type('txt').send('Not found');
    });
};
