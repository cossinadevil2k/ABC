/**
 * Created by cuongpham on 1/28/15.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FaqSchema = new Schema({
    question: {type: String, trim:true, required:true, index: true},
    answer: {type: String, trim:true, required: true},
    language: {type: String, trim:true, required: true, index:true},
    section: {type: String, trim: true, index:true, ref:'HelpDeskFaqSection'},
    published: {type: Boolean, default: false, index:true},
    global: {type: Boolean, default: false, index: true},
    otherLanguage: {type: Array, index:true},
    links: {type: [{type: String, trim:true, ref:'HelpDeskFaq'}]},
    created_date: {type: Date, default: Date.now, index: true},
    platform: {type: Array, required: true, index: true},
    last_update: {type: Date, default: Date.now}
});

FaqSchema.pre('save', function(next){
    this.last_update = new Date();
    next();
});

FaqSchema.statics = {
    newFaq: function(question, answer, language, section, publish, global, platform, links, callback){
        var faq = new this();

        faq.created_date = new Date();
        faq.question = question;
        faq.answer = answer;
        faq.language = language;
        faq.section = section;
        faq.published = publish;
        faq.global = global;
        faq.platform = platform;
        faq.links = links;

        faq.save(callback);
    },

    editFaq: function(faq_id, changes, callback) {
        this.findById(faq_id, function(err, faq){
            if(err) callback(err);
            else {
                if(!faq) callback(true);
                else {
                    if(changes.answer) faq.answer = changes.answer;
                    if(changes.language) faq.language = changes.language;
                    if(changes.section) faq.section = changes.section;
                    if(changes.published) faq.published = changes.published;
                    if(changes.global) faq.global = changes.global;
                    if(changes.platform) faq.platform = changes.platform;
                    if(changes.links) faq.links = changes.links;

                    faq.save(callback);
                }
            }
        });
    },

    deleteFaq: function(faq_id, callback){
        this.findByIdAndRemove(faq_id, callback);
    },
    findFaq: function(info, callback){
        var select = '-published -global -created_date';

        var query = {
            section: info.sectionId,
            $or: [
                {language: info.language},
                {
                    $and:[
                        {global: true},
                        {
                            otherLanguage:{
                                $nin:[info.language]
                            }
                        }
                    ]
                }
            ],
            published: info.published
        };
        if(info.platform !== 'all') query.platform = info.platform;

        this.find(query)
            .select(select)
            .skip(info.skip)
            .limit(info.limit)
            .exec(callback);
    }
};

mongoose.model('HelpDeskFaq', FaqSchema);