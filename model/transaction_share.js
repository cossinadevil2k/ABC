/*
	Share transaction
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;

var shareSchema = new Schema({
	transaction: {type: String, trim: true, index: true},
	owner: {type: Schema.Types.Object, ref: 'User'},
	note: {type: String, trim: true},
	account: {type: String, require: true},
	category: {type: Mixed},
	amount: {type: Number},
	displayDate: { type: Date, required: true, index: true }, // Ngay thuc hien giao dich
	dueDate: Date, // Ngay tra no, thong bao thanh toan ...
	address: {type: String, trim: true, index: true}, // Dia diem
	longtitude: {type: Number}, // Location X
	latitude: {type: Number}, //  Location Y
	with: {type: Mixed}, // An cung ai. (VD: Vay no),
	campaign: {type: Mixed}, // Chien dich tiet kiem, Picnic chi...
	image: {type: String, trim: true},
	createAt: {type: Date, default: Date.now},
	currency: {type: Mixed},
	timezone: {type: Number, default: 0}
});

shareSchema.pre('save', function(next){
	this.markModified('category');
	this.markModified('currency');
	this.markModified('campaign');
	next();
});

shareSchema.statics = {
	addNew: function(obj, callback){
		var share = new this(obj);
		share.save(function(err){
			callback(!err, share);
		});
	}
};

mongoose.model('transactionShare', shareSchema);