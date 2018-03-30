(function($a) {
	'use strict';

	var MLservices = $a.module('ML.services', []);

	MLservices.service('MoneyLover', function($http, $rootScope, localStorageService, Page) {});

	MLservices.factory('Page', function($rootScope, $location, $http, localStorageService) {
		var defaultPage = {
			title: 'Money Lover AdminCP',
			author: 'ZooStudio',
			description: 'Money Lover Admin control panel',
			keyword: 'Money Lover',
			version: '0.1',
			homePage: 'http://nsfw.moneylover.me'
		};
		return {
			homepage: defaultPage.homePage,
			author: defaultPage.author,
			description: defaultPage.description,
			keyword: defaultPage.keyword,
			version: defaultPage.version,
			title: function() {
				$rootScope.MLTitle = defaultPage.title;
			},
			setTitle: function(newTitle) {
				$rootScope.MLTitle = newTitle + ' - ' + defaultPage.title;
				$rootScope.MLPageDetail = newTitle;
			},
			resetTitle: function() {
				$rootScope.MLTitle = defaultPage.title;
			},
			menuSelect: function(id) {
				id = id || 1;
				$rootScope.tabSelect = id;
			}
		
		};
	});

	var ML = $a.module('ML');
	ML.service('notificationService', function(){
		var newNoti = 0;

		var updateNotification = function(newNotiNumber){
			newNoti += newNotiNumber;
		};

		var getNotification = function(){
			return newNoti;
		};

		var clearNotification = function(){
			newNoti = 0;
		};

		return {
			updateNotification: updateNotification,
			getNotification: getNotification,
			clearNotification: clearNotification
		}
	});
}(angular));
