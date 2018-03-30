/**
 * Created by cuongpham on 1/28/15.
 */

var env	= process.env.NODE_ENV;
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var HelpDeskPerformance = mongoose.model('HelpDeskPerformance');
var HelpDeskIssueStats = mongoose.model('HelpDeskIssueStat');
var BackendNotification = mongoose.model('BackendNotification');
var moment = require('moment');

var Device = mongoose.model('Device');
var pushHook = require('./sync/newhook');

var config = require('../config/config')[env];
var io = require('socket.io-emitter')({host: config.redis.host, port: config.redis.port});
var room = '/backend/notification/admin/';

var IssueSchema = new Schema({
    name: {type: String, trim:true, required: true},
    user: {type: String, trim:true, ref:'User', required:true, index:true},
    report_date: {type: Date, default: Date.now, index: true},
    metadata: {type: Schema.Types.Mixed, index: true},
    status: {type: String, enum: ['Resolved', 'Rejected', null], default: null, index: true},
    assigned: {type: [{type: String, trim: true, ref:'Administrator'}] , index: true},
    tags: {type: [{type: String, trim: true}], index: true},
    note: {type: String},
    last_update: {type: Date, default: Date.now},
    seen: {type: Boolean, default: false},
    ip: {type: String},
    issueType: {type: Number}
});

function sendNoti(userId, data){
    Device.findByUser(userId, function(devices){
        if(devices){
            var pushNoti = new pushHook();
            var collapseKey = '1';
            pushNoti.pushd(devices, collapseKey, data, function(status, data){
                console.log('Backend: %j, %j', status, data);
            });
        }
    });
}

IssueSchema.pre('save', function(next){
    var self = this;
    if(this.isModified('assigned')){
        if(this.assigned) {
            var url = '/helpdesk/issue_details/' + this._id;
            var content = 'Bạn đã được gán vào issue: ['+ this.name +']';

            mongoose.models["HelpDeskIssue"].findById(this._id, function(e,r){
                if (!e && r) {
                    var _ = require('underscore');
                    var newAssigned = _.difference(self.assigned, r.assigned);
                    if (newAssigned.length > 0) {
                        newAssigned.forEach(function(admin){
                            HelpDeskPerformance.updatePerformance(admin, moment().year(), moment().month(), 'assigned');
                            BackendNotification.addNew(admin, 'issue', content, url, function(err, result){
                                if (!err) io.emit(room + result.user, JSON.stringify({type:"helpdesk_issue", url: result.url}));
                            });
                        });
                    }
                }
            });
        }
    }

    this.last_update = new Date();
    next();
});

IssueSchema.statics = {
    //type_of_user is 'free' or 'paid'
    newIssue: function(info, callback){
        var issue = new this();
        issue.name = info.name;
        issue.user = info.user;
        issue.report_date = new Date();

        if (info.issueType) issue.issueType = info.issueType;
        if (info.ip) issue.ip = info.ip;
        if (info.metadata) issue.metadata = info.metadata;
        if (info.assigned) issue.assigned = info.assigned;

        issue.save(callback);
    },

    updateIssue: function(issue_id, changes, callback){
        //this.update({_id: issue_id}, changes, callback);
        //this.findOneAndUpdate({_id: issue_id}, changes, callback);
        this.findById(issue_id, function(err, issue){
            if(changes.metadata) issue.metadata = changes.metadata;
            if(changes.status) {
                if(!issue.status && changes.status == 'Resolved' && changes.assigned){
                    //update helpdesk start
                    HelpDeskIssueStats.updateRecord(moment().year(), moment().month(), 'solved');
                    HelpDeskPerformance.updatePerformance(changes.assigned, moment().year(), moment().month(), 'solved');

                    //send notification to close issue at client
                    //var content = {ac: 15, iid: issue._id};
                    //sendNoti(issue.user, content);

                }
                issue.status = changes.status;
            } else {
                if (issue.status) issue.status = null;
            }
            if(changes.assigned) issue.assigned = changes.assigned;
            if(changes.tags) issue.tags = changes.tags;
            if(changes.note) issue.note = changes.note;
            if(changes.seen) issue.seen = changes.seen;
            issue.save(callback);
        });
    },

    deleteIssue: function(issue_id, callback){
        this.findByIdAndRemove(issue_id, callback);
    },

    findAll: function(type_of_user, os, skip, limit, sort, callback){
        var sortQuery = {status: 1};
        if (sort == 'oldest') sortQuery.report_date = 1;
        else sortQuery.report_date = -1;

        var query = {};
        if(type_of_user === 'paid') {
            query = { "metadata.p" : true };
        } else {
            query = { $or: [ {"metadata.p":false},{"metadata.p":{$ne: true}} ] };
        }

        if(os) query['metadata.os'] = os;

        this.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('user','_id email acceptSync purchased')
            .populate('assigned', '_id username')
            .lean()
            .exec(callback);
    },

    findAllNew: function(type_of_user, os, skip, limit, sort, callback){
        var sortQuery = (sort == 'oldest')? 'report_date' : '-report_date';

        var query = {};
        if(type_of_user === 'paid') {
            query = { "metadata.p" : true };
        } else {
            query = { $or: [ {"metadata.p":false},{"metadata.p":{$ne: true}} ] };
        }

        this.find({$and: [{status: null, assigned: null}, query]})
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('user','_id email acceptSync purchased')
            .populate('assigned', '_id username')
            .lean()
            .exec(callback);
    },

    findOpenByAdmin: function(type_of_user, os, admin_id, skip, limit, sort, callback){
        var sortQuery = (sort == 'oldest')? 'report_date' : '-report_date';

        var query = {};
        if(type_of_user === 'paid') {
            query = { "metadata.p" : true };
        } else {
            query = { $or: [ {"metadata.p":false},{"metadata.p":{$ne: true}} ] };
        }
        query.assigned = admin_id;
        query.status = null;
        if(os) query['metadata.os'] = os;

        this.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('assigned', '_id username')
            .populate('user', '_id email acceptSync purchased')
            .lean()
            .exec(callback);
    },

    findClosedByAdmin: function(type_of_user, os, admin_id, skip, limit, sort, callback){
        var sortQuery = (sort == 'oldest')? 'report_date' : '-report_date';

        var query = {};
        if(type_of_user === 'paid') {
            query = { "metadata.p" : true };
        } else {
            query = { $or: [ {"metadata.p":false},{"metadata.p":{$ne: true}} ] };
        }
        query.assigned = admin_id;
        query.status = {$ne: null};
        if(os) query['metadata.os'] = os;

        this.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('user', '_id email acceptSync purchased')
            .populate('assigned', '_id username')
            .lean()
            .exec(callback);
    },

    findByTag: function(type_of_user, array_tags, sort, callback){
        var sortQuery = (sort == 'oldest')? 'report_date' : '-report_date';

        //callback includes error (boolean) & array(object)
        if(array_tags instanceof Array){
            var query = {};
            if(type_of_user === 'paid') {
                query = { "metadata.p" : true };
            } else {
                query = { $or: [ {"metadata.p":false},{"metadata.p":{$ne: true}} ] };
            }
            query.tags = {$in: array_tags};
            this.find(query)
                .sort(sortQuery)
                .populate('user', '_id email acceptSync purchased')
                .populate('assigned', '_id username')
                .lean()
                .exec(callback);
        } else callback(true);
    },

    findClosed: function(type_of_user, os, skip, limit, sort, callback){
        var sortQuery = (sort == 'oldest')? 'report_date' : '-report_date';

        var query = {};
        if(type_of_user === 'paid') {
            query = { "metadata.p" : true };
        } else {
            query = { $or: [ {"metadata.p":false},{"metadata.p":{$ne: true}} ] };
        }

        query.status = {$ne: null};
        if(os) query['metadata.os'] = os;

        this.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('user','_id email acceptSync purchased')
            .populate('assigned', '_id username')
            .lean()
            .exec(callback);
    },

    findByUser: function(userId, skip, limit, callback){
        this.find({user: userId})
            .sort({report_date: -1})
            .skip(skip)
            .limit(limit)
            .populate('user','_id email acceptSync purchased')
            .populate('assigned', '_id username')
            .lean()
            .exec(callback);
    },

    findByUserPublic: function(userId, skip, limit, callback){
        this.find({user: userId})
            .sort('-report_date')
            .select('_id name user metadata report_date status')
            .skip(skip)
            .limit(limit)
            .exec(callback);
    }
};

mongoose.model('HelpDeskIssue', IssueSchema);
