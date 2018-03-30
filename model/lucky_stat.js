var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var luckyStat = new Schema({
    timeType: {type: String, enum: ['day', 'month'], trim: true, required: true, index: true},
    day: {type: Number, index: true},
    month: {type: Number, required: true, index: true},
    year: {type: Number, required: true, index: true},
    give: {type: Number, default: 0},
    use: {type: Number, default: 0}
});

var statUpdate = function(that, day, month, year, give, use, callback){
    if(!give && !use) return callback(100); //error 100, lỗi sai hoặc thiếu param

    var findQuery = {month: month, year: year};

    if(day) {
        findQuery.timeType = 'day';
        findQuery.day = day;
    } else findQuery.timeType = 'month';

    that.findOne(findQuery, function(err, result){
        if(err) callback(err);
        else {
            if(result){
                //update
                var update = {
                    $inc: {
                        give: give || 0,
                        use: use || 0
                    }
                };

                that.findOneAndUpdate(findQuery, update, callback);
            } else {
                //create new
                var newItem = new that(findQuery);
                newItem.give = give || 0;
                newItem.use = use || 0;
                newItem.save(callback);
            }
        }
    });
};

mongoose.statics = {
    getByDay: function(day, month, year, callback){
        var query = {timeType: 'day', day: day, month: month, year: year};
        this.findOne(query, callback);
    },
    getByMonth: function(month, year, callback){
        var query = {timeType: 'month', month: month, year: year};
        this.findOne(query, callback);
    },

    dailyUpdate: function(day, month, year, give, use, callback){
        statUpdate(this, day, month, year, give, use, callback);

        //update to monthly stat
        statUpdate(this, null, month, year, give, use, function(err, result){

        });
    }
};

mongoose.model('LuckyStat', luckyStat);