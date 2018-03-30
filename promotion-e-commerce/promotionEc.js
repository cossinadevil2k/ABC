'use strict';

var env = process.env.NODE_ENV;

var express         =   require('express');
var app             =   express();
var	config 			=   require('../config/config')[env];
var projectFolder   =   config.root + '/promotion-e-commerce';
var routes_path	    =   projectFolder + '/routes';

var appFolder = 'promotion-e-commerce';

/*****MIDDLEWARE*****/
app.use(express.static(config.root + '/' + appFolder + '/public'));
app.set('views', config.root + '/' + appFolder + '/views');
app.set('view engine', 'ejs');

/*****IMPORT ROUTER*****/
require(routes_path)(app, config);

app.listen(config.portPromoteEc, function () {
	console.log(`Promotion E Commerce app listening on port ${config.portPromoteEc}!`);
});
