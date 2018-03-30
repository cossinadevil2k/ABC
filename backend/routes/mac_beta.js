var env = process.env.NODE_ENV;
var config = require('../../config/config')[env];
var fs = require('fs');
var uploadDir = config.root + '/landing-page/source/mac';

var updateVersion = function(req, res){
    var macInfo = req.body;

    macInfo.status = parseInt(macInfo.status);
    macInfo.code = parseInt(macInfo.code);

    fs.writeFile(uploadDir + '/version.json', JSON.stringify(macInfo), {flag: 'w+'}, function(err){
        res.json({s: !err});
    });
};

var getVersion = function(req, res){
    fs.readFile(uploadDir + '/version.json', function(err, data){
        if(err && err.code == 'ENOENT') res.json({s: false});
        else {
            var d = data.toString();
            res.json({s: true, d: JSON.parse(d)});
        }
    })
};
module.exports = function(app, config){
    app.get('/mac-beta', staticsMain);
    app.post('/mac-beta/update-version', updateVersion);
    app.get('/mac-beta/get-version', getVersion);
};
