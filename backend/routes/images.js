'use strict';

let mongoose = require('mongoose');
let TransactionModel = mongoose.model('Transaction');

let getTransactionImage = function(req, res){
    let skip = req.body.skip;
    let limit = req.body.limit;

    if (!limit) return res.json({s: false});

    TransactionModel.aggregate(
        {
            $match: {
                images: {$exists: true, $ne: []}
            }
        },
        {
            $sort: {createdAt: -1}
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $unwind: '$images'
        },
        function(err, result){
            if (err) {
                return res.json({s: false, e: err});
            }

            TransactionModel.populate(result, {path: 'account', select: 'name'}, (err, result) => {
                res.json({s: !err, d: result});
            });
        }
    )
};

module.exports = function(app, config){
    app.get('/image-manager', staticsMain);
    app.post('/image-manager/get', getTransactionImage);
};
