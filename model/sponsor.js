var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var SponsorSchema = new Schema({
    name: {type: String, trim:true, required:true},
    partner: {type:ObjectId, trim:true, required:true, ref:'Partner'},
    logo: {type:String, required:true},
    description: {type:String, required:true},
    content: {type:String, required: true},
    startDate: {type: Date, required: true},
    endDate: {type:Date, required:true},
    isEnabled: {type: Boolean, default:true},
    isDeleted: {type: Boolean, default:false}
});

SponsorSchema.statics = {
    getList: function(callback){
        this.find({isDeleted:false})
            .populate('partner', 'name _id')
            .exec(function(err, result){
                if(err || !result){
                    callback(false);
                } else {
                    callback(result);
                }
            });
    },
    addSponsor: function(obj, callback){
        var s = new this(obj);
        s.save(function(err, data){
            if(err || !data){
                callback(false);
            } else {
                callback(data);
            }
        })
    },
    editSponsor: function(sponsorId, obj, callback){
        this.findByIdAndUpdate(sponsorId, obj, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        });
    },
    removeSponsor: function(sponsorId, callback){
        this.findByIdAndUpdate(sponsorId, {isDeleted: true}, function(err, result){
            if(err || !result){
                callback(false);
            } else {
                callback(result);
            }
        })
    }
};


mongoose.model('Sponsor', SponsorSchema);