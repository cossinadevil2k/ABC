/*
	Stats daily
 */
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

let statSchema = new Schema({
	table: {type: Number, require:true, index: true},
	createAt: {type: Date, default: Date.now, index: true},
	counter: {type: Number, default: 0},
	types: {type: Number, default: 0, index: true},
	metadata: {type: Schema.Types.Mixed}
});

statSchema.statics = {
	saveStat: function(table, stat, types, metadata){
		let newStat = new this({
			table: table,
			counter: stat,
			types: types
		});

		if (metadata) {
			newStat.metadata = metadata;
		}

		newStat.save();
	}
};

mongoose.model('statsDaily', statSchema);