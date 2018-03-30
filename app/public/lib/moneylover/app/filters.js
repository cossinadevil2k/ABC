(function($a, $j) {
	'use strict';

	var MLfilters = $a.module('ML.filters', []);
	MLfilters.filter('interpolate', ['Page',
		function(Page) {
			return function(text) {
				return String(text).replace(/\%VERSION\%/mg, Page.version);
			};
		}
	]);

	MLfilters.filter('setDefaultWallet', function($rootScope) {
		return function(wallet, status) {
			if (status) $rootScope.DefaultWallet = wallet;
			return status;
		};
	});

	MLfilters.filter('selectMenu', function() {
		return function(tabSelect, value) {
			return tabSelect === value;
		};
	});

	MLfilters.filter('generateIconLink', function(Page) {
		return function(icon) {
			if (!icon) icon = 'icon_61';
			return (Page.homepage + '/img/icon/' + icon + '.png').replace('icon//icon', 'icon');
		};
	});

	MLfilters.filter('validateSubCate', function() {
		return function(child, status) {
			if (child != [] && status) return true;
			else return false;
		};
	});

	MLfilters.filter('AmountFormatter', function(Page) {
		return function(amount, transactionsType, currency, settings) {
			return Page.AmountFormatter(amount, transactionsType, currency, settings);
		};
	});

	MLfilters.filter('lockCategory', function($rootScope) {
		return function(metadata) {
			if (metadata && metadata !== '1') return true;
			else return false;
		};
	});

	MLfilters.filter('categoryType', function() {
		return function(type, option) {
			if (type === option) return true;
			else return false;
		};
	});

	MLfilters.filter('categoryFilter', function() {
		return function(listCategory, type) {
			if (listCategory) {
				var newCategory = [];
				listCategory.forEach(function(category, index) {
					if (category.type === type) newCategory.push(category);
				});
				return newCategory;
			}
		};
	});

	MLfilters.filter('categoryParseName', function($rootScope, $translate, Page) {
		return function(name, metadata) {
			var indexMeta = $rootScope.categoryMeta.indexOf(metadata);
			if (indexMeta >= 0) return $translate($rootScope.categoryLanguage[indexMeta]);
			else return name;
		};
	});

	MLfilters.filter('categoryFindParent', function($rootScope) {
		return function(listCategory, parentId) {
			if (parentId) {
				listCategory.forEach(function(category) {
					if (category._id === parentId) {
						return category.name;
					}
				});
			}
		};
	});

	MLfilters.filter('MLCurrency', function(Page) {
		return function(number) {
			return Page.convertCurrency(number);
		};
	});

	MLfilters.filter('MLHeaderTransactionDate', function() {
		return function(MLDate) {
			return MLdate;
		};
	});
	MLfilters.filter('checkNegativeAmount', function() {
		return function(number) {
			if (number < 0) return 'amount-expense';
			else return 'amount-income';
		};
	});

	MLfilters.filter('MLDateFormatter', function($rootScope, $translate) {
		return function(dated) {
			var dateFormat = $rootScope.userLogged.setting.setting_date.datetimeFormat.toUpperCase();
			var dateFormated = MLApp.DatetimeUtils.MLFriendlyDate(dated, dateFormat);
			if (dateFormated.isFriendly) return {
				displayDate: $translate(dateFormated.friendlyDate),
				viewDate: $translate(dateFormated.friendlyDate),
				basicDate: dateFormated.date
			};
			else return {
				displayDate: dateFormated.date,
				viewDate: dateFormated.date,
				basicDate: dateFormated.date
			};
		};
	});
	MLfilters.filter('MLDayFormatter', function($rootScope, $translate, $filter) {
		return function(dated) {
			var today = new Date();
			var dayOfWeek = dated;
			return $filter('date')(dated, 'EEEE');
		}
	});

	MLfilters.filter('currencySelected', function() {
		return function(currency, currencySelect) {
			if (currency.n === currencySelect.n) return true;
			else return false;
		}
	});
}(angular, jQuery));
