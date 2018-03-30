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
		showButtonBar: false
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

					attrs.$observe('mlDatepickerPopup', function(value) {
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
					var popupEl = angular.element('<div ml-datepicker-popup-wrap><div ml-datepicker></div></div>');
					popupEl.attr({
						'ng-model': 'date',
						'ng-change': 'dateSelection()'
					});
					var datepickerEl = angular.element(popupEl.children()[0]), datepickerOptions = {};
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
	}]);
}(window.angular));