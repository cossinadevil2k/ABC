'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LandingStaticSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref:'Administrator' },
    subDomain: { type: String, trim: true, require: true },
    domain: { type: String, trim: true, require: true },
    url: { type: String, trim: true, require: true },
    status: {type: String, enum: ['Pending', 'Accepted', 'Denied', 'Scheduled']},
    nameFolder: { type: String, trim: true, require: true}
})
 let addNew = function(data, callback){
     let Landing = this;
     Landing.findOne({
         subDomain: data.subdomain
     }, function(error, result){
         if(error){
             callback(error, null);
         } else {
             if(!result){
                 let newData = new Landing(data);
                 newData.save(callback)
             } else {
                callback('exists', null)
             }
         }
     })
 }
 
 let getAll = function(callback){
     this.find()
         .populate('userId')
         .lean(true)
         .exec(callback);
 }
 LandingStaticSchema.statics.addNew = addNew;
 LandingStaticSchema.statics.getAll = getAll;
mongoose.model('LandingStatic',LandingStaticSchema)