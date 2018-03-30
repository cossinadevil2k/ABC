/*
	Index
*/

module.exports = function(app, config) {
	require('./home')(app, config);
	require('./dashboard')(app, config);
	require('./user')(app, config);
	require('./info')(app, config);
	require('./partner_notification')(app, config);
	require('./promotion')(app, config);
	require('./loan')(app, config);
	require('./action')(app, config);
	app.get('/', staticsMain);

	app.use(function(req, res, next) {
		res.status(404);
		if (req.accepts('html')) {
			res.redirect('/404');
			return;
		}
		if (req.accepts('json')) {
			res.send({ error: 'Not found' });
			return;
		}
		res.type('txt').send('Not found');
	});
};
