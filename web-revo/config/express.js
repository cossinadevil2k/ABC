/**
 * Express config
 */
var path = require('path');
var express = require('express');

var config = require('./index');
var routes = require('../routes');

const AppRoot = path.resolve(__dirname, '../');
const ViewPath = `${AppRoot}/views/revo`;

const hbs = require('express-hbs');
const ErrorHandler = require('errorhandler');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const multer = require('multer');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var csrf = require('csurf');

module.exports = function (App) {

	App.locals.buildCode = config.buildCode;
	App.set('port', config.port);
	App.set('mode', config.name);
	App.set('trust proxy', 1);
	App.disable('x-powered-by');
	App.disable('view cache'); // enable
	App.set('jsonp callback name', config.jsonp_callback);

	if (config.name !== 'Production') {
		App.use(morgan('dev'));
	}

	// Config view engine
	App.engine('hbs', hbs.express4({
		layoutsDir: `${ViewPath}/layouts`,
		partialsDir: `${ViewPath}/partials`,
		defaultLayout: `${ViewPath}/layouts/default.hbs`
	}));
	App.set('view engine', 'hbs');
	App.set('views', `${ViewPath}/content`);

	App.use(methodOverride());
	App.use(bodyParser.json());
	App.use(bodyParser.urlencoded({extended: true}));

	App.use(cookieParser(config.secret));

	App.use(session({
		name: 'ml.ss',
		store: new RedisStore(config.redis),
		secret: config.secret,
		resave: false,
		saveUninitialized: true,
		cookie: {
			path: '/',
			httpOnly: true,
			secure: false,
			maxAge: (24 * 3600 * 1000)
		}
	}));
	//App.use(session({
	//    key: 'ml.ss',
	//    store: new RedisStore(config.redis),
	//    secret: config.secret,
	//    resave: false,
	//    saveUninitialized: false,
	//    rolling: true,
	//    cookie: {
	//        secure: true
	//    }
	//}));

	App.use(csrf({
		cookie: {
			key: 'ml.cs',
			path: '/'
		},
		ignoreMethods: ['GET', 'POST'],
		jsonp_callback: config.jsonp_callback
	}));

	// static folder
	App.use(express.static(`${AppRoot}/public`));
	App.use('/assets', express.static(`${AppRoot}/public/assets`));

	App.use(function (err, req, res, next) {
		if (err.code !== 'EBADCSRFTOKEN') return next(err);
		//console.log('Invalid');
	});

	// error handler
	App.use(ErrorHandler());

	routes(App);
};
