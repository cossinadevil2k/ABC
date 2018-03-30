'use strict';

let mongoose = require('mongoose');
let MongoDb = require('../../model/helper/mongodb_connect_logs');
let ChangeLogModel = MongoDb.model('FinsifyCategoryChangelog');
let TransactionModel = mongoose.model('Transaction');
let WalletModel = mongoose.model('Account');
let UserModel = mongoose.model('User');

let CategoryMetadataSet = require('../../config/category_metadata');

function finAllAndPopulateTransaction(skip, limit) {
   return new Promise((resolve, reject) => {
      ChangeLogModel.find()
          .sort({changed_date: -1})
          .skip(skip)
          .limit(limit)
          .populate({
             path: 'transaction',
             model: TransactionModel,
             populate: {
                path: 'account',
                model: WalletModel,
                populate: {
                   path: 'owner',
                   select: 'email',
                   model: UserModel
                }
             }
          })
          .exec((err, data) => {
             if (err) {
                return reject(err);
             }

             resolve(data);
          });
   });
}

let appList = function (req, res) {
   let skip = req.body.skip || 0;
   let limit = req.body.limit;

   if (!limit) {
      return res.json({s: false});
   }

   finAllAndPopulateTransaction(skip, limit)
       .then((data) => {
          res.json({s: true, d: data});
       })
       .catch((err) => {
        //   console.log(err);
          res.json({s: false});
       });
};

let appDelete = function (req, res) {
   let id = req.body.id;

   if (!id) {
      return res.json({s: false});
   }

   ChangeLogModel.findByIdAndRemove(id, (err) => {
      res.json({s: !err});
   });
};

let appDefaultCategories = function (req, res) {
   res.json({s: true, d: CategoryMetadataSet});
};

let appTotal = function (req, res) {
   ChangeLogModel.count((err, count) => {
      res.json({s: !err, d: count});
   });
};

let appChange = function (req, res) {
   let id = req.body.id;
   let new_category = req.body.new_category;

   if (!id || !new_category) {
      return res.json({s: false});
   }

   ChangeLogModel.findByIdAndUpdate(id, {$set: {new_category: new_category}}, (err) => {
      res.json({s: !err});
   });
};

module.exports = function(app, config){
   app.get('/classification-log', staticsMain);

   app.post('/classification-log/list', appList);
   app.post('/classification-log/delete', appDelete);
   app.post('/classification-log/get-default-categories', appDefaultCategories);
   app.post('/classification-log/total-category', appTotal);
   app.post('/classification-log/change-category', appChange);
};
