var ua = require('ua-parser');

var env = process.env.NODE_ENV;
var page = 'index';

if(env === 'production'){
    page = 'build';
}

var appHome = function(req, res) {
    var userAgent = req.headers['user-agent'];

    if (!checkBrowser(userAgent)){
        return res.redirect('/browser-not-support');
    }

    res.render('index', { title: 'Express' });
};

var checkBrowser = function(userAgent){
    var browser = ua.parseUA(userAgent).toString().toLowerCase();

    return !(browser.indexOf('chrome') === -1 && browser.indexOf('chromium') === -1);
};

module.exports = function(app){
    app.get('*', appHome);
};
