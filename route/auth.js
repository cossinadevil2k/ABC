/**
 * Auth
 */

var requestToken = function (req, res, next) {
	console.log('OK');
};


module.exports = function (server, config) {
	server.post('/auth/token', requestToken);
	server.post('/auth/request-token', requestToken);
	server.post('/auth/refresh-token', requestToken);
};