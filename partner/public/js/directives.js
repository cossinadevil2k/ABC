(function($a) {
	'use strict';

	var MLdirectives = $a.module('ML.directives', []);
	MLdirectives.directive('appVersion', ['version',
		function(version) {
			return function(scope, elm, attrs) {
				elm.text(version);
			};
		}
	]);

	MLdirectives.directive('autoFillableField', function() {
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
	});

	MLdirectives.directive('mlMsg', function($compile){
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
	});

	MLdirectives.directive('enterPress', function () {
	    return function (scope, element, attrs) {
	        element.bind("keydown keypress", function (event) {
	            if(event.which === 13) {
	                scope.$apply(function (){
	                    scope.$eval(attrs.enterPress);
	                });

	                event.preventDefault();
	            }
	        });
	    };
	});

	MLdirectives.directive('mlAlert', function($compile){
		return {
			restrict: 'E',
			link: function(scope, element, attrs){
				scope.$watch(function(scope){

				});
			}
		};
	});

	MLdirectives.directive('mlPreviewIframe', function($compile){
		return {
			restrict: 'E',
			templateUrl: '/partials/emails/template.html',
			link: function(scope, element, attrs){
				scope.$watch(attrs.content, function(value){
					scope.contentMailPreview = value;
					// element.html(value);
					// $compile(element.contents())(scope);
				});
			}
		};
	});

	MLdirectives.directive('mlPreviewPromote', function($compile){
		return {
			restrict: 'E',
			templateUrl: '/partials/promotion/modalReview.html',
			link: function(scope, element, attrs){
				scope.$watch(attrs.content, function(value){
					scope.promote = value;
				});
			}
		};
	});

	MLdirectives.directive('fileModel', function ($parse) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var model = $parse(attrs.fileModel);
				var modelSetter = model.assign;

				element.bind('change', function(){
					scope.$apply(function(){
						modelSetter(scope, element[0].files[0]);
					});
				});
			}
		};
	});

	MLdirectives.directive('uploadIcon', function ($parse, $http) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var packages = attrs.uploadIcon;
				var oldValue = attrs.oldValue;
				var uploadType = attrs.uploadType;
				var model = $parse(attrs.packageModel);
				var refeshModel = model.assign;
				element.on('change', function(){
					var fd = new FormData();
					fd.append('filedata', element[0].files[0]);
					fd.append('uploadtype', uploadType);
					fd.append('packagename', packages);
					fd.append('oldvalue', oldValue);
					$http.post('/icons/upload', fd, {
						headers: {'Content-Type': undefined},
						transformRequest: $a.identity
					}).success(function(data, status){
							if(data.s){
								refeshModel(scope, data.d);
							} else {
								alert('Error');
							}
						})
						.error(function(){
							alert('Error');
						});
				});
			}
		};
	});

	MLdirectives.directive('uploadLogo', function ($parse, $http) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var img = attrs.uploadLogo;
				var oldValue = attrs.oldValue;
				var model = $parse(attrs.packageModel);
				var refeshModel = model.assign;
				element.on('change', function(){
					var fd = new FormData();
					fd.append('filedata', element[0].files[0]);
					fd.append('oldvalue', oldValue);
					$http.post('/sponsored/upload-logo', fd, {
						headers: {'Content-Type': undefined},
						transformRequest: $a.identity
					}).success(function(data, status){
							if(data.s){
								refeshModel(scope, data.d);
							} else {
								alert('Error');
							}
						})
						.error(function(){
							alert('Error');
						});
				});
			}
		};
	});

	MLdirectives.directive('autoComplete', function($http){
		return {
			restrict:'AE',
			scope:{
				selectedTags:'=model',
				tags:'@taginit'
			},
			templateUrl:'/partials/users/tagAutoComplete.html',
			link:function(scope,elem,attrs){
				console.log(scope.tags);
				if(scope.tags){
					scope.tags = JSON.parse(scope.tags);
				}

				scope.suggestions=[];

				scope.selectedTags= scope.tags || [];

				scope.selectedIndex=-1;

				scope.removeTag=function(index){
					scope.selectedTags.splice(index,1);
				};

				scope.search=function(){
					$http.get(attrs.url+'?term='+scope.searchText).success(function(data){
						if(data.indexOf(scope.searchText)===-1){
							data.unshift(scope.searchText);
						}
						scope.suggestions=data;
						scope.selectedIndex=-1;
					});
				};

				scope.addToSelectedTags=function(index){
					if(scope.selectedTags.indexOf(scope.suggestions[index])===-1){
						scope.selectedTags.push(scope.suggestions[index]);
						scope.searchText='';
						scope.suggestions=[];
					}
				};

				scope.checkKeyDown=function(event){
					if(event.keyCode===40){
						event.preventDefault();
						if(scope.selectedIndex+1 !== scope.suggestions.length){
							scope.selectedIndex++;
						}
					}
					else if(event.keyCode===38){
						event.preventDefault();
						if(scope.selectedIndex-1 !== -1){
							scope.selectedIndex--;
						}
					}
					else if(event.keyCode===13){
						scope.addToSelectedTags(scope.selectedIndex);
					}
				};

				scope.$watch('selectedIndex',function(val){
					if(val!==-1) {
						scope.searchText = scope.suggestions[scope.selectedIndex];
					}
				});
			}
		}
	});

	MLdirectives.directive('notificationCard', function(){
		return {
			restrict: 'E',
			scope: {
				data: '=data',
				index: '@',
				onCloseNotify: '&onClose'
			},
			templateUrl: '/partials/global/notification-card.html',
			link: function(scope, element, attribute, ctrl){
				scope.close = scope.onCloseNotify;
			}
		}
	});

	MLdirectives.directive('userSpotlight', function(){
		return {
			restrict: 'E',
			template:'<div class="input-group"><span class="input-group-addon" style="background: #F6F6F6;"><i class="icon-search"></i></span><input type="text" class="form-control spotlight" ng-model="kw" placeholder="User Search" autofocus ng-change="listenKeyPress(kw)"/></div><loading ng-if="isLoading"></loading><div class="module module-blue no-padding" ng-if="hasResult"><div class="module-header" ng-if="results.length === 0">No results</div><div class="module-content" ng-if="results.length > 0"><table class="table table-responsive"><thead><tr><th>email</th><th></th><th>expire</th><th class="text-center">sync</th><th class="text-center">premium</th></tr></thead><tbody><tr ng-repeat="user in results"><td><a class="helpdesk-link" ng-click="cancel()" href="/users/info/{{user.email}}">{{user.email}}</a><img src="/images/facebook-icon.png" tooltip="Facebook" class="icon-user-platform" alt="facebook" ng-if="detectSocial(user.tags) == \'facebook\'"/><img src="/images/google-icon.png" tooltip="G+" class="icon-user-platform" alt="g+" ng-if="detectSocial(user.tags) == \'google\'"/><div><img src="/images/android_96.png" class="icon-user-platform" alt="android_logo" ng-if="user.hasAndroid"/><img src="/images/android_96_disabled.png" class="icon-user-platform" alt="android_logo" ng-if="!user.hasAndroid"/><img src="/images/ios_96.png" class="icon-user-platform" alt="apple_logo" ng-if="user.hasIos"/><img src="/images/ios_96_disabled.png" class="icon-user-platform" alt="apple_logo" ng-if="!user.hasIos"/><img src="/images/winphone_96.png" class="icon-user-platform" alt="windows_phone_logo" ng-if="user.hasWp"/><img src="/images/winphone_96_disabled.png" class="icon-user-platform" alt="windows_phone_logo" ng-if="!user.hasWp"/><img src="/images/osx_96.png" class="icon-user-platform" alt="osx_logo" ng-if="user.hasOsx"/><img src="/images/osx_96_disabled.png" class="icon-user-platform" alt="osx_logo" ng-if="!user.hasOsx"/><img src="/images/windows_96.png" class="icon-user-platform" alt="windows_logo" ng-if="user.hasWindows"/><img src="/images/windows_96_disabled.png" class="icon-user-platform" alt="windows_logo" ng-if="!user.hasWindows"/><img src="/images/web_96.png" class="icon-user-platform" alt="web_logo" ng-if="user.hasWeb"/><img src="/images/web_96_disabled.png" class="icon-user-platform" alt="web_logo" ng-if="!user.hasWeb"/></div></td><td><span ng-if="user.geo" class="flag-icon flag-icon-{{user.geo.country_code.toLowerCase()}}" tooltip="{{user.geo.country}}{{(user.geo.city || user.geo.city == \'\')? \' - \' + user.geo.city: \'\'}}"></span></td><td>{{(user.expireDate || "- - - -") | checkDateTime}}</td><td class="text-center"><a class="btn btn-xs" href="#" ng-class="{\'btn-danger\': !user.acceptSync, \'btn-success\': user.acceptSync}"><i ng-class="{\'icon-check\': user.acceptSync, \'icon-unchecked\': !user.acceptSync}"></i></a></td><td class="text-center"><a class="btn btn-xs" href="#" ng-click="setPurchased(user)" ng-class="{\'btn-danger\': !user.purchased, \'btn-success\': user.purchased}"><i ng-class="{\'icon-check\': user.purchased, \'icon-unchecked\': !user.purchased}"></i></a></td></tr></tbody></table></div></div>'
		}
	});

	MLdirectives.directive('loading', function(){
		return {
			restrict: 'E',
			template: '<div class="text-center"><img src="/images/loading-pacman.gif" /><br />Loading</div>'
		}
	});

	MLdirectives.directive('autofocus', function(){
		return {
			restrict: 'A',
			link(scope, elm, attr, ctrl) {
				setTimeout(function(){
					elm[0].focus();
				}, 1000);
			}
		};
	});
}(angular));
