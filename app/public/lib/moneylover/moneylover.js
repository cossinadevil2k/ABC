/*
 *	Angular UI Bootstrap
 *	Custom
 */
(function(ML_a) {
	'use strict';
	if (!ML_a) {
		window.alert('Please install AngularJS');
	}

	ML_a.module('ti.moneylover', ['ti.moneylover.datepicker', 'ti.moneylover.element']);
	ML_a.module('ti.moneylover.datepicker', ['ui.bootstrap.position', 'tplsDatepicker', 'tplsDatePickerPopup'])
		.constant('datepickerConfig', {
			dayFormat: 'dd',
			monthFormat: 'MMMM',
			yearFormat: 'yyyy',
			dayHeaderFormat: 'EEE',
			dayTitleFormat: 'MMMM yyyy',
			monthTitleFormat: 'yyyy',
			showWeeks: true,
			startingDay: 0,
			yearRange: 20,
			minDate: null,
			maxDate: null,
			customRange: false // Add custom range
		})
		.controller('DatepickerController', ['$scope', '$attrs', 'dateFilter', 'datepickerConfig',
			function($scope, $attrs, dateFilter, dtConfig) {
				var format = {
					day: getValue($attrs.dayFormat, dtConfig.dayFormat),
					month: getValue($attrs.monthFormat, dtConfig.monthFormat),
					year: getValue($attrs.yearFormat, dtConfig.yearFormat),
					dayHeader: getValue($attrs.dayHeaderFormat, dtConfig.dayHeaderFormat),
					dayTitle: getValue($attrs.dayTitleFormat, dtConfig.dayTitleFormat),
					monthTitle: getValue($attrs.monthTitleFormat, dtConfig.monthTitleFormat)
				},
					startingDay = getValue($attrs.startingDay, dtConfig.startingDay),
					yearRange = getValue($attrs.yearRange, dtConfig.yearRange);
				this.minDate = dtConfig.minDate ? new Date(dtConfig.minDate) : null;
				this.maxDate = dtConfig.maxDate ? new Date(dtConfig.maxDate) : null;

				function getValue(value, defaultValue) {
					return angular.isDefined(value) ? $scope.$parent.$eval(value) : defaultValue;
				}

				function getDaysInMonth(year, month) {
					return new Date(year, month, 0).getDate();
				}

				function getDates(startDate, n) {
					var dates = new Array(n);
					var current = startDate,
						i = 0;
					while (i < n) {
						dates[i++] = new Date(current);
						current.setDate(current.getDate() + 1);
					}
					return dates;
				}

				function makeDate(date, format, isSelected, isSecondary) {
					return {
						date: date,
						label: dateFilter(date, format),
						selected: !! isSelected,
						secondary: !! isSecondary
					};
				}

				this.modes = [{
					name: 'day',
					getVisibleDates: function(date, selected) {
						var year = date.getFullYear(),
							month = date.getMonth(),
							firstDayOfMonth = new Date(year, month, 1);
						var difference = startingDay - firstDayOfMonth.getDay(),
							numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : -difference,
							firstDate = new Date(firstDayOfMonth),
							numDates = 0;

						if (numDisplayedFromPreviousMonth > 0) {
							firstDate.setDate(-numDisplayedFromPreviousMonth + 1);
							numDates += numDisplayedFromPreviousMonth; // Previous
						}

						numDates += getDaysInMonth(year, month + 1); // Current
						numDates += (7 - numDates % 7) % 7; // Next

						var days = getDates(firstDate, numDates),
							labels = new Array(7);

						for (var i = 0; i < numDates; i++) {
							var dt = days[i];
							days[i] = makeDate(dt, format.day, (selected && selected.getDate() === dt.getDate() && selected.getMonth() === dt.getMonth() && selected.getFullYear() === dt.getFullYear()), dt.getMonth() !== month);
						}
						for (var j = 0; j < 7; j++) {
							labels[j] = dateFilter(days[j].date, format.dayHeader);
						}
						return {
							objects: days,
							title: dateFilter(date, format.dayTitle),
							labels: labels
						};
					},
					compare: function(date1, date2) {
						return (new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()));
					},
					split: 7,
					step: {
						months: 1
					}
				}, {
					name: 'month',
					getVisibleDates: function(date, selected) {
						var months = new Array(12),
							year = date.getFullYear();
						for (var i = 0; i < 12; i++) {
							var dt = new Date(year, i, 1);
							months[i] = makeDate(dt, format.month, (selected && selected.getMonth() === i && selected.getFullYear() === year));
						}
						return {
							objects: months,
							title: dateFilter(date, format.monthTitle)
						};
					},
					compare: function(date1, date2) {
						return new Date(date1.getFullYear(), date1.getMonth()) - new Date(date2.getFullYear(), date2.getMonth());
					},
					split: 3,
					step: {
						years: 1
					}
				}, {
					name: 'year',
					getVisibleDates: function(date, selected) {
						var years = new Array(yearRange),
							year = date.getFullYear(),
							startYear = parseInt((year - 1) / yearRange, 10) * yearRange + 1;
						for (var i = 0; i < yearRange; i++) {
							var dt = new Date(startYear + i, 0, 1);
							years[i] = makeDate(dt, format.year, (selected && selected.getFullYear() === dt.getFullYear()));
						}
						return {
							objects: years,
							title: [years[0].label, years[yearRange - 1].label].join(' - ')
						};
					},
					compare: function(date1, date2) {
						return date1.getFullYear() - date2.getFullYear();
					},
					split: 5,
					step: {
						years: yearRange
					}
				}];

				this.isDisabled = function(date, mode) {
					var currentMode = this.modes[mode || 0];
					return ((this.minDate && currentMode.compare(date, this.minDate) < 0) || (this.maxDate && currentMode.compare(date, this.maxDate) > 0) || ($scope.dateDisabled && $scope.dateDisabled({
						date: date,
						mode: currentMode.name
					})));
				};
			}
		])
		.directive('mlDatepicker', ['dateFilter', '$parse', 'datepickerConfig', '$log',
		function(dateFilter, $parse, datepickerConfig, $log) {
			return {
				restrict: 'EA',
				replace: true,
				templateUrl: '/statics/moneylover/datepicker.html',
				scope: {
					dateDisabled: '&'
				},
				require: ['ml-datepicker', '?^ngModel'],
				controller: 'DatepickerController',
				link: function(scope, element, attrs, ctrls) {
					var datepickerCtrl = ctrls[0],
						ngModel = ctrls[1];

					if (!ngModel) {
						return; // do nothing if no ng-model
					}

					// Configuration parameters
					var mode = 0,
						selected = new Date(),
						showWeeks = datepickerConfig.showWeeks;

					if (attrs.showWeeks) {
						scope.$parent.$watch($parse(attrs.showWeeks), function(value) {
							showWeeks = !! value;
							updateShowWeekNumbers();
						});
					} else {
						updateShowWeekNumbers();
					}

					if (attrs.min) {
						scope.$parent.$watch($parse(attrs.min), function(value) {
							datepickerCtrl.minDate = value ? new Date(value) : null;
							refill();
						});
					}
					if (attrs.max) {
						scope.$parent.$watch($parse(attrs.max), function(value) {
							datepickerCtrl.maxDate = value ? new Date(value) : null;
							refill();
						});
					}

					function updateShowWeekNumbers() {
						scope.showWeekNumbers = mode === 0 && showWeeks;
					}

					// Split array into smaller arrays

					function split(arr, size) {
						var arrays = [];
						while (arr.length > 0) {
							arrays.push(arr.splice(0, size));
						}
						return arrays;
					}

					function refill(updateSelected) {
						var date = null,
							valid = true;

						if (ngModel.$modelValue) {
							date = new Date(ngModel.$modelValue);

							if (isNaN(date)) {
								valid = false;
								$log.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
							} else if (updateSelected) {
								selected = date;
							}
						}
						ngModel.$setValidity('date', valid);

						var currentMode = datepickerCtrl.modes[mode],
							data = currentMode.getVisibleDates(selected, date);
						angular.forEach(data.objects, function(obj) {
							obj.disabled = datepickerCtrl.isDisabled(obj.date, mode);
						});

						ngModel.$setValidity('date-disabled', (!date || !datepickerCtrl.isDisabled(date)));

						scope.rows = split(data.objects, currentMode.split);
						scope.labels = data.labels || [];
						scope.title = data.title;
					}

					function setMode(value) {
						mode = value;
						updateShowWeekNumbers();
						refill();
					}

					ngModel.$render = function() {
						refill(true);
					};

					scope.select = function(date) {
						if (mode === 0) {
							var dt = ngModel.$modelValue ? new Date(ngModel.$modelValue) : new Date(0, 0, 0, 0, 0, 0, 0);
							dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
							ngModel.$setViewValue(dt);
							refill(true);
						} else {
							selected = date;
							setMode(mode - 1);
						}
					};
					scope.move = function(direction) {
						var step = datepickerCtrl.modes[mode].step;
						selected.setMonth(selected.getMonth() + direction * (step.months || 0));
						selected.setFullYear(selected.getFullYear() + direction * (step.years || 0));
						refill();
					};
					scope.toggleMode = function() {
						setMode((mode + 1) % datepickerCtrl.modes.length);
					};
					scope.getWeekNumber = function(row) {
						return (mode === 0 && scope.showWeekNumbers && row.length === 7) ? getISO8601WeekNumber(row[0].date) : null;
					};

					function getISO8601WeekNumber(date) {
						var checkDate = new Date(date);
						checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
						var time = checkDate.getTime();
						checkDate.setMonth(0); // Compare with Jan 1
						checkDate.setDate(1);
						return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
					}
				}
			};
		}
	])

	.constant('datepickerPopupConfig', {
		dateFormat: 'yyyy-MM-dd',
		currentText: 'Today',
		toggleWeeksText: 'Weeks',
		clearText: 'Clear',
		closeText: 'Done',
		closeOnDateSelection: true,
		appendToBody: false,
		showButtonBar: true
	})

	.directive('mlDatepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'datepickerPopupConfig', 'datepickerConfig',
		function($compile, $parse, $document, $position, dateFilter, datepickerPopupConfig, datepickerConfig) {
			return {
				restrict: 'EA',
				require: 'ngModel',
				link: function(originalScope, element, attrs, ngModel) {
					var scope = originalScope.$new(), // create a child scope so we are not polluting original one
						dateFormat,
						closeOnDateSelection = angular.isDefined(attrs.closeOnDateSelection) ? originalScope.$eval(attrs.closeOnDateSelection) : datepickerPopupConfig.closeOnDateSelection,
						appendToBody = angular.isDefined(attrs.datepickerAppendToBody) ? originalScope.$eval(attrs.datepickerAppendToBody) : datepickerPopupConfig.appendToBody;

					attrs.$observe('datepickerPopup', function(value) {
						dateFormat = value || datepickerPopupConfig.dateFormat;
						ngModel.$render();
					});

					scope.showButtonBar = angular.isDefined(attrs.showButtonBar) ? originalScope.$eval(attrs.showButtonBar) : datepickerPopupConfig.showButtonBar;

					originalScope.$on('$destroy', function() {
						$popup.remove();
						scope.$destroy();
					});

					attrs.$observe('currentText', function(text) {
						scope.currentText = angular.isDefined(text) ? text : datepickerPopupConfig.currentText;
					});
					attrs.$observe('toggleWeeksText', function(text) {
						scope.toggleWeeksText = angular.isDefined(text) ? text : datepickerPopupConfig.toggleWeeksText;
					});
					attrs.$observe('clearText', function(text) {
						scope.clearText = angular.isDefined(text) ? text : datepickerPopupConfig.clearText;
					});
					attrs.$observe('closeText', function(text) {
						scope.closeText = angular.isDefined(text) ? text : datepickerPopupConfig.closeText;
					});

					var getIsOpen, setIsOpen;
					if (attrs.isOpen) {
						getIsOpen = $parse(attrs.isOpen);
						setIsOpen = getIsOpen.assign;

						originalScope.$watch(getIsOpen, function updateOpen(value) {
							scope.isOpen = !! value;
						});
					}
					scope.isOpen = getIsOpen ? getIsOpen(originalScope) : false; // Initial state

					function setOpen(value) {
						if (setIsOpen) {
							setIsOpen(originalScope, !! value);
						} else {
							scope.isOpen = !! value;
						}
					}

					var documentClickBind = function(event) {
						if (scope.isOpen && event.target !== element[0]) {
							scope.$apply(function() {
								setOpen(false);
							});
						}
					};

					var elementFocusBind = function() {
						scope.$apply(function() {
							setOpen(true);
						});
					};

					// popup element used to display calendar
					var popupEl = angular.element('<div datepicker-popup-wrap><div datepicker></div></div>');
					popupEl.attr({
						'ng-model': 'date',
						'ng-change': 'dateSelection()'
					});
					var datepickerEl = angular.element(popupEl.children()[0]),
						datepickerOptions = {};
					if (attrs.datepickerOptions) {
						datepickerOptions = originalScope.$eval(attrs.datepickerOptions);
						datepickerEl.attr(angular.extend({}, datepickerOptions));
					}

					// TODO: reverse from dateFilter string to Date object

					function parseDate(viewValue) {
						if (!viewValue) {
							ngModel.$setValidity('date', true);
							return null;
						} else if (angular.isDate(viewValue)) {
							ngModel.$setValidity('date', true);
							return viewValue;
						} else if (angular.isString(viewValue)) {
							var date = new Date(viewValue);
							if (isNaN(date)) {
								ngModel.$setValidity('date', false);
								return undefined;
							} else {
								ngModel.$setValidity('date', true);
								return date;
							}
						} else {
							ngModel.$setValidity('date', false);
							return undefined;
						}
					}
					ngModel.$parsers.unshift(parseDate);

					// Inner change
					scope.dateSelection = function(dt) {
						if (angular.isDefined(dt)) {
							scope.date = dt;
						}
						ngModel.$setViewValue(scope.date);
						ngModel.$render();

						if (closeOnDateSelection) {
							setOpen(false);
						}
					};

					element.bind('input change keyup', function() {
						scope.$apply(function() {
							scope.date = ngModel.$modelValue;
						});
					});

					// Outter change
					ngModel.$render = function() {
						var date = ngModel.$viewValue ? dateFilter(ngModel.$viewValue, dateFormat) : '';
						element.val(date);
						scope.date = ngModel.$modelValue;
					};

					function addWatchableAttribute(attribute, scopeProperty, datepickerAttribute) {
						if (attribute) {
							originalScope.$watch($parse(attribute), function(value) {
								scope[scopeProperty] = value;
							});
							datepickerEl.attr(datepickerAttribute || scopeProperty, scopeProperty);
						}
					}
					addWatchableAttribute(attrs.min, 'min');
					addWatchableAttribute(attrs.max, 'max');
					if (attrs.showWeeks) {
						addWatchableAttribute(attrs.showWeeks, 'showWeeks', 'show-weeks');
					} else {
						scope.showWeeks = 'show-weeks' in datepickerOptions ? datepickerOptions['show-weeks'] : datepickerConfig.showWeeks;
						datepickerEl.attr('show-weeks', 'showWeeks');
					}
					if (attrs.dateDisabled) {
						datepickerEl.attr('date-disabled', attrs.dateDisabled);
					}

					function updatePosition() {
						scope.position = appendToBody ? $position.offset(element) : $position.position(element);
						scope.position.top = scope.position.top + element.prop('offsetHeight');
					}

					var documentBindingInitialized = false,
						elementFocusInitialized = false;
					scope.$watch('isOpen', function(value) {
						if (value) {
							updatePosition();
							$document.bind('click', documentClickBind);
							if (elementFocusInitialized) {
								element.unbind('focus', elementFocusBind);
							}
							element[0].focus();
							documentBindingInitialized = true;
						} else {
							if (documentBindingInitialized) {
								$document.unbind('click', documentClickBind);
							}
							element.bind('focus', elementFocusBind);
							elementFocusInitialized = true;
						}

						if (setIsOpen) {
							setIsOpen(originalScope, value);
						}
					});

					scope.today = function() {
						scope.dateSelection(new Date());
					};
					scope.clear = function() {
						scope.dateSelection(null);
					};

					var $popup = $compile(popupEl)(scope);
					if (appendToBody) {
						$document.find('body').append($popup);
					} else {
						element.after($popup);
					}
				}
			};
		}
	])

	.directive('mlDatepickerPopupWrap', function() {
		return {
			restrict: 'EA',
			replace: true,
			transclude: true,
			templateUrl: '/statics/moneylover/datepicker/popup.html',
			link: function(scope, element, attrs) {
				element.bind('click', function(event) {
					event.preventDefault();
					event.stopPropagation();
				});
			}
		};
	});

	ML_a.module('tplsDatepicker', []).run(['$templateCache',
		function($templateCache) {
			$templateCache.put('/statics/moneylover/datepicker.html',
				'<table class="ml-datepicker">\n' +
				'	<thead>\n' +
				'		<tr>\n' +
				'			<th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n' +
				'			<th colspan="{{rows[0].length - 2 + showWeekNumbers}}"><button type="button" class="btn btn-default btn-sm btn-block" ng-click="toggleMode()"><strong>{{title}}</strong></button></th>\n' +
				'			<th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n' +
				'		</tr>\n' +
				'		<tr ng-show="labels.length > 0" class="h6">\n' +
				'			<th ng-show="showWeekNumbers" class="text-center">#</th>\n' +
				'			<th ng-repeat="label in labels" class="text-center">{{label}}</th>\n' +
				'		</tr>\n' +
				'	</thead>\n' +
				'	<tbody>\n' +
				'		<tr ng-repeat="row in rows">\n' +
				'			<td ng-show="showWeekNumbers" class="text-center"><em>{{ getWeekNumber(row) }}</em></td>\n' +
				'			<td ng-repeat="dt in row" class="text-center">\n' +
				'				<button type="button" style="width:100%;" class="btn btn-default btn-sm" ng-class="{\'btn-info\': dt.selected}" ng-click="select(dt.date)" ng-disabled="dt.disabled"><span ng-class="{\'text-muted\': dt.secondary}">{{dt.label}}</span></button>\n' +
				'			</td>\n' +
				'		</tr>\n' +
				'	</tbody>\n' +
				'</table>\n'
			);
		}
	]);

	ML_a.module('tplsDatePickerPopup', []).run(['$templateCache',
		function($templateCache) {
			$templateCache.put('/statics/moneylover/datepicker/popup.html',
				'<ul class="dropdown-menu" ng-style="{display: (isOpen && \'block\') || \'none\', top: position.top+\'px\', left: position.left+\'px\'}">\n' +
				'	<li ng-transclude></li>\n' +
				'	<li ng-show="showButtonBar" style="padding:10px 9px 2px">\n' +
				'		<span class="btn-group">\n' +
				'			<button type="button" class="btn btn-sm btn-info" ng-click="today()">{{currentText}}</button>\n' +
				'			<button type="button" class="btn btn-sm btn-default" ng-click="showWeeks = ! showWeeks" ng-class="{active: showWeeks}">{{toggleWeeksText}}</button>\n' +
				'			<button type="button" class="btn btn-sm btn-danger" ng-click="clear()">{{clearText}}</button>\n' +
				'		</span>\n' +
				'		<button type="button" class="btn btn-sm btn-success pull-right" ng-click="isOpen = false">{{closeText}}</button>\n' +
				'	</li>\n' +
				'</ul>\n'
			);
		}
	]);

	ML_a.module('ti.moneylover.element', ['ti.moneylover.elementUI'])
	.directive('mlDateView', function($compile){
		return {
			restrict: 'E',
			link: function(scope, element, attrs) {
				scope.$watch(
					function(scope) {
						return scope.$eval(attrs.mlDateData);
					},
					function(value) {
						element.html(value);
						$compile(element.contents())(scope);
					}
				);
			}
		}
	})
	.controller('mlCalendarCtrl', function($scope, $attrs){
	})
	.directive('mlCalendar', function($compile){
		return {
			restrict: 'E',
			templateUrl: '/statics/moneylover/calendar.html',
			require: ['ml-calendar', '?^ngModel'],
			controller: 'mlCalendarCtrl',
			link: function(scope, element, attrs, ctrls){
				var mlCalendarCtrl = ctrls[0],
					ngModel = ctrls[1];
				if (!ngModel) return;
			}
		}
	})
	.directive('mlCategoryView', function($compile){
		return {
			restrict: 'E',
			templateUrl: '/statics/moneylover/categoryView.html',
			link: function(scope, element, attrs) {}
		}
	}).directive('mlModalFooterCalendar', function(){
		return {
			restrict: 'E',
			templateUrl: '/statics/moneylover/calendar/footer.html',
			require: ['ml-modal-footer-calendar', '?^ngModel'],
			controller: 'mlCalendarCtrl',
			link: function(scope, element, attrs, ctrls){
				var mlCalendarCtrl = ctrls[0],
					ngModel = ctrls[1];
				if (!ngModel) return;
			}
		}
	}).directive('mlFormatCurrency', function($rootScope){
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function(scope, element, attrs, modelCtrl){
				var amountSetting = $rootScope.userLogged.setting.setting_amount_display,
					decimalSeparatorSetting = amountSetting.decimalSeparator ? amountSetting.decimalSeparator : 0,
					decimalSeparator	= [{decimal: '.', thousand: ','}, {decimal: ',', thousand: '.'}],
					decimal				= decimalSeparator[decimalSeparatorSetting].decimal,
					thousand			= decimalSeparator[decimalSeparatorSetting].thousand,
					format = {
						precision	: 0,
						thousand	: thousand,
						decimal		: decimal
					};

				function covertCurrency(value){
					return convertEmptyValue(value);
				};

				var transformedInput;
				var tmpDecimal = 0;
				var tmpSplit = false;
				var enabedFormat = false;
				scope.$watch(attrs.ngModel, function (v){
					if(v.toString().length >= 24) transformedInput = v.substr(0,24);
					else transformedInput = v.toString();
					// element[0].setSelectionRange(0,0);
					var getDecimal = transformedInput.split(decimal);
					if(getDecimal.length === 2){
						enabedFormat = false;
						if(!tmpSplit){
							tmpDecimal = getDecimal[0].length;
							tmpSplit = true;
						}
						if(getDecimal[1].length === 0){
							format.precision = 1;
						} else if(getDecimal[1].length === 1){
							format.precision = 1;
						} else if(getDecimal[1].length > 1){
							format.precision = 2;
						}
						if(tmpDecimal != getDecimal[0].length || getDecimal[1].length > 2){
							tmpDecimal = getDecimal[0].length;
							enabedFormat = true;
						}
					} else {
						tmpSplit = false;
						format.precision = 0;
						enabedFormat = true;
					}

					if(getDecimal.length > 2) transformedInput = transformedInput.replace('.' + getDecimal[2], '');

					if(enabedFormat) transformedInput = accounting.formatNumber(transformedInput, format);
					modelCtrl.$setViewValue(transformedInput);
					modelCtrl.$render();
					return transformedInput;
				});
			}
		}
	});

	ML_a.module('ti.moneylover.elementUI', []).run(['$templateCache', function($templateCache){
		$templateCache.put('/statics/moneylover/categoryView.html',
			'<div class="ml-category-view" ng-click="selectCategory()" ng-class="{\'selected\': transaction.category._id }">' +
				'<div class="icon-category"><img ng-src="{{transaction.category.icon|generateIconLink}}" alt="{{ transaction.category.name | categoryParseName:transaction.category.metadata }}" /></div>' +
				'<div class="title-category"><h3>{{ transaction.category.name | categoryParseName:transaction.category.metadata }}</h3></div>' +
			'</div>'
		);
		$templateCache.put('/statics/moneylover/calendar.html',
			'<div class="full-calendar">' +
				'<div class="ml-calendar-day"><h4>{{ dt | date:\'EEEE\'}}</h3></div>' +
				'<div class="ml-calendar-month"><h3>{{ dt | date: \'MMMM\' }}</h3></div>' +
				'<div class="ml-calendar-date"><h1>{{ dt | date: \'dd\' }}</h1></div>' +
				'<div class="ml-calendar-year"><h3>{{ dt | date: \'yyyy\' }}</h3></div>' +
			'</div>');
		$templateCache.put('/statics/moneylover/calendar/footer.html',
			'<div class="modal-footer">' +
			'<button type="button" class="btn btn-primary" ng-click="selectDate(dt)">{{ \'done\' | translate }}</button>' +
			'</div>');
		$templateCache.put('/partials/debts.html', "" );
		$templateCache.put('/partials/events.html', "" );
		$templateCache.put('/partials/home.html', "<div class=\"row\">\r\n\t<div class=\"moneylover-background\">\r\n\t\t<img src=\"/img/logo.png\" alt=\"Money Lover\" />\r\n\t</div>\r\n</div>" );
		$templateCache.put('/partials/savings.html', "" );
		$templateCache.put('/partials/trends.html', "" );
		$templateCache.put('/partials/wallet.html', "<!-- Boxes -->\r\n<div class=\"row\">\r\n\r\n\t<div class=\"col-lg-2\">\r\n\r\n\t\t<div class=\"box-module\">\r\n\t\t\t<small>{{ 'account' | translate }}</small>\r\n\t\t\t<h3 class=\"stats-positive\"><i class=\"icon-caret-up\"></i> {{ 32000 | MLCurrency }}\r\n\t\t\t\t<span>+0.3</span>\r\n\t\t\t</h3>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n\t<div class=\"col-lg-2\">\r\n\r\n\t\t<div class=\"box-module module-red\">\r\n\t\t\t<small>{{ 'navigation_store2' | translate }}</small>\r\n\t\t\t<h3 class=\"stats-negative\"><i class=\"icon-caret-down\"></i> $500\r\n\t\t\t\t<span>-14%</span>\r\n\t\t\t</h3>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n\t<div class=\"col-lg-2\">\r\n\r\n\t\t<div class=\"box-module box-module-fill\">\r\n\t\t\t<small>Current position</small>\r\n\t\t\t<h3 class=\"stats-stagnant\"><i class=\"icon-caret-right\"></i> 1300\r\n\t\t\t\t<span>+100</span>\r\n\t\t\t</h3>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n\t<div class=\"col-lg-2\">\r\n\r\n\t\t<div class=\"box-module module-green\">\r\n\t\t\t<small>Overdue orders</small>\r\n\t\t\t<h3><i class=\"icon-usd\"></i> 2\r\n\t\t\t\t<span>2013/05/22</span>\r\n\t\t\t</h3>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n\t<div class=\"col-lg-2\">\r\n\r\n\t\t<div class=\"box-module module-orange\">\r\n\t\t\t<small>Small graph</small>\r\n\t\t\t<span class=\"mini-graph sparkline-bar\">65,63,43,55,47</span>\r\n\t\t\t<h3 class=\"stats-positive\"><i class=\"icon-caret-up\"></i> 13.400</h3>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n\t<div class=\"col-lg-2\">\r\n\r\n\t\t<div class=\"box-module\">\r\n\t\t\t<small>Numbers game</small>\r\n\t\t\t<h3 class=\"stats-negative\"><i class=\"icon-chevron-down\"></i> 32\r\n\t\t\t\t<span>-2</span>\r\n\t\t\t</h3>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n</div>\r\n<!-- /Boxes -->\r\n\r\n<!-- Graphs -->\r\n<div class=\"row\">\r\n\r\n\t<div class=\"col-lg-12\">\r\n\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>STATISTICS</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\r\n\t\t\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t\t\t<span>Site visits</span>\r\n\t\t\t\t</h4>\r\n\r\n\t\t\t\t<div id=\"chart1\" class=\"chart\"></div>\r\n\r\n\t\t\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t\t\t<span>Server status</span>\r\n\t\t\t\t</h4>\r\n\r\n\t\t\t\t<div id=\"chart2\" class=\"chart\"></div>\r\n\r\n\t\t\t</div>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\r\n</div>\r\n<!-- /Graphs -->\r\n\r\n<div class=\"row\">\r\n\r\n\t<!-- Tasks -->\r\n\t<div class=\"col-lg-5\">\r\n\r\n\t\t<div class=\"module no-padding\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>TASKS</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<ul class=\"list-tasks\">\r\n\t\t\t\t\t<li class=\"task-header task-overdue\">OVERDUE</li>\r\n\t\t\t\t\t<li class=\"task-tag-red\">\r\n\t\t\t\t\t\t<span class=\"sparkline-pie\">4,6,6</span>\r\n\t\t\t\t\t\t<small>July 16, 2013</small>\r\n\t\t\t\t\t\t<a href=\"#\">Reinstall OS</a>\r\n\t\t\t\t\t\t<i class=\"icon-code icon-2x\"></i>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li class=\"task-tag-yellow\">\r\n\t\t\t\t\t\t<span class=\"sparkline-pie\">5,1</span>\r\n\t\t\t\t\t\t<small>July 14, 2013</small>\r\n\t\t\t\t\t\t<a href=\"#\">Install new hardware</a>\r\n\t\t\t\t\t\t<i class=\"icon-code icon-2x\"></i>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li>\r\n\t\t\t\t\t\t<span class=\"sparkline-pie\">50, 50</span>\r\n\t\t\t\t\t\t<small>July 14, 2013</small>\r\n\t\t\t\t\t\t<a href=\"#\">Do unit testing</a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li class=\"task-header\">TOMORROW</li>\r\n\t\t\t\t\t<li class=\"task-tag-green\">\r\n\t\t\t\t\t\t<span class=\"sparkline-pie\">100, 100, 40</span>\r\n\t\t\t\t\t\t<small>July 12, 2013</small>\r\n\t\t\t\t\t\t<a href=\"#\">Check server status</a>\r\n\t\t\t\t\t\t<i class=\"icon-folder-close icon-2x\"></i>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li>\r\n\t\t\t\t\t\t<span class=\"sparkline-pie\">4,6</span>\r\n\t\t\t\t\t\t<small>July 11, 2013</small>\r\n\t\t\t\t\t\t<a href=\"#\">Delete all nudes from fb</a>\r\n\t\t\t\t\t\t<i class=\"icon-code icon-2x\"></i>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li class=\"task-header\">FINISHED</li>\r\n\t\t\t\t\t<li>\r\n\t\t\t\t\t\t<span><i class=\"icon-check-sign\"></i>\r\n\t\t\t\t\t\t</span>\r\n\t\t\t\t\t\t<small>July 09, 2013</small>\r\n\t\t\t\t\t\t<a href=\"#\">Be productive</a>\r\n\t\t\t\t\t\t<i class=\"icon-lock icon-2x\"></i>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t</ul>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\t<!-- /Tasks -->\r\n\r\n\t<!-- Activity feed -->\r\n\t<div class=\"col-lg-7\">\r\n\r\n\t\t<div class=\"module module-orange\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>ACTIVITY FEED</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\r\n\t\t\t\t<div class=\"activity-feed-wrapper\">\r\n\t\t\t\t\t<div class=\"activity-feed-items\">\r\n\t\t\t\t\t\t<div class=\"activity-feed-item\">\r\n\t\t\t\t\t\t\t<span>.</span>\r\n\t\t\t\t\t\t\t<h4><i class=\"icon-comment\"></i> New comment</h4>\r\n\t\t\t\t\t\t\t<p>Suspendisse vehicula sollicitudin felis ut rutrum. Phasellus sagittis est sit amet eros suscipit lobortis. Donec sed facilisis turpis, vel blandit sapien</p>\r\n\t\t\t\t\t\t\t<small>administrator &middot; 25 seconds ago</small>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t\t<div class=\"activity-feed-item\">\r\n\t\t\t\t\t\t\t<span>.</span>\r\n\t\t\t\t\t\t\t<h4><i class=\"icon-picture\"></i> Added 12 new pictures to gallery</h4>\r\n\t\t\t\t\t\t\t<p>Nullam ac lectus massa. Sed ligula tellus, suscipit ac nibh non, tristique fringilla dui. Aenean semper sed dui non sagittis. Nunc nec aliquet augue, quis ultrices libero. Donec sagittis mauris non nisl placerat, a tristique urna fringilla. Nulla vitae aliquam felis. Maecenas et accumsan odio. Donec non varius elit, nec accumsan mauris. Aenean ac sollicitudin sapien. Sed ac turpis nisi. Curabitur facilisis molestie neque, et elementum eros interdum congue. Morbi eu ultrices lorem, eu auctor lorem. Integer odio eros, facilisis quis tincidunt non, facilisis sed arcu.</p>\r\n\t\t\t\t\t\t\t<small>john doe &middot; 3 minutes ago</small>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t\t<div class=\"activity-feed-item\">\r\n\t\t\t\t\t\t\t<span>.</span>\r\n\t\t\t\t\t\t\t<h4>New job listing</h4>\r\n\t\t\t\t\t\t\t<p>Ut in euismod quam, quis pharetra tellus. Nulla pulvinar metus nec ultrices ultricies.</p>\r\n\t\t\t\t\t\t\t<small>mick soften &middot; 12 minutes ago</small>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\r\n\t\t\t</div>\r\n\t\t</div>\r\n\r\n\t</div>\r\n\t<!-- /Activity feed -->\r\n</div>\r\n<div class=\"row\">\r\n\t<div class=\"col-lg-7\">\r\n\t\t<div class=\"module module-red\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4><i class=\"icon-calendar\"></i> CALENDAR</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<div id=\"calendar\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"col-lg-5\">\r\n\t\t<div class=\"row\">\r\n\t\t\t<!-- Knobs -->\r\n\t\t\t<div class=\"col-lg-12\">\r\n\r\n\t\t\t\t<div class=\"module module-blue\">\r\n\t\t\t\t\t<div class=\"module-header\">\r\n\t\t\t\t\t\t<h4>KNOBS</h4>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"content text-center\">\r\n\t\t\t\t\t\t<div class=\"donut-stats\">\r\n\t\t\t\t\t\t\t<input type=\"text\" class=\"dial\" value=\"35\" data-fgColor=\"#2b3035\" />\r\n\t\t\t\t\t\t\t<h4>New players</h4>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t\t<div class=\"donut-stats\">\r\n\t\t\t\t\t\t\t<input type=\"text\" class=\"dial\" value=\"54\" data-fgColor=\"#ffce55\" />\r\n\t\t\t\t\t\t\t<h4>Growth increse</h4>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t\t<div class=\"donut-stats\">\r\n\t\t\t\t\t\t\t<input type=\"text\" class=\"dial\" value=\"76\" data-fgColor=\"#d54a51\" />\r\n\t\t\t\t\t\t\t<h4>New orders</h4>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t\t<div class=\"donut-stats\">\r\n\t\t\t\t\t\t\t<input type=\"text\" class=\"dial\" value=\"22\" data-fgColor=\"#ec87c1\" />\r\n\t\t\t\t\t\t\t<h4>Pizza income</h4>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t\t<!-- /Knobs -->\r\n\t\t</div>\r\n\t\t<div class=\"row\">\r\n\t\t\t<!-- User list -->\r\n\t\t\t<div class=\"col-lg-12\">\r\n\t\t\t\t<div class=\"module module-purple\">\r\n\t\t\t\t\t<div class=\"module-header\">\r\n\t\t\t\t\t\t<h4>USER LIST</h4>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"module-content\">\r\n\t\t\t\t\t\t<ul class=\"user-list\">\r\n\t\t\t\t\t\t\t<li>\r\n\t\t\t\t\t\t\t\t<img src=\"/img/placeholder1.jpg\" alt=\"Avatar\" />\r\n\t\t\t\t\t\t\t\t<a href=\"#\">Russel Madden <small>Administrator</small></a>\r\n\t\t\t\t\t\t\t\t<i class=\"icon-circle status-online\"></i>\r\n\t\t\t\t\t\t\t</li>\r\n\t\t\t\t\t\t\t<li>\r\n\t\t\t\t\t\t\t\t<img src=\"/img/placeholder2.jpg\" alt=\"Avatar\" />\r\n\t\t\t\t\t\t\t\t<a href=\"#\">Orlando Hayes <small>Administrator</small></a>\r\n\t\t\t\t\t\t\t\t<i class=\"icon-circle status-online\"></i>\r\n\t\t\t\t\t\t\t</li>\r\n\t\t\t\t\t\t\t<li>\r\n\t\t\t\t\t\t\t\t<img src=\"/img/placeholder3.jpg\" alt=\"Avatar\" />\r\n\t\t\t\t\t\t\t\t<a href=\"#\">Stanley Stout <small>Administrator</small></a>\r\n\t\t\t\t\t\t\t\t<i class=\"icon-circle status-offline\"></i>\r\n\t\t\t\t\t\t\t</li>\r\n\t\t\t\t\t\t\t<li>\r\n\t\t\t\t\t\t\t\t<img src=\"/img/placeholder4.jpg\" alt=\"Avatar\" />\r\n\t\t\t\t\t\t\t\t<a href=\"#\">Thomas Olson <small>Administrator</small></a>\r\n\t\t\t\t\t\t\t\t<i class=\"icon-circle status-online\"></i>\r\n\t\t\t\t\t\t\t</li>\r\n\t\t\t\t\t\t\t<li>\r\n\t\t\t\t\t\t\t\t<img src=\"/img/placeholder5.jpg\" alt=\"Avatar\" />\r\n\t\t\t\t\t\t\t\t<a href=\"#\">Ryan Hawkings <small>Administrator</small></a>\r\n\t\t\t\t\t\t\t\t<i class=\"icon-circle status-online\"></i>\r\n\t\t\t\t\t\t\t</li>\r\n\t\t\t\t\t\t</ul>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\r\n\t\t\t</div>\r\n\t\t\t<!-- /User list -->\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n" );
		$templateCache.put('/partials/category/category-list.html', "<ul id=\"categoryTab\" class=\"nav nav-tabs\">\r\n\t<li ng-class=\"{active: !categoryTab}\"><a href=\"#\" ng-click=\"categoryTab=0\">{{ 'income' | translate }}</a></li>\r\n\t<li ng-class=\"{active: categoryTab}\"><a href=\"#\" ng-click=\"categoryTab=1\">{{ 'expense' | translate }}</a></li>\r\n</ul>\r\n\r\n<div id=\"categoryTabContent\" class=\"tab-content\">\r\n\t<div class=\"tab-pane fade in\" id=\"categoryIncomeTab\" ng-class=\"{active: !categoryTab}\">\r\n\t\t<div class=\"fade-animate\" scope=\"categories\" ng-include=\"'/partials/category/list-income.html'\"></div>\r\n\t</div>\r\n\t<div class=\"tab-pane fade in\" id=\"categoryExpenseTab\" ng-class=\"{active: categoryTab}\">\r\n\t\t<div class=\"fade-animate\" scope=\"categories\" ng-include=\"'/partials/category/list-expense.html'\"></div>\r\n\t</div>\r\n</div>" );
		$templateCache.put('/partials/category/category.html', "<div class=\"row\">\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module no-padding\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ 'category_manager_title' | translate }}</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<div class=\"fade-animate\" ng-include=\"'/partials/category/list.html'\" onload=\"getListCategory({type:0, getsub: true})\" scope=\"categoryTab\" ng-init=\"categoryTab=0\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ categoryDetailTitle | translate }}</h4>\r\n\t\t\t\t<div class=\"btn-action-manager\">\r\n\t\t\t\t\t<button class=\"btn btn-default\" tooltip=\"Edit\" ng-click=\"editWallet()\"><i class=\"icon-pencil\"></i></button>\r\n\t\t\t\t\t<button class=\"btn btn-primary\" tooltip=\"New category\" ng-click=\"newWallet()\"><i class=\"icon-plus\"></i></button>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<div ng-include=\"'/partials/category/detail.html'\" onload=\"detailDefault()\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n" );
		$templateCache.put('/partials/category/detail.html', "<form name=\"frmCategory\" ng-submit=\"submitCategory()\">\r\n\t<div class=\"input-avatar\">\r\n\t\t<div class=\"input-avatar-preview\">\r\n\t\t\t<img ng-src=\"{{ categoryInfo.icon | generateIconLink }}\" />\r\n\t\t\t<span></span>\r\n\t\t</div>\r\n\t</div>\r\n\r\n\t<div class=\"form-group\">\r\n\t\t<label for=\"inputCategoryName\" class=\"control-label\">{{ 'create_category_hint_name_review' | translate }}</label>\r\n\t\t<input id=\"inputCategoryName\" type=\"text\" class=\"form-control\" ng-model=\"categoryInfo.name\" ng-disabled=\"categoryInfo.metadata | lockCategory\" value=\"{{ categoryInfo.name | categoryParseName:categoryInfo.metadata }}\">\r\n\t</div>\r\n\r\n\t<div class=\"form-group\">\r\n\t\t<label class=\"control-label\">{{'create_category_parent_category' | translate}}</label>\r\n\t\t<input type=\"text\" class=\"form-control\" ng-model=\"categoryInfo.parent.name\" ng-disabled=\"categoryInfo.metadata | lockCategory\" ng-click=\"selectParentCategory()\">\r\n\t</div>\r\n\r\n\t<div class=\"form-group\">\r\n\t\t<label class=\"control-label\">{{ 'create_category_type_review' | translate }}: </label>\r\n\t\t<div class=\"radio-inline\">\r\n\t\t\t<label class=\"control-label\">\r\n\t\t\t\t<input type=\"radio\" ng-model=\"categoryInfo.type\" value=\"1\" name=\"type\" ng-disabled=\"categoryInfo.metadata | lockCategory\">{{ 'income' | translate }}\r\n\t\t\t</label>\r\n\t\t</div>\r\n\t\t<div class=\"radio-inline\">\r\n\t\t\t<label class=\"control-label\">\r\n\t\t\t\t<input type=\"radio\" ng-model=\"categoryInfo.type\" value=\"2\" name=\"type\" ng-disabled=\"categoryInfo.metadata | lockCategory\">{{ 'expense' | translate }}\r\n\t\t\t</label>\r\n\t\t</div>\r\n\t</div>\r\n\r\n\t<div class=\"form-group\">\r\n\t\t<label class=\"control-label\">{{'create_category_select_account_title' | translate}}</label>\r\n\t\t<input type=\"text\" class=\"form-control\" disabled value=\"{{ wallet.name }}\">\r\n\t</div>\r\n\r\n\t<input type=\"hidden\" ng-model=\"categoryInfo.icon\">\r\n\t<input type=\"hidden\" ng-model=\"categoryInfo._id\">\r\n\r\n\t<div class=\"form-group\">\r\n\t\t<input type=\"submit\" class=\"btn btn-primary\" value=\"Save\">\r\n\t\t<a type=\"reset\" class=\"btn btn-default\" ng-click=\"detailDefault()\">Cancel</a>\r\n\t\t<a class=\"btn btn-default\" ng-click=\"newCategory()\">{{ 'create_category_title' | translate }}</a>\r\n\t</div>\r\n</form>\r\n" );
		$templateCache.put('/partials/category/item.html', "<span class=\"sparkline-pie category-icon\">\r\n\t<img class=\"category-icon\" ng-src=\"{{ category.icon | generateIconLink}}\" alt=\"{{ category.name }}\" />\r\n</span>\r\n<a class=\"category-name\" href=\"#\" ng-click=\"selectCategory(category)\">{{ category.name | categoryParseName:category.metadata }}</a>\r\n<i class=\"cateogry-action icon-cogs icon-2x\" ng-click=\"selectCategory(category)\"></i>\r\n<i class=\"icon-lock icon-2x\" ng-show=\"category.metadata | lockCategory\"></i>" );
		$templateCache.put('/partials/category/list-expense.html', "<ul class=\"list-tasks\">\r\n\t<li id=\"category-{{ category._id }}\" class=\"category-item animate-repeat\" ng-repeat=\"category in categories | categoryFilter:2 track by $index\">\r\n\t\t<div class=\"clearfix\" ng-include=\"'/partials/category/item.html'\"></div>\r\n\t\t<ul class=\"list-tasks category-sub\" ng-include=\"'/partials/category/list-sub.html'\" ng-if=\"category.child | validateSubCate:displaySub\"></ul>\r\n\t</li>\r\n</ul>" );
		$templateCache.put('/partials/category/list-income.html', "<ul class=\"list-tasks\">\r\n\t<li id=\"category-{{ category._id }}\" class=\"category-item animate-repeat\" ng-repeat=\"category in categories | categoryFilter:1 track by $index\">\r\n\t\t<div class=\"clearfix\" ng-include=\"'/partials/category/item.html'\"></div>\r\n\t\t<ul class=\"list-tasks category-sub\" ng-include=\"'/partials/category/list-sub.html'\" ng-if=\"category.child | validateSubCate\"></ul>\r\n\t</li>\r\n</ul>" );
		$templateCache.put('/partials/category/list-sub.html', "<li id=\"category-{{ category._id }}\" class=\"task-tag-yellow category-item animate-repeat\" ng-repeat=\"category in category.child track by $index\">\r\n\t<div class=\"clearfix\" ng-include=\"'/partials/category/item.html'\"></div>\r\n</li>\r\n" );
		$templateCache.put('/partials/category/list.html', "<ul id=\"categoryTab\" class=\"nav nav-tabs\">\r\n\t<li ng-class=\"{active: !categoryTab}\"><a href=\"#\" ng-click=\"categoryTab=0\">{{ 'income' | translate }}</a></li>\r\n\t<li ng-class=\"{active: categoryTab}\"><a href=\"#\" ng-click=\"categoryTab=1\">{{ 'expense' | translate }}</a></li>\r\n</ul>\r\n\r\n<div id=\"categoryTabContent\" class=\"tab-content\">\r\n\t<div class=\"tab-pane fade in\" id=\"categoryIncomeTab\" ng-class=\"{active: !categoryTab}\">\r\n\t\t<div class=\"fade-animate\" scope=\"categories\" ng-include=\"'/partials/category/list-income.html'\"></div>\r\n\t</div>\r\n\t<div class=\"tab-pane fade in\" id=\"categoryExpenseTab\" ng-class=\"{active: categoryTab}\">\r\n\t\t<div class=\"fade-animate\" scope=\"categories\" ng-include=\"'/partials/category/list-expense.html'\"></div>\r\n\t</div>\r\n</div>\r\n" );
		$templateCache.put('/partials/modal/errorChangeWallet.html', "<div class=\"modal-body\">\r\n\t{{ 'do_not_change_wallet_this_page' | translate }}\r\n</div>\r\n<div class=\"modal-footer error-footer\">\r\n\t<button type=\"button\" class=\"btn btn-default\" ng-click=\"close()\">{{ 'close' | translate }}</button>\r\n</div>" );
		$templateCache.put('/partials/modal/selectCategory.html', "<div class=\"modal-header\">\r\n\t<button type=\"button\" class=\"close\" ng-click=\"cancel()\">&times;</button>\r\n\t<h4 class=\"modal-title title\">{{ 'add_transaction_category_title' | translate }}</h4>\r\n</div>\r\n<div class=\"modal-body\">\r\n\t<div class=\"fade-animate\" ng-include=\"'/partials/category/list.html'\" scope=\"categoryTab\" ng-init=\"categoryTab=0\"></div>\r\n</div>" );
		$templateCache.put('/partials/modal/selectCurrency.html', "<div class=\"modal-header\">\r\n\t<button type=\"button\" class=\"close\" ng-click=\"cancel()\">&times;</button>\r\n\t<h4 class=\"modal-title title\">{{ 'add_account_currency_title' | translate }}</h4>\r\n</div>\r\n<div class=\"modal-body\">\r\n\t<div class=\"list-currency\">\r\n\t\t<div class=\"input-group search-currency\">\r\n\t\t\t<div class=\"input-group\">\r\n\t\t\t\t<span class=\"input-group-addon\"><i class=\"icon-search\"></i></span>\r\n\t\t\t\t<input type=\"text\" class=\"form-control\" ng-model=\"searchKeyword\" placeholder=\"{{ 'search' | translate }}\">\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t\t<div class=\"disply-list-currency\">\r\n\t\t\t<div class=\"animate-repeat\" ng-repeat=\"currency in currencyList | filter:searchKeyword\">\r\n\t\t\t\t<div class=\"select-currency\" ng-click=\"setCurrency(currency)\" ng-class=\"{selected: (currency | currencySelected:currencySelect) }\">\r\n\t\t\t\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t\t\t\t<span>{{ currency.n }}</span>\r\n\t\t\t\t\t</h4>\r\n\t\t\t\t\t<span class=\"currency-symbol\">{{ currency.s }}</span>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>" );
		$templateCache.put('/partials/modal/selectDate.html', "<div  ng-controller=\"DatepickerCtrl\">\n\t<div class=\"modal-header\">\n\t\t<button type=\"button\" class=\"close\" ng-click=\"cancel()\">&times;</button>\n\t\t<h4 class=\"modal-title title\">Calendar</h4>\n\t</div>\n\t<div class=\"modal-body\">\n\t\t<div class=\"row\">\n\t\t\t<div class=\"col-md-6\">\n\t\t\t\t<ml-calendar></ml-calendar>\n\t\t\t</div>\n\t\t\t<div class=\"col-md-6\">\n\t\t\t\t<div style=\"min-height:215px;\">\n\t\t\t\t\t<div ng-model=\"dt\">\n\t\t\t\t\t\t<ml-datepicker min=\"minDate\" show-weeks=\"showWeeks\"></ml-datepicker>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n\t<ml-modal-footer-calendar></ml-modal-footer-calendar>\n</div>" );
		$templateCache.put('/partials/statics/about.html', "<div class=\"alert alert-success alert-dismissable\">\r\n\t<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\"><i class=\"icon-remove-sign\"></i>\r\n\t</button>\r\n\t<strong>Well done!</strong>You successfully read this important alert message.\r\n</div>\r\n<div class=\"alert alert-info alert-dismissable\">\r\n\t<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\"><i class=\"icon-remove-sign\"></i>\r\n\t</button>\r\n\t<strong>Well done!</strong>You successfully read this important alert message.\r\n</div>\r\n<div class=\"alert alert-warning alert-dismissable\">\r\n\t<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\"><i class=\"icon-remove-sign\"></i>\r\n\t</button>\r\n\t<strong>Well done!</strong>You successfully read this important alert message.\r\n</div>\r\n<div class=\"alert alert-danger alert-dismissable\">\r\n\t<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\"><i class=\"icon-remove-sign\"></i>\r\n\t</button>\r\n\t<strong>Well done!</strong>You successfully read this important alert message.\r\n</div>\r\n\r\n<div class=\"row\">\r\n\r\n\t<!-- Heading and paragraphs -->\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>HEADINGS</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<h1 style=\"margin-top: 0;\">Header 1 Typography</h1>\r\n\t\t\t\t<p>\r\n\t\t\t\t\tHam hamburger beef ribs bresaola meatloaf strip steak ground round, fatback cow flank prosciutto. Pig swine pancetta bresaola, ham hock tail corned beef prosciutto capicola biltong kielbasa. Frankfurter leberkas tail hamburger. Sausage frankfurter pig, pancetta turkey tongue strip steak ham brisket salami. Frankfurter bacon pastrami, drumstick brisket biltong jerky.\r\n\t\t\t\t</p>\r\n\t\t\t\t<h2>Header 2 Typography</h2>\r\n\t\t\t\t<p>\r\n\t\t\t\t\tHam hamburger beef ribs bresaola meatloaf strip steak ground round, fatback cow flank prosciutto. Pig swine pancetta bresaola, ham hock tail corned beef prosciutto capicola biltong kielbasa.\r\n\t\t\t\t</p>\r\n\t\t\t\t<h3>Header 3 Typography</h3>\r\n\t\t\t\t<p>\r\n\t\t\t\t\tHam hamburger beef ribs bresaola meatloaf strip steak ground round, fatback cow flank prosciutto.\r\n\t\t\t\t</p>\r\n\t\t\t\t<h4>Header 4 Typography</h4>\r\n\t\t\t\t<h5>Header 5 Typography</h5>\r\n\t\t\t\t<h6>Header 6 Typography</h6>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Heading and paragraphs -->\r\n\r\n\t<!-- Emphasis classes -->\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>EMPHASIS</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<p>\r\n\t\t\t\t\tHam hamburger beef ribs bresaola meatloaf strip steak ground round, fatback cow flank prosciutto. Pig swine pancetta bresaola, ham hock tail corned beef prosciutto capicola biltong kielbasa. Frankfurter leberkas tail hamburger. Sausage frankfurter pig, pancetta turkey tongue strip steak ham brisket salami. Frankfurter bacon pastrami, drumstick brisket biltong jerky.\r\n\t\t\t\t</p>\r\n\t\t\t\t<p class=\"text-muted\">Fusce dapibus, tellus ac cursus commodo, tortor mauris nibh.</p>\r\n\t\t\t\t<p class=\"text-primary\">Nullam id dolor id nibh ultricies vehicula ut id elit.</p>\r\n\t\t\t\t<p class=\"text-success\">Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>\r\n\t\t\t\t<p class=\"text-info\">Maecenas sed diam eget risus varius blandit sit amet non magna.</p>\r\n\t\t\t\t<p class=\"text-warning\">Etiam porta sem malesuada magna mollis euismod.</p>\r\n\t\t\t\t<p class=\"text-danger\">Donec ullamcorper nulla non metus auctor fringilla.</p>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Emphasis classes -->\r\n\r\n</div>\r\n\r\n<div class=\"row\">\r\n\r\n\t<!-- Blockquotes -->\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>BLOCKQUOTES</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\t\t\t\t<blockquote>\r\n\t\t\t\t\t<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.</p>\r\n\t\t\t\t</blockquote>\r\n\r\n\t\t\t\t<blockquote>\r\n\t\t\t\t\t<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.</p>\r\n\t\t\t\t\t<small>Someone famous in\r\n\t\t\t\t\t\t<cite title=\"Source Title\">Source Title</cite>\r\n\t\t\t\t\t</small>\r\n\t\t\t\t</blockquote>\r\n\r\n\t\t\t\t<blockquote class=\"pull-right\">\r\n\t\t\t\t\t<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.</p>\r\n\t\t\t\t</blockquote>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Blockquotes -->\r\n\r\n\t<!-- UL List -->\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>INLINE LIST</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\t\t\t\t<ul class=\"list-inline\">\r\n\t\t\t\t\t<li>Lorem ipsum</li>\r\n\t\t\t\t\t<li>Phasellus iaculis</li>\r\n\t\t\t\t\t<li>Nulla volutpat</li>\r\n\t\t\t\t</ul>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /UL List -->\r\n\r\n</div>\r\n\r\n<div class=\"row\">\r\n\r\n\t<!-- OL List -->\r\n\t<div class=\"col-lg-4\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>ORDERED LIST</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\t\t\t\t<ol>\r\n\t\t\t\t\t<li>Lorem ipsum dolor sit amet</li>\r\n\t\t\t\t\t<li>Consectetur adipiscing elit</li>\r\n\t\t\t\t\t<li>Integer molestie lorem at massa</li>\r\n\t\t\t\t\t<li>Facilisis in pretium nisl aliquet</li>\r\n\t\t\t\t\t<li>Nulla volutpat aliquam velit</li>\r\n\t\t\t\t\t<li>Faucibus porta lacus fringilla vel</li>\r\n\t\t\t\t\t<li>Facilisis in pretium nisl aliquet</li>\r\n\t\t\t\t\t<li>Nulla volutpat aliquam velit</li>\r\n\t\t\t\t\t<li>Faucibus porta lacus fringilla vel</li>\r\n\t\t\t\t\t<li>Aenean sit amet erat nunc</li>\r\n\t\t\t\t\t<li>Eget porttitor lorem</li>\r\n\t\t\t\t\t<li>Aenean sit amet erat nunc</li>\r\n\t\t\t\t</ol>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /OL List -->\r\n\r\n\t<!-- Unstyled List -->\r\n\t<div class=\"col-lg-4\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>UNSTYLED LIST</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\t\t\t\t<ul class=\"list-unstyled\">\r\n\t\t\t\t\t<li>Lorem ipsum dolor sit amet</li>\r\n\t\t\t\t\t<li>Consectetur adipiscing elit</li>\r\n\t\t\t\t\t<li>Integer molestie lorem at massa</li>\r\n\t\t\t\t\t<li>Facilisis in pretium nisl aliquet</li>\r\n\t\t\t\t\t<li>Nulla volutpat aliquam velit\r\n\t\t\t\t\t\t<ul>\r\n\t\t\t\t\t\t\t<li>Phasellus iaculis neque</li>\r\n\t\t\t\t\t\t\t<li>Purus sodales ultricies</li>\r\n\t\t\t\t\t\t\t<li>Vestibulum laoreet porttitor sem</li>\r\n\t\t\t\t\t\t\t<li>Ac tristique libero volutpat at</li>\r\n\t\t\t\t\t\t</ul>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li>Faucibus porta lacus fringilla vel</li>\r\n\t\t\t\t\t<li>Aenean sit amet erat nunc</li>\r\n\t\t\t\t\t<li>Eget porttitor lorem</li>\r\n\t\t\t\t</ul>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Unstyled List -->\r\n\r\n\t<!-- Inline List -->\r\n\t<div class=\"col-lg-4\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>UNORDERD LIST</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\t\t\t\t<ul>\r\n\t\t\t\t\t<li>Lorem ipsum dolor sit amet</li>\r\n\t\t\t\t\t<li>Consectetur adipiscing elit</li>\r\n\t\t\t\t\t<li>Integer molestie lorem at massa</li>\r\n\t\t\t\t\t<li>Facilisis in pretium nisl aliquet</li>\r\n\t\t\t\t\t<li>Nulla volutpat aliquam velit\r\n\t\t\t\t\t\t<ul>\r\n\t\t\t\t\t\t\t<li>Phasellus iaculis neque</li>\r\n\t\t\t\t\t\t\t<li>Purus sodales ultricies</li>\r\n\t\t\t\t\t\t\t<li>Vestibulum laoreet porttitor sem</li>\r\n\t\t\t\t\t\t\t<li>Ac tristique libero volutpat at</li>\r\n\t\t\t\t\t\t</ul>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li>Faucibus porta lacus fringilla vel</li>\r\n\t\t\t\t\t<li>Aenean sit amet erat nunc</li>\r\n\t\t\t\t\t<li>Eget porttitor lorem</li>\r\n\t\t\t\t</ul>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Inline List -->\r\n\r\n</div>\r\n\r\n<div class=\"row\">\r\n\r\n\t<!-- Labels -->\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>LABELS</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\t\t\t\t<span class=\"label label-default\">Default</span>\r\n\t\t\t\t<span class=\"label label-primary\">Primary</span>\r\n\t\t\t\t<span class=\"label label-success\">Success</span>\r\n\t\t\t\t<span class=\"label label-info\">Info</span>\r\n\t\t\t\t<span class=\"label label-warning\">Warning</span>\r\n\t\t\t\t<span class=\"label label-danger\">Danger</span>\r\n\t\t\t\t<h3>Example heading\r\n\t\t\t\t\t<span class=\"label label-default\">New</span>\r\n\t\t\t\t</h3>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Labels -->\r\n\r\n\t<!-- Badges -->\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>BADGES</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content clearfix\">\r\n\r\n\t\t\t\t<a href=\"#\">Inbox <span class=\"badge\">42</span></a>\r\n\r\n\t\t\t\t<br>\r\n\t\t\t\t<br>\r\n\r\n\t\t\t\t<ul class=\"nav nav-pills\">\r\n\t\t\t\t\t<li class=\"active\"><a href=\"#\">Home <span class=\"badge\">42</span></a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li><a href=\"#\">Profile</a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li><a href=\"#\">Messages <span class=\"badge\">3</span></a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t</ul>\r\n\r\n\t\t\t\t<br>\r\n\r\n\t\t\t\t<ul class=\"nav nav-pills nav-stacked\" style=\"max-width: 260px;\">\r\n\t\t\t\t\t<li class=\"active\">\r\n\t\t\t\t\t\t<a href=\"#\">\r\n\t\t\t\t\t\t\t<span class=\"badge pull-right\">42</span>\r\n\t\t\t\t\t\t\tHome\r\n\t\t\t\t\t\t</a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li><a href=\"#\">Profile</a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t\t<li>\r\n\t\t\t\t\t\t<a href=\"#\">\r\n\t\t\t\t\t\t\t<span class=\"badge pull-right\">3</span>\r\n\t\t\t\t\t\t\tMessages\r\n\t\t\t\t\t\t</a>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t</ul>\r\n\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<!-- /Badges -->\r\n</div>" );
		$templateCache.put('/partials/statics/support.html', "<iframe src='http://zoostudio.helpshift.com/' width='100%' height='100%' frameborder='0'></iframe>" );
		$templateCache.put('/partials/transaction/detail.html', "<form class=\"frmTransaction\" name=\"frmTransaction\" ng-submit=\"submitTransaction()\" autocomplete=\"off\" novalidate>\r\n\t<div class=\"form-group\">\r\n\t\t<ml-category-view ml-category=\"transaction.category\"></ml-category-view>\r\n\t</div>\r\n\t<div class=\"form-group\">\r\n\t\t<div class=\"input-group\">\r\n\t\t\t<span class=\"input-group-addon\"></span>\r\n\t\t\t<input id=\"inputTransactionAmount\" type=\"number\" class=\"form-control\" ng-model=\"transaction.amount\" placeholder=\"{{ 'add_transaction_amount_title' | translate }}\" ng-focus=\"displayPreview=true\" ng-init=\"displayPreview=false\" ng-blur=\"displayPreview=false\" ml-format-currency>\r\n\t\t\t<div class=\"ml-preview-amount fade-animate\" ng-show=\"displayPreview\"><p class=\"amount\" ng-class=\"{'amount-expense': (transaction.category.type === 2), 'amount-income': (transaction.category.type === 1) }\">{{ transaction.amount | MLCurrency }}</p></div>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"form-group\">\r\n\t\t<div class=\"input-group\">\r\n\t\t\t<span class=\"input-group-addon\"><i class=\"icon-pencil\"></i></span>\r\n\t\t\t<input id=\"inputTransactionNote\" type=\"text\" class=\"form-control\" placeholder=\"{{ 'add_transaction_note_title_normal' | translate }}\" ng-model=\"transaction.date\">\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"form-group\">\r\n\t\t<div class=\"input-group\">\r\n\t\t\t<span class=\"input-group-addon\"><i class=\"icon-group\"></i></span>\r\n\t\t\t<input id=\"inputTransactionNote\" type=\"text\" class=\"form-control\" placeholder=\"{{ 'add_transaction_with_hint' | translate }}\" ng-model=\"transaction.note\">\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"row\">\r\n\t\t<div class=\"col-lg-12\">\r\n\t\t\t<div class=\"agrow\"></div>\r\n\t\t</div>\r\n\t\t<div class=\"col-lg-6\">\r\n\t\t\t<div class=\"form-group\">\r\n\t\t\t\t<div class=\"ml-date-view\" ng-click=\"selectDate()\">\r\n\t\t\t\t\t<div class=\"ml-date-header\">\r\n\t\t\t\t\t\t<p>{{ transaction.displayDate | MLDayFormatter }}</p>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"ml-date-body\">\r\n\t\t\t\t\t\t<h1>{{ transaction.displayDate | date:'dd' }}</h1>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"ml-date-footer\">\r\n\t\t\t\t\t\t<p>{{ transaction.displayDate | date:'MMMM yyyy' }}</p>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t\t<div class=\"col-lg-6\">\r\n\t\t\t<div class=\"form-group\">\r\n\t\t\t\t<label class=\"control-label\">{{'account' | translate}}</label>\r\n\t\t\t\t<div class=\"form-control\">{{wallet.name}}</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<br />\r\n\r\n\t<div class=\"form-group\">\r\n\t\t<input type=\"submit\" class=\"btn btn-primary\" value=\"{{ 'save' | translate }}\">\r\n\t\t<a type=\"reset\" class=\"btn btn-default\" ng-click=\"detailDefault()\">{{ 'cancel' | translate }}</a>\r\n\t</div>\r\n</form>" );
		$templateCache.put('/partials/transaction/error.html', "<div class=\"transaction-msg\">\r\n{{ transactionErrorMsg }}\r\n</div>" );
		$templateCache.put('/partials/transaction/list-item.html', "<img alt=\"{{  transaction.category.name }}\" ng-src=\"{{  transaction.category.icon | generateIconLink }}\">\r\n<a href=\"#\">{{ transaction.category.name }} <small>{{ transaction.note }}</small></a>\r\n<span class=\"amount\" ng-class=\"{'amount-expense': (transaction.category.type === 2), 'amount-income': (transaction.category.type === 1) }\">{{ transaction.amount | MLCurrency }}</span>" );
		$templateCache.put('/partials/transaction/list.html', "<div ng-repeat=\"transactionItem in transactionData.transactions\">\r\n\t<div class=\"transaction-list-data\">\r\n\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t<span ng-init=\"dateDisplay=(transactionItem.displayDate | MLDateFormatter)\" ng-mouseenter=\"dateDisplay.displayDate=dateDisplay.basicDate\" ng-mouseleave=\"dateDisplay.displayDate=dateDisplay.viewDate\">{{ dateDisplay.displayDate }}</span>\r\n\t\t</h4>\r\n\t\t<span class=\"amount\" ng-class=\"transactionItem.amount | checkNegativeAmount\">{{ transactionItem.amount | MLCurrency }}</span>\r\n\t\t<ul class=\"transaction-list\">\r\n\t\t\t<li ng-repeat=\"transaction in transactionItem.data\">\r\n\t\t\t\t<div ng-include=\"'/partials/transaction/list-item.html'\"></div>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t</div>\r\n</div>" );
		$templateCache.put('/partials/transaction/transaction.html', "<div class=\"row\">\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module no-padding transaction-list\" ng-init=\"getTransaction()\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ transactionData.daterange.startDate }} - {{ transactionData.daterange.endDate }}</h4>\r\n\t\t\t\t<div class=\"ml-btn-action\">\r\n\t\t\t\t\t<a class=\"btn btn-default ml-btn ml-btn-prev\" ng-click=\"prevDateRange()\">\r\n\t\t\t\t\t\t<i class=\"icon-chevron-left\"></i>\r\n\t\t\t\t\t</a>\r\n\t\t\t\t\t<a class=\"btn btn-default ml-btn ml-btn-next\" ng-click=\"nextDateRange()\">\r\n\t\t\t\t\t\t<i class=\"icon-chevron-right\"></i>\r\n\t\t\t\t\t</a>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<!-- <ul class=\"list-tasks\">\r\n\t\t\t\t\t<li class=\"task-header\">Total</li>\r\n\t\t\t\t</ul> -->\r\n\t\t\t\t<div ng-include=\"'/partials/transaction/list.html'\"></div>\r\n\t\t\t\t<div ng-include=\"'/partials/transaction/error.html'\" scope=\"transactionErrorMsg\" ng-if=\"transactionError\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ 'add_transaction_title_view' | translate }}</h4>\r\n\t\t\t\t<div class=\"btn-action-manager\">\r\n\t\t\t\t\t<button class=\"btn btn-default\" tooltip=\"Edit\" ng-click=\"editWallet()\"><i class=\"icon-pencil\"></i></button>\r\n\t\t\t\t\t<button class=\"btn btn-primary\" tooltip=\"New category\" ng-click=\"newWallet()\"><i class=\"icon-plus\"></i></button>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<div class=\"animator-fade\" ng-include=\"'/statics/transaction/detail.html'\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>" );
		$templateCache.put('/partials/users/info.html', "" );
		$templateCache.put('/partials/users/language.html', "" );
		$templateCache.put('/partials/users/login-register.html', "<div id=\"display-login\">\r\n\t<div class=\"disable-background\">\r\n\t\t<div id=\"user-action\" ng-controller=\"userAction\">\r\n\t\t\t<div class=\"user-title-page\">\r\n\t\t\t\t<h1 ng-bind=\"userPageTitle\">Money Lover</h1>\r\n\t\t\t\t<ml-msg ml-bind-content=\"formStatus\"></ml-msg>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"user-login\" ng-show=\"displayLogin\" ng-init=\"initLogin()\">\r\n\t\t\t\t<form name=\"frmUserLogin\" class=\"login-box\" ng-submit=\"submitLogin()\" autocomplete=\"off\" novalidate>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorEmail}\" ng-init=\"validatorEmail=false\">\r\n\t\t\t\t\t\t<input type=\"email\" class=\"form-control\" placeholder=\"{{'login_hint_email'|translate}}\" ng-model=\"userInfo.email\" name=\"email\" ng-blur=\"validatorEmail=frmUserLogin.email.$error.email\" ng-keyup=\"validatorEmail=false\" auto-fillable-field required>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorPassword, 'has-warning': errorPassword}\" ng-init=\"validatorPassword=false\">\r\n\t\t\t\t\t\t<input type=\"password\" class=\"form-control\" placeholder=\"{{'login_hint_password'|translate}}\" ng-model=\"userInfo.password\" name=\"password\" auto-fillable-field required />\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\">\r\n\t\t\t\t\t\t<button class=\"btn\" type=\"submit\" ng-disabled=\"frmUserLogin.$invalid\">{{ 'login_title' | translate }}</button>\r\n\t\t\t\t\t\t<a href=\"#\" ng-click=\"showBox('register')\">{{'login_hint_create_account' | translate}}</a>\r\n\t\t\t\t\t\t<p class=\"p-link\" ng-click=\"showBox('forgotpassword')\">{{'login_hint_forgotpassword' | translate}}</p>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</form>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"user-register\" ng-show=\"displayRegister\">\r\n\t\t\t\t<form name=\"userRegister\" class=\"login-box\" ng-submit=\"submitRegister()\" autocomplete=\"off\" novalidate>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorEmail}\" ng-init=\"validatorEmail=false\">\r\n\t\t\t\t\t\t<input type=\"email\" class=\"form-control\" placeholder=\"{{ 'login_hint_email' | translate }}\" ng-model=\"userInfo.email\" name=\"email\" ng-blur=\"validatorEmail=userRegister.email.$error.email\" ng-keyup=\"validatorEmail=false\" auto-fillable-field required />\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorPassword, 'has-warning': errorPassword}\" ng-init=\"validatorEmail=false\">\r\n\t\t\t\t\t\t<input type=\"password\" class=\"form-control\" placeholder=\"{{ 'login_hint_password' | translate }}\" ng-model=\"userInfo.password\" name=\"password\" ng-minlength=\"6\" ng-blur=\"validatorPassword=userRegister.password.$error.minlength\" ng-keyup=\"errorPassword=false\" auto-fillable-field required />\r\n\t\t\t\t\t\t<p class=\"text-danger\" ng-show=\"userRegister.password.$error.minlength\">{{ 'login_hint_warning_password1' | translate}}</p>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validator_rePassword, 'has-warning': errorPassword}\" ng-init=\"validator_rePassword=false\">\r\n\t\t\t\t\t\t<input type=\"password\" class=\"form-control\" placeholder=\"{{ 'login_hint_repassword' | translate}}\" ng-model=\"userInfo.repassword\" name=\"repassword\" ng-minlength=\"6\" ng-blur=\"validatorPassword=userRegister.repassword.$error.minlength\" ng-keyup=\"errorPassword=false\" auto-fillable-field required />\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\">\r\n\t\t\t\t\t\t<button class=\"btn\" type=\"submit\" ng-disabled=\"userRegister.$invalid\">{{ 'register_register' | translate }}</button>\r\n\t\t\t\t\t\t<a href=\"#\" ng-click=\"showBox('login')\">{{'login_title' | translate}}</a>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</form>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"user-ForgotPassword\" ng-show=\"displayForgotPassword\">\r\n\t\t\t\t<form class=\"login-box\" name=\"forgotPassword\" ng-submit=\"submitForgot()\" autocomplete=\"off\" novalidate>\r\n\t\t\t\t\t<div class=\"message-forgotpassword\">{{ 'user_forgot_password_helper' | translate }}</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorEmail}\" ng-init=\"validatorEmail=false\">\r\n\t\t\t\t\t\t<input type=\"email\" class=\"form-control\" placeholder=\"{{'login_hint_email'|translate}}\" ng-model=\"userInfo.email\" name=\"email\" ng-blur=\"validatorEmail=frmUserLogin.email.$error.email\" ng-keyup=\"validatorEmail=false\" auto-fillable-field required>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<span ng-bind=\"status_forgotpassword\"></span>\r\n\t\t\t\t\t<button class=\"btn\" type=\"submit\" ng-disabled=\"forgotPassword.$invalid\">{{ 'confirm' | translate }}</button>\r\n\t\t\t\t\t<a href=\"#\" ng-click=\"showBox('login')\">{{'login_title' | translate}}</a>\r\n\t\t\t\t</form>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"user-ConfirmResetPassword\" ng-show=\"displayConfirmResetPassword\">\r\n\t\t\t\t<form class=\"login-box\" name=\"confirmResetPassword\" ng-submit=\"submitConfirm()\" autocomplete=\"off\" novalidate>\r\n\t\t\t\t\t<div class=\"message-forgotpassword\">{{ 'forgot_pass_success' | translate }}</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorEmail}\" ng-init=\"validatorEmail=false\">\r\n\t\t\t\t\t\t<input type=\"email\" class=\"form-control\" placeholder=\"{{'login_hint_email'|translate}}\" ng-model=\"userInfo.email\" name=\"email\" ng-blur=\"validatorEmail=frmUserLogin.email.$error.email\" ng-keyup=\"validatorEmail=false\" auto-fillable-field required>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\">\r\n\t\t\t\t\t\t<input type=\"text\" class=\"form-control\" placeholder=\"{{'login_hint_confirm_code'|translate}}\" ng-model=\"userInfo.confirmCode\" name=\"confirmCode\" auto-fillable-field required />\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\">\r\n\t\t\t\t\t\t<button class=\"btn\" type=\"submit\" ng-disabled=\"confirmResetPassword.$invalid\">{{ 'confirm' | translate }}</button>\r\n\t\t\t\t\t\t<a href=\"#\" ng-click=\"showBox('login')\">{{'login_title' | translate}}</a>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</form>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"user-ResetPassword\" ng-show=\"displayResetPassword\">\r\n\t\t\t\t<form class=\"login-box\" name=\"resetPassword\"  ng-submit=\"submitResetpassword()\" autocomplete=\"off\" novalidate>\r\n\t\t\t\t\t<div class=\"message-forgotpassword\">Enter new password</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validatorPassword, 'has-warning': errorPassword}\" ng-init=\"validatorEmail=false\">\r\n\t\t\t\t\t\t<input type=\"password\" class=\"form-control\" placeholder=\"{{ 'login_hint_new_password' | translate }}\" ng-model=\"userInfo.password\" name=\"password\" ng-minlength=\"6\" ng-blur=\"validatorPassword=userRegister.password.$error.minlength\" ng-keyup=\"errorPassword=false\" auto-fillable-field required />\r\n\t\t\t\t\t\t<p class=\"text-danger\" ng-show=\"userRegister.password.$error.minlength\">{{ 'login_hint_warning_password1' | translate}}</p>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\" ng-class=\"{'has-error': validator_rePassword, 'has-warning': errorPassword}\" ng-init=\"validator_rePassword=false\">\r\n\t\t\t\t\t\t<input type=\"password\" class=\"form-control\" placeholder=\"{{ 'login_hint_repassword' | translate}}\" ng-model=\"userInfo.repassword\" name=\"repassword\" ng-minlength=\"6\" ng-blur=\"validatorPassword=userRegister.repassword.$error.minlength\" ng-keyup=\"errorPassword=false\" auto-fillable-field required />\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"form-group\">\r\n\t\t\t\t\t\t<button class=\"btn\" type=\"submit\" ng-disabled=\"resetPassword.$invalid\">{{ 'confirm' | translate }}</button>\r\n\t\t\t\t\t\t<a href=\"#\" ng-click=\"showBox('login')\">{{'login_title' | translate}}</a>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</form>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n" );
		$templateCache.put('/partials/users/setting.html', "<div class=\"row\">\r\n\t<div class=\"col-lg-12\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ 'settings_group_display' | translate }}</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t\t\t<span>{{ 'settings_amount_text_display_title' | translate }}</span>\r\n\t\t\t\t</h4>\r\n\t\t\t\t<div class=\"row\">\r\n\t\t\t\t\t<div class=\"col-lg-6\">\r\n\t\t\t\t\t\tAAAAAAAAAAAAA\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<div class=\"col-lg-6\">\r\n\t\t\t\t\t\tBBBBBBBBBBBBB\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\r\n\t\t\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t\t\t<span>{{ 'settings_select_date_format' | translate}}</span>\r\n\t\t\t\t</h4>\r\n\r\n\t\t\t\t<button class=\"btn btn-default btn-lg\" type=\"button\">Large button</button>\r\n\t\t\t\t<button class=\"btn btn-default\" type=\"button\">Normal button</button>\r\n\t\t\t\t<button class=\"btn btn-default btn-sm\" type=\"button\">Small button</button>\r\n\t\t\t\t<button class=\"btn btn-default btn-xs\" type=\"button\">Mini button</button>\r\n\r\n\t\t\t\t<button class=\"btn btn-grape btn-block\" type=\"button\">Block Level Button</button>\r\n\r\n\t\t\t\t<h4 class=\"module-subtitle\">\r\n\t\t\t\t\t<span>{{ 'settings_set_first_day_month' | translate }}</span>\r\n\t\t\t\t</h4>\r\n\r\n\t\t\t\t<button class=\"btn btn-default\" type=\"button\"><i class=\"icon-star\"></i>\r\n\t\t\t\t</button>\r\n\t\t\t\t<button class=\"btn btn-primary\" type=\"button\"><i class=\"icon-book\"></i> Read more</button>\r\n\t\t\t\t<button class=\"btn btn-danger\" type=\"button\"><i class=\"icon-remove icon-large\"></i>\r\n\t\t\t\t</button>\r\n\t\t\t\t<button class=\"btn btn-facebook\" type=\"button\"><i class=\"icon-facebook\"></i> Facebook</button>\r\n\t\t\t\t<button class=\"btn btn-twitter\" type=\"button\"><i class=\"icon-twitter\"></i> Twitter</button>\r\n\t\t\t\t<button class=\"btn btn-linkedin\" type=\"button\"><i class=\"icon-linkedin\"></i> LinkedIn</button>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n" );
		$templateCache.put('/partials/wallet/detail.html', "<div class=\"alert alert-dismissable\" ng-if=\"(alert_info || alert_warning)\" ng-class=\"{'alert-info': alert_info, 'alert-warning': alert_warning}\">\r\n\t<button aria-hidden=\"true\" data-dismiss=\"alert\" class=\"close\" type=\"button\"><i class=\"icon-remove-sign\"></i></button>\r\n\t<ml-msg ml-bind-content=\"alertMsg\"></ml-msg>\r\n</div>\r\n<form name=\"frmCreateAccount\" role=\"form\" class=\"form-horizontal\" ng-submit=\"submitAddWallet()\">\r\n\t<div class=\"form-group\">\r\n\t\t<div class=\"input-group\">\r\n\t\t\t<span class=\"input-group-addon\"><i class=\"icon-user\"></i>\r\n\t\t\t</span>\r\n\t\t\t<input type=\"text\" placeholder=\"{{ 'add_account_name_title' | translate }}\" class=\"form-control\" ng-model=\"walletInfo.name\" ng-disabled=\"formStatus.disabedName\">\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"form-group ml-locked\">\r\n\t\t<div class=\"input-group\">\r\n\t\t\t<span class=\"input-group-addon\"><i class=\"icon-usd\"></i>\r\n\t\t\t</span>\r\n\t\t\t<input type=\"text\" placeholder=\"{{ currencyStatus }}\" class=\"form-control\" ng-model=\"walletInfo.currency.n\" ng-click=\"selectCurrency()\" readonly>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"form-group\">\r\n\t\t<div class=\"checkbox\">\r\n\t\t\t<label>\r\n\t\t\t\t<input type=\"checkbox\" ng-model=\"walletInfo.default\" ng-init=\"walletInfo.default=true\">{{ 'add_account_set_default' | translate }}\r\n\t\t\t</label>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"form-group\">\r\n\t\t<input class=\"btn btn-primary\" type=\"submit\" value=\"{{ 'save' | translate }}\">\r\n\t\t<input class=\"btn btn-default\" type=\"reset\" value=\"{{ 'cancel' | translate }}\">\r\n\t</div>\r\n</form>\r\n" );
		$templateCache.put('/partials/wallet/list.html', "<div class=\"ml-list-wallet\" ng-repeat=\"wallets in listWallet track by $index\">\n\t<h4 class=\"module-subtitle\" ng-click=\"setWallet(wallets)\">\n\t\t<span class=\"ng-binding\">{{ wallets.name }}</span>\n\t</h4>\n</div>" );
		$templateCache.put('/partials/wallet/manager.html', "<div id=\"ml-wallet-manager\" class=\"row\" ng-init=\"walletManager()\">\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ 'account_manager_title' | translate }}</h4>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<div ng-include=\"'/partials/wallet/list.html'\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n\t<div class=\"col-lg-6\">\r\n\t\t<div class=\"module\">\r\n\t\t\t<div class=\"module-header\">\r\n\t\t\t\t<h4>{{ 'account_detail_title' | translate }}</h4>\r\n\t\t\t\t<div class=\"btn-action-manager\">\r\n\t\t\t\t\t<button class=\"btn btn-default\" tooltip=\"Edit\" ng-click=\"editWallet()\"><i class=\"icon-pencil\"></i></button>\r\n\t\t\t\t\t<button class=\"btn btn-primary\" tooltip=\"New account\" ng-click=\"newWallet()\"><i class=\"icon-plus\"></i></button>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t\t<div class=\"module-content\">\r\n\t\t\t\t<div class=\"animator-fade\" scope=\"walletInfo\" ng-include=\"'/partials/wallet/detail.html'\"></div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>" );
		$templateCache.put('/partials/wallet/mini.html', "<div id=\"account-mini-list\" ng-controller=\"ctrlWallet\">\r\n\t<div class=\"container\" ng-init=\"miniWallet()\">\r\n\t\t<div class=\"row\">\r\n\t\t\t<div class=\"col-md-12\">\r\n\t\t\t\t<div class=\"col-md-8 col-md-offset-2\">\r\n\t\t\t\t\t<div class=\"content\">\r\n\t\t\t\t\t\t<h1>{{ titlePageSelectAccount | translate }}</h1>\r\n\t\t\t\t\t\t<div class=\"animate-fade\" ng-if=\"showMiniList\" ng-include=\"'/partials/wallet/list.html'\"></div>\r\n\t\t\t\t\t\t<div class=\"animate-fade\" ng-if=\"createWallet\" ng-include=\"'/partials/wallet/detail.html'\"></div>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>\r\n" );
	}]);
}(window.angular));