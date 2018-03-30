/**
 * Module dependencies.
 */
var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var ObjectId 	= Schema.ObjectId;
var TransactionSchema = mongoose.model('Transaction');
/*
 * Client Key Schema
 */
var BalanceSchema = new Schema({
  account: { type: String, ref: 'Account', index: true },
  expense: { type: Number, required: true, default: 0},
  income: { type: Number, required: true, default:0},
  displayedDate: { type: Date, index: true, required: true },
  loan: {type: Number, required: true, default: 0},
  debt: {type: Number, required: true, default: 0}
});


var getBalance = function(account_id, callback){
	var condition = { account: account_id};
	balanceProgress(this, condition, callback);
};

var getBalanceByDateRange = function(account_id, start_date, end_date, callback){
	var condition = { account: mongoose.Types.ObjectId(account_id)};
	balanceProgress(condition, callback);
};

var balanceProgress = function(scope, condition, callback){
	scope.aggregate(
		{ $match : condition},
		{ $group: { _id: 1, expense: { $sum: '$expense'},income: { $sum: '$income'}}}, // 'group' goes first!
		{ $project: { _id: 1, expense: 1, income: 1 }}, // you can only project fields from 'group'
		callback
	);
};

var updateBalanceByDate = function updateBalanceByDate (account_id, date, callback) {
	checkDateExits(account_id, date, function(status, balance){
		if(!status) balance = new BalanceSchema();

		getTransactionByDate(account_id, date, function(status, data){
			balance.account = account_id;
			balance.expense = data.e;
			balance.income = data.i;
			balance.date = date;
			balance.save(function(err){
				callback(!err);
			});
		});
	});
};

var checkDateExits = function(account_id, date, callback){
	BalanceSchema.findOne({account: account_id, displayedDate: date}, 'account', function(err, data){
		if(err) throw err;
		else if(data) callback(true, data);
		else callback(false);
	});
};

var getTransactionByDate = function(account_id, date, callback){
	TransactionSchema.find({}).populate('category', 'type').select('amount category.type').exec(function(err, data){
		if(err || !data) callback(false);
		else callback(true, processData(data));
	});
};

var processData = function(data) {
	var expense = 0;
	var income = 0;

	data.forEach(function(item) { 
		if(item.category.type == 1) income += item.amount;
		else expense += item.amount;
	});

	return {e: expense, i: income};
};


BalanceSchema.statics.getBalance = getBalance;
BalanceSchema.statics.getBalanceByDateRange = getTransactionByDate;

mongoose.model('Balance', BalanceSchema);