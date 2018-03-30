/**
 * Created by cuongpham on 1/28/15.
 */

var env	= process.env.NODE_ENV;
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Issue = mongoose.model('HelpDeskIssue');
var BackendNotification = mongoose.model('BackendNotification');
var config = require('../config/config')[env];
var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
var room = '/backend/notification/admin/';

var MessageHelpDeskSchema = new Schema({
    issue: {type: String, trim:true, required: true, ref:'HelpDeskIssue', index: true},
    user: {type: String, trim: true, ref:'User', index:true},
    mod: {type: String, trim: true, ref:'Administrator', index: true},
    content: {type: String},
    metadata: {type: Schema.Types.Mixed},
    send_date: {type: Date, default: Date.now, index:true}
});

MessageHelpDeskSchema.statics = {
    newMessage: function(issue_id, is_mod, from, content, callback, metadata){
        var message = new this();
        message.send_date = new Date();
        message.issue = issue_id;
        if(is_mod) message.mod = from;
        else message.user = from;

        message.content = content;

        if(metadata) message.metadata = metadata;

        message.save(function(err, result){
            if(!err && !is_mod) {
                Issue.findById(issue_id, function(e, issue){
                    if(issue) {
                        if (issue.assigned && issue.assigned.length > 0) {
                            var url = '/helpdesk/issue_details/' + issue_id;
                            var content = 'User đã trả lời vào issue: ['+issue.name+']';
                            issue.assigned.forEach(function(element){
                                BackendNotification.addNew(element, 'issue', content, url, function(error ,result){
                                    if (!error) {
                                        if (!is_mod) {
                                            io.emit(room + result.user, JSON.stringify({type:"helpdesk_issue_reply", url: result.url}));
                                        }
                                    }
                                });
                            });
                        }

                        if (issue.status === 'Resolved') {
                            Issue.findByIdAndUpdate(issue_id, {$set: {status: null}}, function(err, result){

                            });
                        }
                    }
                });
            }
            callback(err, result);
        });
    },

    updateMessageUnreadStatus: function(messageId, status, callback){
        this.findByIdAndUpdate(messageId, {unread: status}, callback);
    },

    findByIssueId: function(issue_id, callback){
        this.find({issue: issue_id})
            .sort('send_date')
            .populate('user','_id email')
            .populate('mod','_id username')
            .exec(callback);
    },

    findByIssueIdForUser: function(issue_id, callback){
        this.find({issue: issue_id})
            .sort('send_date')
            .exec(function(err, result){
                if (err) callback(err);
                else {
                    result.forEach(function(msg){
                        if (!msg.user && !msg.mod) msg.mod = 'bot';
                    });
                    callback(null, result);
                }
            });
    }
};

mongoose.model('HelpDeskMessage', MessageHelpDeskSchema);
