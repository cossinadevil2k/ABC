/*
	Merge Language
*/

var fs = require('fs');
var _dir = require('path').normalize(__dirname) + '/lang';

var readname = function(dir){
	var newDir = dir.split('/lang/');
	var tmpUrl = newDir[0] + '/lang/' + newDir[1].split('/')[0].replace('-', '_') + '.json';
	return tmpUrl;
};

function getFiles(dir) {
	fs.readdir(dir, function(err, files){
		files.forEach(function(file, i){
			var name = dir + '/' + file;
			if (fs.statSync(name).isDirectory()) {
				getFiles(name);
			} else {
				var data = fs.readFileSync(name);
				fs.writeFile(readname(name), data.toString().trim(), {flag: 'a+'}, function(){
					// console.log('Save: ' + readname(name));
				});
			}
		});
	});
}

getFiles(_dir);