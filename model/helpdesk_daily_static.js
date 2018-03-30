var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var HelpDeskDailyStatic = new Schema({
    issue: { type: Number, index: true },
    resolve: { type: Number, index: true },
    byDate: { type: Date, index: true },
    last_update: { type: Date, default: Date.now }
});

HelpDeskDailyStatic.pre('save', function (next) {
    this.last_update = new Date();
    next();
})

mongoose.model('HelpDeskDailyStatic', HelpDeskDailyStatic);