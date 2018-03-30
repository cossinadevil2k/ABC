/**
 * App
 */

var App = require('express')();
//var Server = require('http').Server(App);

require('./config/mongodb');
require('./config/redis');
require('./config/express')(App);

console.log(__dirname);

App.listen(App.get('port'), function () {
	console.log('Mode: %s.', App.get('mode'));
	console.log('App run on: %d.', App.get('port'));
});