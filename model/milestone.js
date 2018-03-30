var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;

var milestone_schema = new Schema({
    title: {type: String, required: true, trim: true},
    content: {type: String, trim: true},
    createdAt: {type: Date, default: Date.now},
    eventDate: {type: Date, required: true, index: true},
    owner: {type: String, ref: 'Administrator', required: true}
});


var select = 'title content eventDate owner';

var deleteMilestone = function(id, callback){
    this.findByIdAndRemove(id, function(err){
        callback(!err);
    });
};

var editMilestone = function(id, updates, callback){
    this.findByIdAndUpdate(id, updates, callback);
};

var addMilestone = function(info, callback){
    var milestone = new this(info);
    milestone.save(callback);
};

var getAll = function(callback){
    this.find({})
        .select(select)
        .sort('-eventDate')
        .exec(callback);
};

milestone_schema.statics.deleteMilestone = deleteMilestone;
milestone_schema.statics.editMilestone = editMilestone;
milestone_schema.statics.addMilestone = addMilestone;
milestone_schema.statics.getAll = getAll;

mongoose.model('Milestone', milestone_schema);
