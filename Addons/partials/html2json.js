/*
	Convert html to JSON
*/

var fs = require('fs');

function getFiles(dir) {
	fs.readdir(dir, function(err, files){
		files.forEach(function(file, i){
			var name = dir + '/' + file;
			if (fs.statSync(name).isDirectory()) {
				getFiles(name);
			} else {
				var data = fs.readFileSync(name);
				var newData = {contents: data.toString()};
				var contentSave = JSON.stringify(newData);
				contentSave = contentSave.replace(/\{"contents":/g, '').replace(/\"\}/g, '"').trim();
				var saveName = name.replace(/\/home\/project\/moneylover\/app/g, '').replace(/public\/statics\//g, 'partials/').trim();
				var content = "$templateCache.put('"+ saveName + "', " + contentSave + " );\n";
				fs.writeFileSync('/home/project/moneylover/app/content.js', content, {flag: 'a+'});
				// console.log('Save: ' + name);
			}
		});
	});
}

getFiles('/home/project/moneylover/app/public/statics');