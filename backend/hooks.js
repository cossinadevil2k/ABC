/*
 Config
 */

module.exports = {
	authenticate: function(req, res, next){
		res.locals.session = req.session;
		var currentUrl = req.url;
		var adminId = req.session.adminId;
		var adminName = req.session.adminId;
		var isLoginPage = currentUrl.indexOf('/login') >= 0;

		if (currentUrl.indexOf('/location/') >= 0 ||
			currentUrl.indexOf('/stats/count?') >= 0 ||
			currentUrl.indexOf('/libs/') >= 0 ||
			currentUrl.indexOf('/css/') >= 0 ||
			currentUrl.indexOf('/images/') >= 0 ||
			currentUrl.indexOf('/js/') >= 0 ||
			currentUrl.indexOf('/partials/') >= 0 ||
			currentUrl.indexOf('/jsonp/') >= 0 ||
			currentUrl.indexOf('/static/') >= 0 ||
			currentUrl.indexOf('/redeem/submit') >= 0
		) {
			next();
		} else {
			if(adminId && adminName) {
				if (isLoginPage) {
					var i = currentUrl.indexOf('url=');
					if (i != -1) res.redirect(currentUrl.slice(i + 4));
					else res.redirect('/');
				} else next();
			} else {
				if(!isLoginPage) {
					if (currentUrl == '/') res.redirect('/login');
					else res.redirect('/login?url=' + currentUrl);
				}
				else next();
			}
		}
	}
};