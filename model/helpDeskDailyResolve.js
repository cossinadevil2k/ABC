var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var HelpDeskDailyResolve = new Schema({
    issue: { type: Schema.Types.ObjectId, index: true },
    created_at: { type: Date, default: Date.now, index: true }
});

mongoose.model('HelpDeskDailyResolve', HelpDeskDailyResolve);