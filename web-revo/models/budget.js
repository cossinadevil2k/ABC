/**
 * Module dependencies.
 */
var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var ObjectId 	= Schema.ObjectId;

/*
 * Client Key Schema
 */
var BudgetSchema = new Schema({
    _id: {type: String, index: true},
    name: {type: String, trim: true},
    account: { type: String, ref: 'Account', require: true, index: true},
    category: { type: String, ref: 'Category' },
    amount: { type: Number, required: true},
    start_date: {type: Date, required: true},
    end_date: {type: Date, required: true},
    isDelete: { type: Boolean, default: false, index: true },
    updateAt: { type: Date, default: Date.now, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    lastEditBy: { type: Schema.Types.ObjectId, ref: 'User'},
    tokenDevice: {type: String, required: true},
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true},
    isRepeat: {type: Boolean, default: false}
});

BudgetSchema.index({isDelete: 1, account: 1});
BudgetSchema.index({account: 1, tokenDevice: 1, updateAt: 1});

BudgetSchema.pre('save', function(next){
	this.updateAt = new Date();
	next();
});

var propertiesSelect = 'name category amount start_date end_date isRepeat';

BudgetSchema.statics.getBudgetListByAccountId = function(account_id, isFinished, callback){
    if(!account_id) return callback([]);

    var condition = [{'isDelete': false}, {'account': account_id}];


    this.find({$and: condition})
    .populate('category', 'name icon type')
    .select(propertiesSelect).sort({'name': 1})
    .exec(function(err, data){
        if(err || !data) callback([]);
        else callback(data);
    });
};

BudgetSchema.deleteByCategoryId = function(user_id, cate_id, callback) {
    this.update({category: cate_id, isDelete: false},
    {isDelete: true, lastEditBy: user_id},
    {multi: true}, function(err){
        if(err) console.error(err);
        callback(!err);
    });
};

BudgetSchema.deleteByAccountId = function(user_id, account_id, callback) {
    this.update({account: account_id, isDelete: false},
    {isDelete: true, lastEditBy: user_id},
    {multi: true}, function(err){
        if(err) console.error(err);
        callback(!err);
    });
};


mongoose.model('Budget', BudgetSchema);