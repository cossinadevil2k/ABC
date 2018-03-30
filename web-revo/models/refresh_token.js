/**
 * Refresh token
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var refreshTokenSchema = new Schema({
	clientId: {type: ObjectId, ref: 'Client'},
	userId: {type: ObjectId, ref: 'User'},
	key: {type: String, index: true},
	active: {type: Boolean, default: true}
}, {
	timestamps: {
		createdAt: 'createdAt',
		updateAt: 'updateAt'
	}
});

refreshTokenSchema.methods.validInfo = function (clientId, userId) {
	this.clientId = this.clientId.toString();
	this.userId = this.userId.toString();

	return (this.clientId == clientId && this.userId == userId);
};

refreshTokenSchema.statics.addKey = function (key, clientId, userId, callback) {
	var refreshToken = new this({
		key: key,
		clientId: clientId,
		userId: userId
	});

	refreshToken.save(callback);
};

refreshTokenSchema.statics.findByKey = function (key, callback) {
	this.findOne({key: key}, callback);
};

refreshTokenSchema.statics.deleteKey = function (key, callback) {
	this.remove({key: key}, callback);
};

mongoose.model('RefreshToken', refreshTokenSchema);