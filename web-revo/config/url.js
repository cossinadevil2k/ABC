/**
 * Url
 */

const URL = {
	logout: '/logout',
	login: '/token',
	forgotPassword: '/forgot-password',
	facebookLogin: '/facebook-login',
	googleLogin: '/google-login',
	register: '/register',
	facebookRegister: '/facebook-register',
	googleRegister: '/google-register',
	linkWithFacebook: '/link-with-facebook',
	linkWithGoogle: '/link-with-google',
	secret: '/secret',
	active: '/active',
	accountPull: '/sync/account/pull',
	accountPush: '/sync/account/push',
	transactionPull: '/sync/transaction/pull',
	transactionPush: '/sync/transaction/push',
	categoryPull: '/sync/category/pull',
	categoryPush: '/sync/category/push',
	static: 'https://static.moneylover.me'
};

module.exports = URL;