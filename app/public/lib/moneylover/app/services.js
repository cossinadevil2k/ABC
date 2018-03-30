(function($a) {
	'use strict';

	$a.module('ML.services', [])
	.service('MoneyLover', function($http, $rootScope, localStorageService) {
		this.initCurrency = function(status){
			if(typeof $rootScope.currencyList === 'object' && !$rootScope.currencyList.data){
				$http.get('//moneylover.me/data/currency.json').success(function(data, status){
					$rootScope.currencyList = data;
					localStorageService.add('currencyList', JSON.stringify(data));
				}).error(function(data, status){
					$rootScope.currencyList = {};
				});
			}
			return;
		};
		this.initWallet = function(callback){
			$http.get('/api/account/list').success(function(data, status){
				callback(data);
			}).error(function(data, status){
				callback(false, {msg: data});
			});
		};
		this.initCategory = function(wallet_id, option, callback){
			var that = this;
			$http.post('/api/category/list', { account_id: wallet_id, type: option.type, sub: option.getsub }).success(function(data, status){
				
			}).error(MLApp.http.errorSv);
		};
		this.initAppInfo = function(){

		};
		this.clearLogged = function(){
			$rootScope.userLogin = 0;
			$rootScope.listWallet = [];
			$rootScope.wallet = { id: null, name: 'Money Lover', amount: 0, currency: 1, formatter: '0,0.00'};
			$.removeCookie('userLogin');
			localStorageService.remove('listWallet');
			localStorageService.remove('wallet');
			localStorageService.remove('userLogged');
		};
		this.DatetimeUtilsInit = function(){
			// if($rootScope.userLogged.setting) Page.DatetimeUtilsInit();
		};
	});

	// MLservices.factory('Page', function($rootScope, $location, $http, localStorageService){
	// 	var defaultPage = {
	// 		title: 'Money Lover',
	// 		author: 'ZooStudio',
	// 		description: 'Money Lover web version',
	// 		keyword: 'Money Lover',
	// 		version: '0.1.a',
	// 		homePage: 'http://app.moneylover.me'
	// 	};
	// 	return {
	// 		homepage: defaultPage.homePage,
	// 		author: defaultPage.author,
	// 		description: defaultPage.description,
	// 		keyword: defaultPage.keyword,
	// 		version: defaultPage.version,
	// 		title: function() {
	// 			$rootScope.MLTitle = defaultPage.title;
	// 		},
	// 		setTitle: function(newTitle) {
	// 			$rootScope.MLTitle = newTitle + ' - ' + defaultPage.title;
	// 			$rootScope.MLPageDetail = newTitle;
	// 		},
	// 		resetTitle: function(){
	// 			$rootScope.MLTitle = defaultPage.title;
	// 		},
	// 		clearLogged: function(){
	// 			$rootScope.userLogin = 0;
	// 			$rootScope.listWallet = [];
	// 			$rootScope.wallet = { id: null, name: 'Money Lover', amount: 0, currency: 1, formatter: '0,0.00'};
	// 			$.removeCookie('userLogin');
	// 			localStorageService.remove('listWallet');
	// 			localStorageService.remove('wallet');
	// 			localStorageService.remove('userLogged');
	// 		},
	// 		findWalletDefault: function(){
	// 			var that = this;
	// 			var walletInfo = {};
	// 			var walletStatus = false;
	// 			var walletId = $rootScope.userLogged.account_default;
	// 			if(!walletId) return false;
	// 			else {
	// 				var listWallet = $rootScope.listWallet;
	// 				for(var i=0; i < listWallet.length; i++){
	// 					if(listWallet[i]._id == walletId) {
	// 						walletInfo = listWallet[i];
	// 						walletStatus = true;
	// 						break;
	// 					}
	// 				}
	// 				if(walletStatus) return walletInfo;
	// 				else return false;
	// 			}
	// 		},
	// 		findCurrency: function(){
	// 			var currencyInfo = {"c":"USD","s":"$","n":"United States Dollar","t":0};
	// 			if($rootScope.currencyList.data){
	// 				var listCurrency = $rootScope.currencyList.data;
	// 				var walletCurrency = $rootScope.wallet.currency -1;
	// 				for(var i= 0; i < listCurrency.length; i++){
	// 					if(walletCurrency === i) {
	// 						currencyInfo = listCurrency[i];
	// 						break;
	// 					}
	// 				}
	// 			}
	// 			return currencyInfo;
	// 		},
	// 		setWallet: function(walletInfo){
	// 			$rootScope.wallet.id = walletInfo._id;
	// 			$rootScope.wallet.name = walletInfo.name;
	// 			$rootScope.wallet.amount = walletInfo.amount || 0;
	// 			$rootScope.wallet.currency = walletInfo.currency_id;
	// 			this.saveWalletFormatter();
	// 			localStorageService.add('wallet', $rootScope.wallet);
	// 			$rootScope.selectWallet = false;
	// 			$rootScope.lockScreen = false;
	// 			this.initCategory({ account_id: walletInfo._id, type: 0, sub: true }, function(){});
	// 			this.DatetimeUtilsInit();
	// 		},
	// 		setWalletDefault: function(account_id){
	// 			$http.post('/api/account/setDefault', {account_id: account_id});
	// 		},
	// 		progressCategoryData: function(categories){
	// 			var listCategory = progressCategoryData(categories);
	// 			this.saveListCategory(listCategory);
	// 			return listCategory;
	// 		},
	// 		saveUserLogged: function(dataLogged){
	// 			$rootScope.userLogged = dataLogged;
	// 			localStorageService.add('userLogged', JSON.stringify(dataLogged));
	// 		},
	// 		saveWalletFormatter: function(){
	// 			var currency = this.findCurrency();
	// 			var userSetting = $rootScope.userLogged.setting;
	// 			$rootScope.wallet.formatter = generateAmountFormatter(currency, userSetting.setting_amount_display);
	// 		},
	// 		getDefaultWallet: function(){
	// 			var walletDefault = this.findWalletDefault();
	// 			if(walletDefault) {
	// 				this.setWallet(walletDefault);
	// 				return walletDefault._id;
	// 			} else return false;
	// 		},
	// 		convertCurrency: function(number){
	// 			if($rootScope.wallet && $rootScope.wallet.formatter) return MLAmountFormatter2(number, $rootScope.wallet.formatter);
	// 		},
	// 		unConvertCurrency: function(number){
	// 			return MLAmountUnFormatter(number);
	// 		},
	// 		DatetimeUtilsInit: function(){
	// 			var setting = $rootScope.userLogged.setting.setting_date;
	// 			MLApp.DatetimeUtils = new DatetimeUtils(setting);
	// 		}
	// 	};
	// });
}(window.angular));