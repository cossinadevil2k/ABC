/**
 * Routes
 * @param App
 */

module.exports = function (App) {
	// Middleware
	App.use(function (req, res, next) {
		if (!req.session.id) req.session.id = req.sessionID;

		if (req.session.userId) {
			req.session.touch();
		}

		next();
	});

	// Routing
	App.use('/download', require('./download'));

	App.use('/', require('./main'));
	App.use('/api/user', require('./user'));
	App.use('/api/wallet', require('./wallet'));
	App.use('/api/category', require('./category'));
	App.use('/api/transaction', require('./transaction'));
	App.use('/api/icon', require('./icon'));
	App.use('/api/event', require('./event'));
	App.use('/api/linked', require('./linked'));

	// Error handling
	App.use(require('./error'));
};
