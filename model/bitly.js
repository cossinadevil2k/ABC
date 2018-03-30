/*
	Bitly
	Short link
*/

var Bitly = require('bitly');
var bitly = new Bitly('moneyloverapp', 'R_e4cc9cc7828a48b2b2f7a60e5bc282d0');

var shortlink = function(url, callback){
	bitly.shorten(url, function(err, response) {
		if(err || !response) callback(url);
		else callback(response.data.url);
	});
};

exports.shortlink = shortlink;