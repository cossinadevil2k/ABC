/*
	Stats daily
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var statSchema = new Schema({
	table: {type: Number, require:true, index: true},
	createAt: {type: Date, default: Date.now, index: true},
	counter: {type: Number, default: 0},
	types: {type: Number, default: 0, index: true}
});

statSchema.statics = {
	saveStat: function(table, stat, types){
		var newStat = new this({
			table: table,
			counter: stat,
			types: types
		});
		newStat.save();
	}
};

mongoose.model('statsDaily', statSchema);