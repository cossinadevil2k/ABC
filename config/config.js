/**
 * Environment dependent configuration properties
 */


/* Finsify */

var finsifyDevBaseUrl = 'https://sandbox.zoostd.com/v2';
var clientFinsifySandBox = 'sE5dve74KVpx6k';
var secretFinsifySandBox = 'abcb1387-4d9a-4c79-aa1f-571802e8c59a';
var hookFinsifyDevUrl = 'https://thook.moneylover.me';

var finsifyBaseUrl = 'https://api.finsify.com/v2';
var clientFinsify = 'Tu5dvG07KVpx6b';
var secretFinsify = 'abcb1387-4d9a-4c79-aa1f-571802e8c59a';
var hookFinsifyUrl = 'https://hook.moneylover.me';

var urlDevice = {
	AndroidOS: 'https://play.google.com/store/apps/details?id=com.bookmark.money',
	WindowsPhone: 'http://www.windowsphone.com/en-us/store/app/money-lover/abf0e2c8-02e4-437a-be4b-35ce5f384b36',
	iOS: 'https://itunes.apple.com/us/app/money-lover-money-manager/id486312413?mt=8',
	WindowsDesktop: 'http://apps.microsoft.com/windows/app/money-lover/a11919e4-fb38-41cd-8c5a-b3be728d7f31',
	defaults: 'http://moneylover.me'
};

var urlDevice = {
	AndroidOS: 'https://play.google.com/store/apps/details?id=com.bookmark.money',
	WindowsPhone: 'http://www.windowsphone.com/en-us/store/app/money-lover/abf0e2c8-02e4-437a-be4b-35ce5f384b36',
	iOS: 'https://itunes.apple.com/us/app/money-lover-money-manager/id486312413?mt=8',
	WindowsDesktop: 'http://apps.microsoft.com/windows/app/money-lover/a11919e4-fb38-41cd-8c5a-b3be728d7f31',
	defaults: 'http://moneylover.me'
};

var _root = require('path').normalize(__dirname + '/..');

var Notify = {
	delayWhileIdle: true,
	// timeToLive: 60,
	reTries: 5,
	gcmId: 'AIzaSyBZRMskytU6asBJIy5ULmtOOtmC9Lh48ZY',
	apns: {
		gateway: 'gateway.push.apple.com',
		gatewayDev: 'gateway.sandbox.push.apple.com',
		key: _root + '/config/apns/moneyplus_production_key.pem',
		cert: _root + '/config/apns/moneyplus_production_cert.pem',
		keyFree: _root + '/config/apns/moneyfree_production_key.pem',
		certFree: _root + '/config/apns/moneyfree_production_cert.pem',
		keyDev: _root + '/config/apns/MoneyLoverKey2.pem',
		certDev: _root + '/config/apns/MoneyLoverCert2.pem',
		passphrase: '7337610'
	},
	wns: {
		client_id: 'ms-app://s-1-15-2-3933854784-1581073814-3179062630-2263249833-756725367-2539445003-3428552920',
		client_secret: 'Zq//6tbbqmLpsaC8qt7IFMRO+e8J7Clc'
	}
};

module.exports = {
	dev: {
		root: _root,
		app: {
			name: 'Money Lover'
		},
		appBeta: {
			name: 'New MoneyLover Beta'
		},
		appWidget: {
			name: 'Money Lover Widget'
		},
		host: 'localhost',
		port: '8084',
		portHelpdesk: '8002',
		portApp: '8091',
		portAdmin: '8801',
		portAdminNode5: '8869',
		portWidget: '8003',
		portSocket: '8004',
		portFinsifyHook: '8005',
		portKueUI: '8006',
		portPartner: '8007',
		portPromote: '8008',
		portBankin: '8009',
		portPromoteEc: '8010',
		//db_url: 'mongodb://10.240.189.184:27017/moneyloverDev',
		db_url: 'mongodb://moneyloverDevReadWrite:7337610@money-db:27017/moneyloverDev',
		db_log: 'mongodb://devLogReadWrite:n0moneyn0life@money-db:27017/dev-log',
		db_partner: 'mongodb://devPartnerReadWrite:733bay610@money-db:27017/partnerDev',
		db_oauth: 'mongodb://devOauthReadWrite:73babay610@money-db:27017/dev-oauth-money',
		db_urlv3: 'mongodb://10.240.189.184:27017/moneyV3',
		redis_url: null,
		redis: {
			host: 'redis-msg', //10.240.0.4
			port: '6383',
			db: '6',
			kueDb: '7'
		},
		site: {
			urlSocket: '//socket.moneylover.me/',
			urlWidget: '//widget.moneylover.me',
			urlNewApp: '//web.moneylover.me',
			urlHomePage: '//testwebapp.moneylover.me',
			urlStatic: '//testwebapp.moneylover.me/',
			urlStatic2: '//s1.moneylover.me/',
			urlStatic3: '//statictest.moneylover.me/',
			urlPartner: '//devpartner.moneylover.me/'
		},
		session_timeout: 20 * 60 * 10, // defaults to 20 minutes, in ms (20 * 60 * 1000)
		socket_loglevel: '1', // 0 - error, 1 - warn, 2 - info, 3 - debug
		mailSettings: {
			mailFrom: 'contact@moneylover.me',
			mailService: '',
			mailAuth: {
				user: '',
				pass: ''
			},
			sendEmail: false,
			browserPreview: true
		},
		lockLogin: false,
		secret: 'y8MygyK9SB7gEErEUoq9EEdMHEjrkpjEuBEjadAg',
		version: '1.0.0',
		urlDevice: urlDevice,
		isDev: true,
		Notify: Notify,
		deviceConfig: _root + '/config/device.pem',
		privateIconPack: _root + '/app/public/icon_pack/priv_icon_pack_debug.json',
		iconPack: _root + '/app/public/icon_pack/icon_pack_debug.json',
		iconPackPrefix: 'debug_',
		currency: _root + '/app/public/data/currency_dev.json',
		crypto_currency : _root +'/app/public/data/crypto_currency_dev.json',
		bank: _root + '/landing-page/data/bank_dev.json',
		bankUpdateFile: _root + '/landing-page/data/bank_update_time_dev.json',
		mandrillApi: 'yUEZnY9ghB0JqJM8Z0hxAg',
		sparkpostApi: 'b338c0c5f867775ce508d3de8f91313405a45fe0',
		allowFileUpload: ['jpg', 'jpeg'],
		transactionSyncImagePath: _root + '/app/public/data/',
		maxUploadSize: '2000000', // byte
		serverDefaultSetting: [
			{
				key: 'isServerMaintain',
				value: 'false'
			}
		],
		subscriptionProduct: _root + '/app/public/data/subscription_product.json',
		provider_cache: _root + '/app/public/data/rw-provider/provider_cache_dev.json',
		provider_extension_cache: _root + '/app/public/data/rw-provider/provider_extension_cache_dev.json',
		elasticsearch: {
			hostUrl: 'elastic-search:9200'
		},
		maxSyncItem: 150,
		maxPushDeviceWithoutApproval: 100,
		helpdeskAutoMessagesKey: 'helpdesk_auto_messages',
		whatsNewCache: _root + '/app/public/data/whatsnew_dev.json',
		bitly: {
			login: 'o_7t2rcld22h',
			key: 'R_be671c90c5b9b7629e0946384aeeae28'
		},
		forgotPasswordSecret: '0f209baa-5ee5-4a87-a8dd-9eb2f2de0ae4',
		passport: {
			clientId: 'client_id',
			extractJwtOpts: {
				authScheme: 'AuthJWT',
				tokenBodyField: 'access_token',
				tokenQueryParameterName: 'access_token'
			},
			requestTokenEndpoint: '/auth/request-token',
			refreshTokenEndpoint: '/auth/refresh-token',
			tokenEndpoint: '/auth/token',
			ignoreRequestTokenUrl: ['/'],
			secret: '5f2c6556-2483-4254-a0e6-d8aec4069caa',
			accessTokenExpire: 7 * 86400, // 7 days = 7 * 24 * 3600;
			refreshTokenExpire: 10 * 365 * 86400, // 10 year
			requestTokenExpire: 3600 // 1h
		},
		subscriptionExpire: {
			premium: {
				unit: 'days',
				value: 1
			}
		},
		postgres: {
			host: 'localhost',
			port: 5432,
			user: 'user_master',
			password: '12369874',
			database: 'data_warehouse_dev',
			idleTimeoutMillis: 60000,
			acquireConnectionTimeout: 10000
		},
		rabbit: {
			host: 'redis-msg',
			port: 5672,
			user: 'moneylover',
			password: '7337610',
			vhost: 'ml-dev',
			url: 'amqp://moneylover:7337610@redis-msg:5672/ml-dev'
		},
		finsifyBaseUrl: finsifyDevBaseUrl,
		clientFinsify: clientFinsifySandBox,
		secretFinsify: secretFinsifySandBox,
		hookFinsifyUrl: hookFinsifyDevUrl
	},
	production: {
		root: _root,
		app: {
			name: 'Money Lover'
		},
		appBeta: {
			name: 'New MoneyLover Beta'
		},
		appWidget: {
			name: 'Money Lover Widget'
		},
		host: 'localhost',
		port: '8082',
		portHelpdesk: '8085',
		portApp: '8080',
		portAdmin: '8800',
		betaAppPort: '8090',
		portWidget: '8083',
		portSocket: '8884',
		portFinsifyHook: '8885',
		portKueUI: '8886',
		portPartner: '8887',
		portPromote: '8888',
		portBankin: '8889',
		portPromoteEc: '8890',
		//db_url: 'mongodb://10.240.189.184:27017/moneylover',
		db_url: 'mongodb://moneyloverReadWrite:m0n3yisall@money-db:27017/moneylover',
		db_log: 'mongodb://logReadWrite:n0moneyn0happy@money-db:27017/log',
		db_partner: 'mongodb://partnerReadWrite:73376motkhong@money-db:27017/partner',
		db_oauth: 'mongodb://oauthReadWrite:12369874@money-db:27017/oauth-money',
		redis_url: null,
		redis: {
			host: 'redis-msg', //10.240.0.4
			port: '6382',
			db: '8',
			kueDb: '7'
		},
		site: {
			urlSocket: '//socket.moneylover.me/',
			urlWidget: '//widget.moneylover.me',
			urlNewApp: '//web.moneylover.me',
			urlHomePage: '//app.moneylover.me',
			urlStatic: '//static.moneylover.me/',
			urlBackend: '//nsfw.moneylover.me',
			urlStatic2: '//s2.moneylover.me/',
			urlStatic3: '//static.moneylover.me/',
			urlPartner: '//partner.moneylover.me/'
		},
		session_timeout: 20 * 60 * 10, // defaults to 20 minutes, in ms (20 * 60 * 1000)
		socket_loglevel: '1', // 0 - error, 1 - warn, 2 - info, 3 - debug
		mailSettings: {
			mailFrom: 'contact@moneylover.me',
			mailService: '',
			mailAuth: {
				user: '',
				pass: ''
			},
			sendEmail: false,
			browserPreview: true
		},
		lockLogin: true,
		loginAccept: ["tuancuong92@gmail.com"],
		secret: 'y8MygyK9SB7gEErEUoq9EEdMHEjrkpjEuBEjadAg',
		version: '1.0.0',
		urlDevice: urlDevice,
		isDev: false,
		Notify: Notify,
		deviceConfig: _root + '/config/device.pem',
		privateIconPack: _root + '/app/public/icon_pack/priv_icon_pack.json',
		iconPack: _root + '/app/public/icon_pack/icon_pack.json',
		iconPackPrefix: '',
		currency: _root + '/app/public/data/currency.json',
		crypto_currency : _root +'/app/public/data/crypto_currency.json',		
		bank: _root + '/landing-page/data/bank.json',
		bankUpdateFile: _root + '/landing-page/data/bank_update_time.json',
		mandrillApi: 'yUEZnY9ghB0JqJM8Z0hxAg',
		sparkpostApi: 'b338c0c5f867775ce508d3de8f91313405a45fe0',
		allowFileUpload: ['jpg', 'jpeg'],
		transactionSyncImagePath: _root + '/app/public/data/',
		maxUploadSize: '2000000', // byte
		serverDefaultSetting: [
			{
				key: 'isServerMaintain',
				value: 'false'
			}
		],
		subscriptionProduct: _root + '/app/public/data/subscription_product.json',
		provider_cache: _root + '/app/public/data/rw-provider/provider_cache_production.json',
		provider_extension_cache: _root + '/app/public/data/rw-provider/provider_extension_cache_production.json',
		elasticsearch: {
			hostUrl: 'elastic-search:9200'
		},
		maxSyncItem: 150,
		maxPushDeviceWithoutApproval: 100,
		helpdeskAutoMessagesKey: 'helpdesk_auto_messages',
		whatsNewCache: _root + '/app/public/data/whatsnew.json',
		bitly: {
			login: 'o_7t2rcld22h',
			key: 'R_be671c90c5b9b7629e0946384aeeae28'
		},
		forgotPasswordSecret: '0f209baa-5ee5-4a87-a8dd-9eb2f2de0ae4',
		subscriptionExpire: {
			premium: {
				unit: 'years',
				value: 100
			}
		},
		rabbit: {
			host: 'redis-msg',
			port: 5672,
			user: 'moneylover',
			password: '7337610',
			vhost: 'ml-prod',
			url: 'amqp://moneylover:7337610@redis-msg:5672/ml-prod'
		},
		postgres: {
			host: 'localhost',
			port: 5432,
			user: 'user_master',
			password: '12369874',
			database: 'data_warehouse',
			idleTimeoutMillis: 30000,
			acquireConnectionTimeout: 10000
		},
		finsifyBaseUrl: finsifyBaseUrl,
		clientFinsify: clientFinsify,
		secretFinsify: secretFinsify,
		hookFinsifyUrl: hookFinsifyUrl
	},
	local: {
		root: _root,
		app: {
			name: 'Money Lover'
		},
		appBeta: {
			name: 'New MoneyLover Beta'
		},
		appWidget: {
			name: 'Money Lover Widget'
		},
		host: 'localhost',
		port: '8082',
		portHelpdesk: '8085',
		portApp: '8080',
		portAdmin: '8800',
		betaAppPort: '3001',
		portWidget: '8003',
		portSocket: '8004',
		portFinsifyHook: '8005',
		portKueUI: '8006',
		portPartner: '8007',
		portPromote: '8008',
		portBankin: '8009',
		portPromoteEc: '8010',
		db_url: 'mongodb://127.0.0.1:27017/moneylover',
		db_log: 'mongodb://127.0.0.1:27017/log',
		db_partner: 'mongodb://127.0.0.1:27017/partner',
		db_oauth: 'mongodb://127.0.0.1:27017/oauth-money',
		db_urlv3: 'mongodb://127.0.0.1:27017/moneyloverDev',
		redis_url: null,
		redis: {
			host: '127.0.0.1',
			port: '6379',
			db: '0',
			kueDb: '1'
		},
		site: {
			urlSocket: '//socket.moneylover.me/',
			urlNewApp: '//localhost:3001',
			urlHomePage: '//localhost:8080',
			urlStatic: '//localhost:8080/',
			urlStatic2: '/',
			urlBackend: '//localhost:8800/',
			urlPartner: '//localhost:8007/'
		},
		session_timeout: 20 * 60 * 10, // defaults to 20 minutes, in ms (20 * 60 * 1000)
		socket_loglevel: '1', // 0 - error, 1 - warn, 2 - info, 3 - debug
		mailSettings: {
			mailFrom: 'contact@moneylover.me',
			mailService: '',
			mailAuth: {
				user: '',
				pass: ''
			},
			sendEmail: false,
			browserPreview: true
		},
		lockLogin: false,
		secret: 'y8MygyK9SB7gEErEUoq9EEdMHEjrkpjEuBEjadAg',
		version: '1.0.0',
		urlDevice: urlDevice,
		isDev: true,
		Notify: Notify,
		deviceConfig: _root + '/config/device.pem',
		privateIconPack: _root + '/app/public/icon_pack/priv_icon_pack_debug.json',
		iconPack: _root + '/app/public/icon_pack/icon_pack_debug.json',
		iconPackPrefix: '',
		currency: _root + '/app/public/data/currency_dev.json',
		crypto_currency : _root +'/app/public/data/crypto_currency_dev.json',			
		bank: _root + '/landing-page/data/bank_dev.json',
		bankUpdateFile: _root + '/landing-page/data/bank_update_time_dev.json',
		mandrillApi: 'yUEZnY9ghB0JqJM8Z0hxAg',
		sparkpostApi: 'b338c0c5f867775ce508d3de8f91313405a45fe0',
		allowFileUpload: ['jpg', 'jpeg'],
		transactionSyncImagePath: _root + '/app/public/data/',
		maxUploadSize: '2000000', // byte
		serverDefaultSetting: [
			{
				key: 'isServerMaintain',
				value: 'false'
			}
		],
		subscriptionProduct: _root + '/app/public/data/subscription_product.json',
		provider_cache: _root + '/app/public/data/rw-provider/provider_cache_local.json',
		provider_extension_cache: _root + '/app/public/data/rw-provider/provider_extension_cache_local.json',
		elasticsearch: {
			hostUrl: 'localhost:9200'
		},
		maxSyncItem: 150,
		maxPushDeviceWithoutApproval: 5,
		helpdeskAutoMessagesKey: 'helpdesk_auto_messages',
		whatsNewCache: _root + '/app/public/data/whatsnew_dev.json',
		bitly: {
			login: 'o_7t2rcld22h',
			key: 'R_be671c90c5b9b7629e0946384aeeae28'
		},
		forgotPasswordSecret: '0f209baa-5ee5-4a87-a8dd-9eb2f2de0ae4',
		passport: {
			clientId: 'client_id',
			extractJwtOpts: {
				authScheme: 'AuthJWT',
				tokenBodyField: 'access_token',
				tokenQueryParameterName: 'access_token'
			},
			requestTokenEndpoint: '/auth/request-token',
			refreshTokenEndpoint: '/auth/refresh-token',
			tokenEndpoint: '/auth/token',
			ignoreRequestTokenUrl: ['/'],
			secret: '5f2c6556-2483-4254-a0e6-d8aec4069caa',
			accessTokenExpire: 7 * 86400, // 7 days = 7 * 24 * 3600;
			refreshTokenExpire: 10 * 365 * 86400, // 10 year
			requestTokenExpire: 3600 // 1h
		},
		subscriptionExpire: {
			premium: {
				unit: 'years',
				value: 100
			}
		},
		rabbit: {
			host: 'localhost',
			port: 5672,
			user: 'loint',
			password: '123456',
			vhost: 'email_push_automation',
			url: 'amqp://loint:123456@localhost:5672/email_push_automation'
		},
		postgres: {
			host: 'localhost',
			port: 5432,
			user: 'Loint',
			password: '123456aA@',
			database: 'loint_test',
			idleTimeoutMillis: 60000,
			acquireConnectionTimeout: 10000
		},
		log_path: "logs/",
		finsifyBaseUrl: finsifyDevBaseUrl,
		clientFinsify: clientFinsifySandBox,
		secretFinsify: secretFinsifySandBox,
		hookFinsifyUrl: hookFinsifyDevUrl
	},
	sandbox: {
		root: _root,
		app: {
			name: 'Money Lover'
		},
		appBeta: {
			name: 'New MoneyLover Beta'
		},
		appWidget: {
			name: 'Money Lover Widget'
		},
		host: 'localhost',
		port: '8084',
		portHelpdesk: '8002',
		portApp: '8091',
		portAdmin: '8801',
		portAdminNode5: '8869',
		portWidget: '8003',
		portSocket: '8004',
		portFinsifyHook: '8005',
		portKueUI: '8006',
		portPartner: '8007',
		portPromote: '8008',
		portBankin: '8009',
		portPromoteEc: '8010',
		//db_url: 'mongodb://10.240.189.184:27017/moneyloverDev',
		db_url: 'mongodb://moneyloverDevReadWrite:7337610@money-db:27017/moneyloverDev',
		db_log: 'mongodb://devLogReadWrite:n0moneyn0life@money-db:27017/dev-log',
		db_partner: 'mongodb://devPartnerReadWrite:733bay610@money-db:27017/partnerDev',
		db_oauth: 'mongodb://devOauthReadWrite:73babay610@money-db:27017/dev-oauth-money',
		db_urlv3: 'mongodb://10.240.189.184:27017/moneyV3',
		redis_url: null,
		redis: {
			host: 'redis-msg', //10.240.0.4
			port: '6383',
			db: '6',
			kueDb: '7'
		},
		site: {
			urlSocket: '//socket.moneylover.me/',
			urlWidget: '//widget.moneylover.me',
			urlNewApp: '//web.moneylover.me',
			urlHomePage: '//testwebapp.moneylover.me',
			urlStatic: '//testwebapp.moneylover.me/',
			urlStatic2: '//s1.moneylover.me/',
			urlStatic3: '//statictest.moneylover.me/',
			urlPartner: '//devpartner.moneylover.me/'
		},
		session_timeout: 20 * 60 * 10, // defaults to 20 minutes, in ms (20 * 60 * 1000)
		socket_loglevel: '1', // 0 - error, 1 - warn, 2 - info, 3 - debug
		mailSettings: {
			mailFrom: 'contact@moneylover.me',
			mailService: '',
			mailAuth: {
				user: '',
				pass: ''
			},
			sendEmail: false,
			browserPreview: true
		},
		lockLogin: false,
		secret: 'y8MygyK9SB7gEErEUoq9EEdMHEjrkpjEuBEjadAg',
		version: '1.0.0',
		urlDevice: urlDevice,
		isDev: true,
		Notify: Notify,
		deviceConfig: _root + '/config/device.pem',
		privateIconPack: _root + '/app/public/icon_pack/priv_icon_pack_debug.json',
		iconPack: _root + '/app/public/icon_pack/icon_pack_debug.json',
		iconPackPrefix: 'debug_',
		currency: _root + '/app/public/data/currency_dev.json',
		crypto_currency : _root +'/app/public/data/crypto_currency_dev.json',							
		bank: _root + '/landing-page/data/bank_dev.json',
		bankUpdateFile: _root + '/landing-page/data/bank_update_time_dev.json',
		mandrillApi: 'yUEZnY9ghB0JqJM8Z0hxAg',
		sparkpostApi: 'b338c0c5f867775ce508d3de8f91313405a45fe0',
		allowFileUpload: ['jpg', 'jpeg'],
		transactionSyncImagePath: _root + '/app/public/data/',
		maxUploadSize: '2000000', // byte
		serverDefaultSetting: [
			{
				key: 'isServerMaintain',
				value: 'false'
			}
		],
		subscriptionProduct: _root + '/app/public/data/subscription_product.json',
		provider_cache: _root + '/app/public/data/rw-provider/provider_cache_dev.json',
		provider_extension_cache: _root + '/app/public/data/rw-provider/provider_extension_cache_dev.json',
		elasticsearch: {
			hostUrl: 'elastic-search:9200'
		},
		maxSyncItem: 150,
		maxPushDeviceWithoutApproval: 100,
		helpdeskAutoMessagesKey: 'helpdesk_auto_messages',
		whatsNewCache: _root + '/app/public/data/whatsnew_dev.json',
		bitly: {
			login: 'o_7t2rcld22h',
			key: 'R_be671c90c5b9b7629e0946384aeeae28'
		},
		forgotPasswordSecret: '0f209baa-5ee5-4a87-a8dd-9eb2f2de0ae4',
		passport: {
			clientId: 'client_id',
			extractJwtOpts: {
				authScheme: 'AuthJWT',
				tokenBodyField: 'access_token',
				tokenQueryParameterName: 'access_token'
			},
			requestTokenEndpoint: '/auth/request-token',
			refreshTokenEndpoint: '/auth/refresh-token',
			tokenEndpoint: '/auth/token',
			ignoreRequestTokenUrl: ['/'],
			secret: '5f2c6556-2483-4254-a0e6-d8aec4069caa',
			accessTokenExpire: 7 * 86400, // 7 days = 7 * 24 * 3600;
			refreshTokenExpire: 10 * 365 * 86400, // 10 year
			requestTokenExpire: 3600 // 1h
		},
		subscriptionExpire: {
			premium: {
				unit: 'days',
				value: 1
			}
		},
		rabbit: {
			host: 'redis-msg',
			port: 5672,
			user: 'moneylover',
			password: '7337610',
			vhost: 'ml-dev',
			url: 'amqp://moneylover:7337610@redis-msg:5672/ml-dev'
		},
		postgres: {
			host: 'localhost',
			port: 5433,
			user: 'user_master',
			password: '12369874',
			database: 'data_warehouse_dev',
			idleTimeoutMillis: 60000,
			acquireConnectionTimeout: 10000
		},
		finsifyBaseUrl: finsifyDevBaseUrl,
		clientFinsify: clientFinsifySandBox,
		secretFinsify: secretFinsifySandBox,
		hookFinsifyUrl: hookFinsifyDevUrl
	},
};
