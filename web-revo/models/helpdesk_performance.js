var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var async = require('async');
var moment = require('moment');

var helpDeskPerformance = new Schema({
    type: {type: String, trim: true, enum: ['total','month'], index: true},
    year: {type: Number, index: true},
    month: {type: Number, index: true},
    adminId: {type: String, trim: true, ref:'Administrator', index: true},
    assigned: {type: Number, default: 0},
    solved: {type: Number, default: 0, index: true}
});

function checkTotal(instance, adminId, callback){
    /**
     * callback(error, status, id)
     */
    instance.findOne({type: 'total', adminId: adminId}, function(err, result){
        if(err) callback(err, false, null);
        else {
            if(!result || (result && result === {})) callback(null, null, null);
            else callback(null, true, result._id);
        }
    })
}

function checkMonth(instance, adminId, year, month, callback){
    /**
     * callback(error, status, id)
     */
    instance.findOne({type: 'month', adminId: adminId, year: year, month: month}, function(err, result){
        if(err) callback(err, false, null);
        else {
            if(!result || (result && result === {})) callback(null, null, null);
            else callback(null, true, result._id);
        }
    })
}

helpDeskPerformance.statics = {
    updatePerformance: function(adminId, year, month, kind_of_udpate){
        var that = this;

        async.series([
            function(callback){
                /**
                 * check and update total
                 */
                checkTotal(that, adminId, function(error, status, id){
                    if(error) callback(error);
                    else {
                        if(status){
                            // update record
                            var updateTotal = {};

                            if(kind_of_udpate == 'assigned') updateTotal.assigned = 1;
                            else updateTotal.solved = 1;

                            that.update({_id: id}, {$inc: updateTotal}, function(err, result){
                                callback(err);
                            });
                        } else {
                            // create record
                            var recordTotal = new that({
                                type:'total',
                                adminId: adminId
                            });

                            recordTotal.assigned = (kind_of_udpate == 'assigned')? 1 : 0;
                            recordTotal.solved = (kind_of_udpate == 'solved')? 1 : 0;

                            recordTotal.save(function(err, result){
                                callback(err);
                            });
                        }
                    }
                });
            },
            function(callback){
                /**
                 * check and update record of month
                 */
                checkMonth(that, adminId, year, month, function(error, status, id){
                    if(error) callback(error);
                    else {
                        if(status){
                            //update
                            var updateMonth = {};

                            if(kind_of_udpate == 'assigned') updateMonth.assigned = 1;
                            else updateMonth.solved = 1;

                            that.update({_id: id}, {$inc: updateMonth}, function(err, result){
                                callback(err);
                            });
                        } else {
                            //create
                            var recordMonth = new that({
                                type: 'month',
                                year: year,
                                month: month,
                                adminId: adminId
                            });

                            recordMonth.assigned = (kind_of_udpate == 'assigned')? 1 : 0;
                            recordMonth.solved = (kind_of_udpate == 'solved')? 1 : 0;

                            recordMonth.save(function(err, result){
                                callback(err);
                            });
                        }
                    }
                })
            }
        ], function(err, result){

        })
    }
};

mongoose.model('HelpDeskPerformance', helpDeskPerformance);