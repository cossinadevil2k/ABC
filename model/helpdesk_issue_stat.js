var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');

var helpDeskIssueStat = new Schema({
    type: {type: String, trim:true, enum: ['total','month'], index: true},
    year: {type: Number, index: true},
    month: {type: Number, index: true},
    amount: {type: Number, default: 0},
    solved: {type: Number, default: 0, index: true}
});

function checkTotal(instance, callback){
    /***
     * callback(error, status, totalRecordId)
     */
    instance.findOne({type: 'total'}, function(err, result){
        if(err) callback(err, false, null);
        else {
            if(!result || (result && result === {})) callback(null, false);
            else callback(null, true, result._id);
        }
    })
}

function checkRecordExist(instance, year, month, callback){
    /**
     * callback(error, status, record);
     */

    var query = { year: year, month: month };
    instance.findOne(query, function(err, result){
        if(err) callback(err, false, null);
        else {
            if(!result || (result && result === {}) ) callback(null, false, null);
            else callback(null, true, result._id);
        }
    });
}

helpDeskIssueStat.statics = {
    updateRecord: function(year, month, kind_of_update){
        var that = this;

        async.series([
            function(callback){
                /**
                 * check record of total and update
                 */

                // Check total record exists yet
                checkTotal(that, function(error, status, id){
                    if(error) callback(error);
                    else {
                        if (status) {
                            //update record
                            var update = {};
                            if (kind_of_update == 'amount') update.amount = 1;
                            else update.solved = 1;

                            that.update({_id: id}, {$inc: update}, function (err, result) {
                                callback(err);
                            });
                        } else {
                            //create a record of total
                            var total = new that({
                                type: 'total'
                            });

                            total.amount = (kind_of_update == 'amount')? 1: 0;
                            total.solved = (kind_of_update == 'solved')? 1: 0;

                            total.save(function (err, result) {
                                callback(err);
                            })
                        }
                    }
                });
            },
            function(callback){
                /**
                 * check record of month and update
                 */

                //check record exist
                checkRecordExist(that, year, month, function(error, status, id){
                    if(error) callback(error);
                    else {
                        if (status) {
                            //update record
                            var updateMonth = {};
                            if (kind_of_update == 'amount') updateMonth.amount = 1;
                            else updateMonth.solved = 1;

                            that.update({_id: id}, {$inc: updateMonth}, function (err, result) {
                                callback(err);
                            });

                        } else {
                            //create new
                            var record_of_month = new that({
                                type: 'month',
                                year: year,
                                month: month
                            });

                            record_of_month.amount = (kind_of_update == 'amount')? 1 : 0;
                            record_of_month.solved = (kind_of_update == 'solved')? 1 : 0;

                            record_of_month.save(function (err, result) {
                                callback(err);
                            });
                        }
                    }
                })
            }
        ], function(err, results){

        })
    }
};

mongoose.model('HelpDeskIssueStat', helpDeskIssueStat);