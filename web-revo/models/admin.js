/*
	Admin model
*/

var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;
var ObjectId	= Schema.ObjectId;
var async		= require('async');
var crypto		= require('crypto');
var utils       = require('../helper/utils');

var AdminSchema = new Schema({
	username: {type: String, required: true, trim: true, lowercase: true, index: true},
	hash_password: {type: String, trim: true, required: true},
	salt: {type: String, trim: true, required: true},
	createdAt: { type: Date, default: Date.now },
	updateAt: { type: Date, default: Date.now },
	lastLogin: { type: Date, default: Date.now },
	isAdminSystem: {type: Boolean, default: false},
	gcmChannel: {type: String},
	role: {type:[{type: String, enum:['Finsify','iOS','Android','Windows','Web/Backend','Concept', 'Biz', 'Support']}], index: true}
});

AdminSchema.pre('save', function(next){
	this.updateAt = new Date();
	next();
});

AdminSchema.methods = {
	authenticate: function(password) {
		var hash = crypto.createHash('md5').update(password + this.salt).digest("hex");
		return hash === this.hash_password;
	},

	encryptPassword: function(password, salt) {
		if (!password) return '';
		var hash = crypto.createHash('md5').update(password + salt).digest("hex");
		return hash;
	},

	//allowAccess: function(role) {
	//	if (this.role == 'Admin') return true;
	//	if (role == 'Developer' && this.role == 'Developer') return true;
	//	if (role == 'User' && (this.role == 'User' || this.role == 'Developer')) return true;
	//	return false;
	//},
	updateLastLogin: function(){
		this.lastLogin = new Date();
		this.save();
	}
};

AdminSchema.statics = {
	checkExist: function(username, callback){
		this.findOne({username: username}, function(err, user){
			callback(!user);
		});
	},
	addAdmin: function(data, callback){
        var salt = utils.uid(5);
		var admin = new this();
		admin.username = data.username;
		admin.salt = salt;
		admin.hash_password = admin.encryptPassword(data.password, salt);
        admin.isAdminSystem = data.isAdminSystem || false;
		if (data.role) admin.role = data.role;
		admin.save(function(err){
			if(err) callback(false);
			else callback(admin);
		});
	},
	changePassword: function(admin, new_password, callback){
		admin.hash_password = admin.encryptPassword(new_password, admin.salt);
		admin.save(function(err){
			if(err) callback(false);
			else callback(admin);
		});
	},
	deleteAdmin: function(_id, callback){
		this.remove({_id: _id}, function(err){
			callback(!err);
		});
	},
	findAdmin: function(query, select, callback){
		this.findOne(query, select, callback);
	},
	findAdmins: function(query, select, callback){
		this.find(query, select, callback);
	},
	setSession: function(req, id, username, isAdminSystem){
		req.session.adminId = id;
		req.session.adminName = username;
        req.session.adminSystem = isAdminSystem || false;
		return true;
	},
	removeSession: function(req){
		req.session.adminId = undefined;
		req.session.adminName = undefined;
		req.session.adminSystem = undefined;
		return true;
	},
	editAdmin: function(id, update, callback){
		this.findByIdAndUpdate(id, update, callback);
	},
	findByRole: function(role, callback){
		this.find({role: {$in: role}}, callback);
	}
};

mongoose.model('Administrator', AdminSchema);
