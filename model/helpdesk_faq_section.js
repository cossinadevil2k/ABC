/**
 * Created by cuongpham on 1/28/15.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SectionFaqSchema = new Schema({
    name: {type: String, trim:true},
    created_date: {type: Date, default: Date.now},
    sortIndex: {type: Number, index:true},
    last_edit: {type: Date, default: Date.now}
});

SectionFaqSchema.pre('save', function(next){
    this.last_edit = new Date();
    next();
});

SectionFaqSchema.statics = {
    newSection: function(name, sortIndex, callback){
        var section = new this;
        section.name = name;
        section.created_date = new Date();
        section.sortIndex = sortIndex;
        section.save(callback);
    },
    editSection: function(section_id, name, sortIndex, callback){
        this.findById(section_id, function(err, section){
            if(err) callback(err);
            else {
                if(!section) callback(true);
                else {
                    section.name = name;
                    section.sortIndex = sortIndex;
                }
                section.save(callback);
            }
        })
    },
    deleteSection: function(section_id, callback){
        this.findByIdAndRemove(section_id, callback);
    }
};

mongoose.model('HelpDeskFaqSection', SectionFaqSchema);