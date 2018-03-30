(function($a) {
	'use strict';
	$a.module('ML', ['ngRoute', 'ngAnimate', 'ngSanitize', 'ui.bootstrap', 'ti.moneylover', 'LocalStorageModule', 'ML.language', 'ML.services', 'ML.controllers'])
	.config(function($routeProvider, $locationProvider, localStorageServiceProvider, $compileProvider, $tooltipProvider, $translateProvider) {
		localStorageServiceProvider.setPrefix('ML');
		$locationProvider.html5Mode(true);
		$tooltipProvider.options({appendToBody: true});
		$translateProvider.preferredLanguage('en_US');
	})
	.run(function($rootScope, $templateCache, localStorageService) {

	});
}(window.angular));