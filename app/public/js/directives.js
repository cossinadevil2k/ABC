(function($a) {
	'use strict';

	$a.module('ML.directives', [])
	.directive('appVersion', ['version',
		function(version) {
			return function(scope, elm, attrs) {
				elm.text(version);
			};
		}
	])
	.directive('autoFillableField', function() {
		return {
			restrict: "A",
			require: "?ngModel",
			link: function(scope, element, attrs, ngModel) {
				setInterval(function() {
					var prev_val = '';
					if (!angular.isUndefined(attrs.xAutoFillPrevVal)) {
						prev_val = attrs.xAutoFillPrevVal;
					}
					if (element.val() != prev_val) {
						if (!angular.isUndefined(ngModel)) {
							if (!(element.val() == '' && ngModel.$pristine)) {
								attrs.xAutoFillPrevVal = element.val();
								scope.$apply(function() {
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
	})
	.directive('mlMsg', function($compile){
		return {
			restrict: 'E',
			link: function(scope, element, attrs){
				scope.$watch(
					function(scope) {
						return scope.$eval(attrs.mlBindContent);
					},
					function(value) {
						element.html(value);
						$compile(element.contents())(scope);
					}
				);
			}
		};
	})
	.directive('mlAlert', function($compile){
		return {
			restrict: 'E',
			link: function(scope, element, attrs){
				scope.$watch(function(scope){

				});
			}
		}
	});

}(angular));
