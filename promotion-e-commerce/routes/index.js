'use strict';

var moment = require('moment');

module.exports = function(app, config){
    app.get('/404', function(req, res){
		res.render('404');
	});

    app.get('/', function(req, res){
        res.render('index');
    });

    app.get('/detail', function(req, res){
        res.render('promotionDetail');
    });

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

}
