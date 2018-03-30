/**
 * Config
 */

const mode = process.env.NODE_ENV || 'development';
const url = require('./url');
const path = require('path');
const dir_root = path.resolve(__dirname, '../../');

const config = {
	production: {
		name: 'Production',
		buildCode: 'c797463b0058f60b2ecf',
		root: dir_root,
		web_url: 'https://web.moneylover.me',
		version: '1.0.0-rc.5',
		port: 9990,
		jsonp_callback: 'json_callback',
		appApi: {
			key: 'MRVsdH2QoSyc',
			secret: 'VqPgZq9F7j29NeDLycNGlHWjEqL7Uj'
		},
		facebook: {
			id: 186738618063436,
			secret: '50046d694a8634b907aaf354d06e61b8'
		},
		google: {
			CLIENT_ID: '514675266566-n1jsvgb1ueu82fkvf2iem3rjqj4tu543.apps.googleusercontent.com',
			CLIENT_SECRET: 'vUYG9209EVzQoJFqZysBmGmX',
			REDIRECT_URL: 'https://web.moneylover.me/googlecallback'
		},
		finsify: {
			clientId: 'Tu5dvG07KVpx6b',
			serviceSecret: '75167f66-22dc-415d-b799-c0dd73b951ca',
			apiUrl: 'https://zero.finsify.com/api',
			webhook: 'https://hook.moneylover.me/finsify/notify'
		},
		url: Object.assign({base: 'https://api.moneylover.me'}, url),
		apiVersion: 999,
		platform: 8,
		aid: 8,
		secret: '0f209baa-5ee5-4a87-a8dd-9eb2f2de0ae4',
		mongodb: 'mongodb://moneyloverReadWrite:m0n3yisall@money-db:27017/moneylover',

		redis: {
			host: 'redis-msq',
			port: 6382,
			//socket: '/tmp/redis_6379.sock',
			//url: 'redis://',
			ttl: 86400,
			db: 8,
			//pass: '',
			prefix: 'ml:ss:'
		},
		socket: {
			host: 'redis-msq',
			port: 6382
		},
		layoutDefault: 'default'
	},
	beta: {
		name: 'Beta',
		buildCode: 'beta',
		root: dir_root,
		web_url: 'https://revo.moneylover.me',
		version: '0.0.1',
		port: 8081,
		jsonp_callback: 'json_callback',
		appApi: {
			key: 'MRVsdH2QoSyc',
			secret: 'VqPgZq9F7j29NeDLycNGlHWjEqL7Uj'
		},
		facebook: {
			id: 186738618063436,
			secret: '50046d694a8634b907aaf354d06e61b8'
		},
		google: {
			CLIENT_ID: '514675266566-n1jsvgb1ueu82fkvf2iem3rjqj4tu543.apps.googleusercontent.com',
			CLIENT_SECRET: 'vUYG9209EVzQoJFqZysBmGmX',
			REDIRECT_URL: 'https://revo.moneylover.me/googlecallback'
		},
		finsify: {
			clientId: 'Tu5dvG07KVpx6b',
			serviceSecret: '75167f66-22dc-415d-b799-c0dd73b951ca',
			apiUrl: 'https://zero.finsify.com/api',
			webhook: 'https://thook.moneylover.me/finsify/notify'
		},
		url: Object.assign({base: 'https://api.moneylover.me'}, url),
		apiVersion: 999,
		platform: 8,
		aid: 8,
		secret: '0f209baa-5ee5-4a87-a8dd-9eb2f2de0ae4',
		mongodb: 'mongodb://money-db:27017/moneylover',

		redis: {
			host: 'redis-msq',
			port: 6382,
			//socket: '/tmp/redis_6379.sock',
			//url: 'redis://',
			ttl: 3600,
			db: 8,
			//pass: '',
			prefix: 'ml:ss:'
		},
		layoutDefault: 'default-beta'
	},
	development: {
		name: 'Development',
		buildCode: 'dev',
		root: dir_root,
		web_url: 'http://revo.moneylover.me',
		version: '1.0.0-rc',
		port: 8080,
		jsonp_callback: 'json_callback',
		appApi: {
			key: 'MRVsdH2QoSyc',
			secret: 'VqPgZq9F7j29NeDLycNGlHWjEqL7Uj'
		},
		facebook: {
			id: 954186594651964,
			secret: 'c73f4778e0a336c84b09136f144b1d26'
		},
		google: {
			CLIENT_ID: '514675266566-n1jsvgb1ueu82fkvf2iem3rjqj4tu543.apps.googleusercontent.com',
			CLIENT_SECRET: 'vUYG9209EVzQoJFqZysBmGmX',
			REDIRECT_URL: 'http://revo.moneylover.me/googlecallback'
		},
		finsify: {
			clientId: 'Tu5dvG07KVpx6b',
			serviceSecret: '75167f66-22dc-415d-b799-c0dd73b951ca',
			apiUrl: 'https://zero.finsify.com/api',
			webhook: 'https://thook.moneylover.me/finsify/notify'
		},
		url: Object.assign({base: 'http://revo.moneylover.me'}, url),
		apiVersion: 999,
		platform: 8,
		aid: 8,
		secret: '567ac684-0ff6-4e80-a592-abc827621637',
		mongodb: 'mongodb://money-db:27017/moneyloverDev',

		redis: {
			host: 'redis-msq',
			port: 6384,
			//socket: '/tmp/redis_6379.sock',
			//url: 'redis://',
			ttl: 3600,
			db: 9,
			//pass: '',
			prefix: 'ml:ss:'
		},
		socket: {
			host: 'redis-msq',
			port: 6382
		},
		layoutDefault: 'default-dev'
	},
	dev: {
		name: 'Development',
		buildCode: 'dev',
		root: dir_root,
		web_url: 'http://revo.moneylover.me',
		version: '1.0.0-rc',
		port: 9990,
		jsonp_callback: 'json_callback',
		appApi: {
			key: 'MRVsdH2QoSyc',
			secret: 'VqPgZq9F7j29NeDLycNGlHWjEqL7Uj'
		},
		facebook: {
			id: 954186594651964,
			secret: 'c73f4778e0a336c84b09136f144b1d26'
		},
		google: {
			CLIENT_ID: '514675266566-n1jsvgb1ueu82fkvf2iem3rjqj4tu543.apps.googleusercontent.com',
			CLIENT_SECRET: 'vUYG9209EVzQoJFqZysBmGmX',
			REDIRECT_URL: 'http://revo.moneylover.me/googlecallback'
		},
		finsify: {
			clientId: 'Tu5dvG07KVpx6b',
			serviceSecret: '75167f66-22dc-415d-b799-c0dd73b951ca',
			apiUrl: 'https://zero.finsify.com/api',
			webhook: 'https://thook.moneylover.me/finsify/notify'
		},
		url: Object.assign({base: 'http://revo.moneylover.me'}, url),
		apiVersion: 999,
		platform: 8,
		aid: 8,
		secret: '567ac684-0ff6-4e80-a592-abc827621637',
		mongodb: 'mongodb://moneyloverDevReadWrite:7337610@money-db:27017/moneyloverDev',

		redis: {
			host: 'redis-msq',
			port: 6384,
			//socket: '/tmp/redis_6379.sock',
			//url: 'redis://',
			ttl: 3600,
			db: 9,
			//pass: '',
			prefix: 'ml:ss:'
		},

		socket: {
			host: 'redis-msq',
			port: 6382
		},
		layoutDefault: 'default-dev'
	},
	local: {
		name: 'Local',
		buildCode: 'dev',
		root: dir_root,
		web_url: 'http://wrevo.me',
		version: '1.0.0-rc',
		port: 8080,
		jsonp_callback: 'json_callback',
		appApi: {
			key: 'MRVsdH2QoSyc',
			secret: 'VqPgZq9F7j29NeDLycNGlHWjEqL7Uj'
		},
		facebook: {
			id: 954186594651964,
			secret: 'c73f4778e0a336c84b09136f144b1d26'
		},
		google: {
			CLIENT_ID: '514675266566-n1jsvgb1ueu82fkvf2iem3rjqj4tu543.apps.googleusercontent.com',
			CLIENT_SECRET: 'vUYG9209EVzQoJFqZysBmGmX',
			REDIRECT_URL: 'http://revo.moneylover.me/googlecallback'
		},
		finsify: {
			clientId: 'Tu5dvG07KVpx6b',
			serviceSecret: '75167f66-22dc-415d-b799-c0dd73b951ca',
			apiUrl: 'https://zero.finsify.com/api',
			webhook: 'https://thook.moneylover.me/finsify/notify'
		},
		url: Object.assign({base: 'http://revo.moneylover.me'}, url),
		apiVersion: 999,
		platform: 8,
		aid: 8,
		secret: '567ac684-0ff6-4e80-a592-abc827621637',
		mongodb: 'mongodb://money-db:27017/moneyloverDev',

		redis: {
			host: 'redis-msq',
			port: 6379,
			//socket: '/tmp/redis_6379.sock',
			//url: 'redis://',
			ttl: 3600,
			db: 9,
			//pass: '',
			prefix: 'ml:ss:'
		},
		socket: {
			host: 'redis-msq',
			port: 6379,
		},
		layoutDefault: 'default-dev'
	}
};
module.exports = config[mode];
