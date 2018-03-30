/*
	appId: number
	platform: number
	source: 'string'
	buyAt: datetime
	item: 'string'
 */


var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.Types.ObjectId;
var Mixed		= Schema.Types.Mixed;

var PurchasedStatSchema = new Schema({
	appId: {type: Number, required: true},
	platform: {type: Number, required: true},
	source: {type: String, required: true},
	buyAt: {type: Date, default: Date.now, index: true},
	item: {type: String, required: true, index: true}
});

PurchasedStatSchema.pre('save', function(next){
	this.buyAt = new Date();
	next();
});

PurchasedStatSchema.statics = {
	addNew: function(obj, callback){
		var ps = new this(obj);
		ps.save(function(err, ps){
            if(err){
                callback(false);
            } else
            callback(ps);
        });
	}
};


mongoose.model('PurchasedStat', PurchasedStatSchema);