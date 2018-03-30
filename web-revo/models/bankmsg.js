var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var BankMsgSchema = new Schema({
	bankname: {type: String, require: true, trim:true},
    sender: {type: String, require: true, trim: true},
	content: {type: String, required: true, trim: true},
	sendDate: {type: Date, default: Date.now },
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
		var bmsg = new this(obj);
		bmsg.save(function(err,data){
			if(err){
				callback(false);
			} else {
				callback(true);
			}
		})
	}
};

mongoose.model('BankMsg', BankMsgSchema);