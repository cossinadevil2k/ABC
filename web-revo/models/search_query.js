var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var searchQuerySchema = new Schema({
    name: {type: String, required: true, trim: true},
    type: {type: String, enum: ["device","user"], required: true, index: true},
    query: {type: String, required: true},
    keyRedis: {type: String},
    createdDate: {type: Date, default: Date.now, index: true},
    updatedDate: {type: Date, default: Date.now},
    pushCount: {type: Number, default: 0}
});

searchQuerySchema.statics = {
    addNew: function(data, callback){
        var item = new this({
            name: data.name,
            type: data.type,
            query: data.query
        });
        if (data.keyRedis) item.keyRedis = data.keyRedis;
        item.save(callback);
    },

    remove: function(id, callback){
        this.findByIdAndRemove(id, callback);
    },

    changeKeyRedis: function(id, newKey, callback){
        this.findByIdAndUpdate(id, {keyRedis: newKey, updatedDate: Date.now()}, callback)
    },

    pushCountIncrement: function(id){
        this.update({_id: id}, {$inc:{pushCount:1}}, function(){});
    },

    deleteKeyRedis: function(id, callback){
        this.update({_id: id}, {$unset: {keyRedis: ""}}, callback)
    }
};

mongoose.model('SearchQuery', searchQuerySchema);