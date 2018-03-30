/**
 * Error
 */

module.exports = function (err, req, res, next) {
	if (err.status === 404) res.status(404).send({s: false, e: 'Hình như bạn đi lộn đường...'});
	else {
		console.log(err);

		if (!err || !(err instanceof Error)) {
			next();
		} else {
			res.status(500).send(err);
		}
	}
};