'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let BankMsgSchema = new Schema({
	bankname: {type: String, required: true, trim:true},
    sender: {type: String, required: true, trim: true},
	content: {type: String, required: true, trim: true},
	sendDate: {type: Date, default: Date.now, index: true},
    email: {type: String},
    national: {type: String, required: true},
    isDelete: {type: Boolean, default: false}
});

BankMsgSchema.pre('save', function(next){
    this.sendDate = new Date();
    next();
});

BankMsgSchema.statics = {
	addNew: function(obj, callback){
		let bmsg = new this(obj);

		bmsg.save(callback);
	}
};

mongoose.model('BankMsg', BankMsgSchema);
