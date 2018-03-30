(function ($a) {
	'use strict';

	var MLdirectives = $a.module('ML.directives', []);
	MLdirectives.directive('appVersion', ['version',
		function (version) {
			return function (scope, elm, attrs) {
				elm.text(version);
			};
		}
	]);

	MLdirectives.directive('autoFillableField', function () {
		return {
			restrict: "A",
			require: "?ngModel",
			link: function (scope, element, attrs, ngModel) {
				setInterval(function () {
					var prev_val = '';
					if (!angular.isUndefined(attrs.xAutoFillPrevVal)) {
						prev_val = attrs.xAutoFillPrevVal;
					}
					if (element.val() != prev_val) {
						if (!angular.isUndefined(ngModel)) {
							if (!(element.val() == '' && ngModel.$pristine)) {
								attrs.xAutoFillPrevVal = element.val();
								scope.$apply(function () {
									ngModel.$setViewValue(element.val());
								});
							}
						} else {
							element.trigger('input');
							element.trigger('change');
							element.trigger('keyup');
							attrs.xAutoFillPrevVal = element.val();
						}
					}
				}, 300);
			}
		};
	});

	MLdirectives.directive('mlMsg', function ($compile) {
		return {
			restrict: 'E',
			link: function (scope, element, attrs) {
				scope.$watch(
					function (scope) {
						return scope.$eval(attrs.mlBindContent);
					},
					function (value) {
						element.html(value);
						$compile(element.contents())(scope);
					}
				);
			}
		};
	});

	MLdirectives.directive('setElementInView', function ($window) {
		var $win = angular.element($window); // wrap window object as jQuery object

		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				var inView = attrs.setElementInView, // get CSS class from directive's attribute value
					offsetTop = element.offset().top; // get element's offset top relative to document

				$win.on('scroll', function (e) {
					if ($win.scrollTop() >= offsetTop) {
						element.css({ "position": "fixed", "top": "10px", 'right': "0", 'padding': '0 20px 0 38px' });
					} else {
						element.css({ "position": "inherit", 'padding': '0 15px' });
					}
				});
			}
		};
	});

	MLdirectives.directive('mlAlert', function ($compile) {
		return {
			restrict: 'E',
			link: function (scope, element, attrs) {
				scope.$watch(function (scope) {

				});
			}
		};
	});

	MLdirectives.directive('mlPreviewIframe', function ($compile) {
		return {
			restrict: 'E',
			templateUrl: '/partials/emails/template.html',
			link: function (scope, element, attrs) {
				scope.$watch(attrs.content, function (value) {
					scope.contentMailPreview = value;
					var now = new Date();
					scope.year = now.getFullYear().toString();
					// element.html(value);
					// $compile(element.contents())(scope);
				});
			}
		};
	});

	MLdirectives.directive('fileModel', function ($parse) {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				var model = $parse(attrs.fileModel);
				var modelSetter = model.assign;

				element.bind('change', function () {
					scope.$apply(function () {
						modelSetter(scope, element[0].files[0]);
					});
				});
			}
		};
	});

	MLdirectives.directive('uploadIcon', function ($parse, $http) {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				var packages = attrs.uploadIcon;
				var oldValue = attrs.oldValue;
				var uploadType = attrs.uploadType;
				var model = $parse(attrs.packageModel);
				var refeshModel = model.assign;
				element.on('change', function () {
					var fd = new FormData();
					fd.append('filedata', element[0].files[0]);
					fd.append('uploadtype', uploadType);
					fd.append('packagename', packages);
					fd.append('oldvalue', oldValue);
					$http.post('/icons/upload', fd, {
						headers: { 'Content-Type': undefined },
						transformRequest: $a.identity
					}).success(function (data, status) {
						if (data.s) {
							refeshModel(scope, data.d);
						} else {
							alert('Error');
						}
					})
						.error(function () {
							alert('Error');
						});
				});
			}
		};
	});

	MLdirectives.directive('uploadLogo', function ($parse, $http) {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				var img = attrs.uploadLogo;
				var oldValue = attrs.oldValue;
				var model = $parse(attrs.packageModel);
				var refeshModel = model.assign;
				element.on('change', function () {
					var fd = new FormData();
					fd.append('filedata', element[0].files[0]);
					fd.append('oldvalue', oldValue);
					$http.post('/sponsored/upload-logo', fd, {
						headers: { 'Content-Type': undefined },
						transformRequest: $a.identity
					}).success(function (data, status) {
						if (data.s) {
							refeshModel(scope, data.d);
						} else {
							alert('Error');
						}
					})
						.error(function () {
							alert('Error');
						});
				});
			}
		};
	});

	MLdirectives.directive('autoComplete', function ($http) {
		return {
			restrict: 'AE',
			scope: {
				selectedTags: '=model',
				tags: '@taginit'
			},
			templateUrl: '/partials/users/tagAutoComplete.html',
			link: function (scope, elem, attrs) {

				if (scope.tags) {
					scope.tags = JSON.parse(scope.tags);
				}

				scope.suggestions = [];

				scope.selectedTags = scope.tags || [];

				scope.selectedIndex = -1;

				scope.removeTag = function (index) {
					scope.selectedTags.splice(index, 1);
				};

				scope.search = function () {
					$http.get(attrs.url + '?term=' + scope.searchText).success(function (data) {
						if (data.indexOf(scope.searchText) === -1) {
							data.unshift(scope.searchText);
						}
						scope.suggestions = data;
						scope.selectedIndex = -1;
					});
				};

				scope.addToSelectedTags = function (index) {
					if (scope.selectedTags.indexOf(scope.suggestions[index]) === -1) {
						scope.selectedTags.push(scope.suggestions[index]);
						scope.searchText = '';
						scope.suggestions = [];
					}
				};

				scope.checkKeyDown = function (event) {
					if (event.keyCode === 40) {
						event.preventDefault();
						if (scope.selectedIndex + 1 !== scope.suggestions.length) {
							scope.selectedIndex++;
						}
					}
					else if (event.keyCode === 38) {
						event.preventDefault();
						if (scope.selectedIndex - 1 !== -1) {
							scope.selectedIndex--;
						}
					}
					else if (event.keyCode === 13) {
						scope.addToSelectedTags(scope.selectedIndex);
					}
				};

				scope.$watch('selectedIndex', function (val) {
					if (val !== -1) {
						scope.searchText = scope.suggestions[scope.selectedIndex];
					}
				});
			}
		}
	});

	MLdirectives.directive('notificationCard', function () {
		return {
			restrict: 'E',
			scope: {
				data: '=data',
				index: '@',
				onCloseNotify: '&onClose'
			},
			templateUrl: '/partials/global/notification-card.html',
			link: function (scope, element, attribute, ctrl) {
				scope.close = scope.onCloseNotify;
			}
		}
	});

	MLdirectives.directive('loading', function () {
		return {
			restrict: 'E',
			template: '<div class="text-center"><img src="/images/loading-pacman.gif" /><br />Loading</div>'
		}
	});

	MLdirectives.directive('autofocus', function () {
		return {
			restrict: 'A',
			link(scope, elm, attr, ctrl) {
				setTimeout(function () {
					elm[0].focus();
				}, 1000);
			}
		};
	});


}(angular));
