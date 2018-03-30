/*
	Invited
*/

var mongoose = require('mongoose');
var invitedSchema = mongoose.model('Invited');
var User = mongoose.model('User');

function checkServerMaintainLoginRequired(res){
	if (global.isServerMaintain){
		return res.send({s: false, e: Error.SYNC_SERVER_MAINTAINCE});
	}
}

function checkServerMaintain(res){
	if (global.isServerMaintain){
		return res.send({status: false, message: Error.SYNC_SERVER_MAINTAINCE});
	}
}

var RESOURCES = Object.freeze({
	REGISTER: '/invited/register',
});

function register(obj, cb, User){
	invitedSchema.invite(obj, cb, User);
}

function validatorData(obj){
	return (obj.owner && obj.reason && obj.platform);
}

/**
	# Server function
	@url: '/invited/register'
	@input:
		userId: User Id (req.user_id)
		r (String): Reason (req.body.r);
		p (Number): Platform(req.body.p);
			- Value:
				- 1: Android
				- 2: iOS
				- 3: Winphone
	@response: Object
		{status: true/false}
**/
var appRegister = function(req, res){
	checkServerMaintain(res);

	var userId = req.user_id;
	var postData = req.body;

	if(!userId) res.send({status: false, message: 213});
	else if(!postData) res.send({status: false, message: 202});
	else {
		var obj = {
			owner: userId,
			reason: postData.r,
			platform: postData.p
		};

		if(validatorData(obj)){
			register(obj, function(data){
				res.send(data);
			}, User);
		} else res.send({status: false, message: 214, msg: 'Obj error'});
	}
};

module.exports = function(server, config){
	server.post(RESOURCES.REGISTER, appRegister);
};