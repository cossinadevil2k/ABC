/*
	Money Lover
	Application
*/
var ML = null;

(function($a) {
	'use strict';

	ML = $a.module('ML', ['ngRoute', 'ngAnimate', 'ngSanitize', 'ui.bootstrap', 'ti.moneylover', 'LocalStorageModule', 'ML.filters', 'ML.services', 'ML.directives', 'ML.controllers', 'ML.language']);
	ML.config(function($routeProvider, $locationProvider, localStorageServiceProvider, $compileProvider, $tooltipProvider, $translateProvider) {
		//$routeProvider.when('/reset-password', {
		//	controller: 'userAction'
		//});

		//$routeProvider.when('/', {
		//	templateUrl: '/statics/home.html',
		//	controller: 'homePage'
		//});

		localStorageServiceProvider.setPrefix('ML');
		// $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript):/);
		$locationProvider.html5Mode(true);
		$tooltipProvider.options({appendToBody: true});
		$translateProvider.preferredLanguage('en_US');
	});

	ML.run(['$rootScope', '$templateCache', 'Page', 'localStorageService', 'MoneyLover',
		function($rootScope, $templateCache, Page, localStorageService, MoneyLover) {
			$rootScope.MLTitle			= 'Money Lover';
			$rootScope.MLPageDetail		= 'Money Lover';
			$rootScope.MLAuthor			= Page.author;
			$rootScope.MLDescription	= Page.description;
			$rootScope.MLKeyword		= Page.keyword;
			$rootScope.userLogin		= $.cookie('userLogin');
			$rootScope.MLpreloader		= false;
			$rootScope.lockScreen		= !$rootScope.userLogin;
			$rootScope.listWallet		= localStorageService.get('listWallet') || [];
			$rootScope.wallet			= localStorageService.get('wallet') || { id: null, name: 'Money Lover', amount: 0, currency: {c:"USD",s:"$",n:"United States Dollar", t:0}};
			$rootScope.initWallet		= $.cookie('userLogin') || false;
			$rootScope.listCategory		= localStorageService.get('listCategory') || [];
			$rootScope.currencyList		= localStorageService.get('currencyList') || {};
			$rootScope.categoryMeta		= ['IS_DEBT', 'IS_OTHER_INCOME', 'IS_LOAN', 'IS_OTHER_EXPENSE', 'salary0', 'award0', 'selling0', 'give0', 'interestmoney0', 'foodndrink0', 'entertainment0', 'travel0', 'education0', 'transport0', 'friendnlover0', 'family0', 'medical0', 'shopping0', 'invest0'];
			$rootScope.categoryLanguage	= ['cate_debt', 'cate_income_other', 'cate_loan', 'cate_expense_other', 'cate_salary', 'cate_award', 'cate_selling', 'cate_give', 'cate_interest', 'cate_food', 'cate_entertainment', 'cate_travel', 'cate_education', 'cate_transport', 'cate_friend', 'cate_family', 'cate_medical', 'cate_shopping', 'cate_invest'];
			$rootScope.userLogged		= localStorageService.get('userLogged') || {};
			$rootScope.tabSelect		= 1;
			$rootScope.popWallet		= false;
			MoneyLover.initCurrency(true);
			MoneyLover.clearLogged(!$rootScope.userLogin);
			MoneyLover.DatetimeUtilsInit();
			// $templateCache.put('/statics/statics/modalSelectCategory.html', 'This is the content of the template');
		}
	]);
}(angular));