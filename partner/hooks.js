/*
 Config
 */
'use strict';

module.exports = {
	authenticate: function(req, res, next){
		res.locals.session = req.session;
		var currentUrl = req.url;
		var partnerId = req.session.partnerId;
		var partnerEmail = req.session.partnerEmail;
		var isLoginPage = currentUrl.indexOf('/login') >= 0;

		if (currentUrl.indexOf('/libs/') >= 0 ||
			currentUrl.indexOf('/css/') >= 0 ||
			currentUrl.indexOf('/images/') >= 0 ||
			currentUrl.indexOf('/js/') >= 0 ||
			currentUrl.indexOf('/partials/') >= 0
		) {
			next();
		} else {
			if (partnerId && partnerEmail) {
				if (isLoginPage) {
					let i = currentUrl.indexOf('url=');
					
					if (i != -1) {
						res.redirect(currentUrl.slice(i + 4));
					} else {
						res.redirect('/');
					}
				} else {
					next();
				}
			} else {
				if (!isLoginPage) {
					if (currentUrl == '/') {
						res.redirect('/login');
					} else {
						res.redirect('/login?url=' + currentUrl);
					}
				} else {
					next();
				}
			}
		}
	}
};
