var checkLogin = function(req, res, next){
    var currentUrl = req.url;
    var isLoginPage = currentUrl.indexOf('/login') >= 0;

    if (!req.session.userId) {
        if(!isLoginPage) {
            if (currentUrl == '/') res.redirect('/login');
            else res.redirect('/login?url=' + currentUrl);
        } else {
            next();
        }
    } else {
        if (isLoginPage) {
            var i = currentUrl.indexOf('url=');
            if (i != -1) res.redirect(currentUrl.slice(i + 4));
            else res.redirect('/');
        } else {
            next();
        }
    }
};

var getFAQ = function(req, res){
    var currentUrl = req.url;
    
};

module.exports = function(app, config){
    require('./home')(app, config);
    require('./helpdesk')(app, config);

    app.get('/', function(req, res){
        res.render('index' , {userId: req.session.userId, userEmail: req.session.userEmail});
    });

    app.get('/faq', getFAQ);

    app.get('/send-issue', checkLogin, function(req, res){
        res.render('sendIssue');
    });
    app.get('/all-issue', checkLogin, function(req, res){
        res.render('allIssue');
    });
    app.get('/login', checkLogin, function(req, res){
        res.render('login');
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
};
