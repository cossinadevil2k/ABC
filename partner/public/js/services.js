(function($a) {
	'use strict';

	var MLservices = $a.module('ML.services', []);

	MLservices.service('MoneyLover', function($http, $rootScope, localStorageService, Page) {});

	MLservices.factory('Page', function($rootScope, $location, $http, localStorageService) {
		var defaultPage = {
			title: 'Money Lover Partner',
			author: 'ZooStudio',
			description: 'Money Lover Partner Control Panel',
			keyword: 'Money Lover Partner',
			version: '1.0',
			homePage: 'https://partner.moneylover.me'
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
