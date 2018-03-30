/*
	Invited
*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var Email = require('./email');

var invitedSchema = new Schema({
	owner: {type: ObjectId, ref: 'User', index: true},
	reason: {type: String, trim: true},
	platform: {type: Number, default: 0, index: true},
	createdDate: {type: Date, default:  Date.now, index: true},
	acceptDate: {type: Date, index: true},
	status: {type: Number, default: 0, index: true} // 1: Accept, 2.
});

var sendMailInvited = function(User, userId){
	User.findOne({_id: userId}, function(err, user){
		if(user) Email.receivedSync(user, function(status, data){

		});
	});
};

invitedSchema.statics = {
	invite: function(obj, cb, User){
		var that = this;
		this.findOne({owner: obj.owner}, function(err, invited){
			if(invited){
				invited.reason = obj.reason;
				invited.save(function(err){
					if(err) {

						cb({s: false, e: 215});
					} else cb({s: true});
				});
			} else {
				var invited = new that(obj);
				invited.save(function(err){
					if(err) {
						cb({s: false, e: 215});
					} else {
						cb({s: true});
						sendMailInvited(User, obj.owner);
					}
				});
			}
		});
	},
	acceptUser: function(invId, status, cb){
		this.update({_id: invId}, {status: status, acceptDate: new Date()}, function(err, status){
			if(err) cb(false);
			else cb(status);
		});
	}
};

mongoose.model('Invited', invitedSchema);
