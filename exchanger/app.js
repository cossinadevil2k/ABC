/*
	Get content
	http://openexchangerates.org/api/latest.json?app_id=9494469e45864792aedb71fe6e6b008d
*/
var http = require('http'),
	fs = require('fs'),
	express = require('express'),
	path    = require('path'),
	options;

var app = express();

app.set('port', 8000);
app.use(express.multipart());
app.use(express.static(path.join(__dirname, 'public')));

app.all('/upfile', function(req, res){
	if(req.method == 'GET'){
		res.send('<form method="post" enctype="multipart/form-data" action="/upfile"><input type="file" name="file"><input type="submit" value="Submit"></form>');
	} else if(req.method == 'POST'){
		var file = req.files.file;
		if(file){
			fs.readFile(file.path, function (err, data) {
				if(data){
					var fileSave = '/home/cuongle/Project/moneylover/landing-page/source/' + file.name;
					fs.writeFile(fileSave, data, {flag: 'w+'}, function(err) {
						res.send('Success. URL: <a href="http://moneylover.me/source/' + file.name + '">http://moneylover.me/source/' + file.name + '</a>');
					});
				} else {
					res.send(err);
				}
			});
		} else {
			res.send('No file');
		}
	} else {
		res.send('No method');
	}
});

app.get('/list', function(req, res){
	fs.readdir('/home/cuongle/Project/moneylover/landing-page/source/', function(err, files){
		if(!files) res.send('Error!');
		else res.send(files);
	});
});

app.all('*', function(req, res){
	res.end();
});

http.createServer(app).listen(app.get('port'), function(){
	console.log('Exchanger server listening on port ' + app.get('port'));
});
