(function($a){
	'use strict';

	$a.module('ML.controllers', [])
	.controller('MLApp', function($scope, $rootScope, $routeParams, $translate, $location, localStorageService, $modal, MoneyLover) {
		$scope.MLTitle = 'Money Lover';
		$scope.MLDescription = 'Money Lover web version';
		$scope.MLAuthor = 'ZooStudio';
		$scope.MLKeyword ='Money Lover';
		$scope.transaction = {
			displayDate: new Date()
		};


		$scope.dateModal =  function(){
			var modalInstance = $modal.open({
				templateUrl: '/statics/modal/calendar.html',
				controller: ctrlModalDate,
				resolve: {
					displayDate: function () {
						return $scope.transaction.displayDate;
					}
				}
			});

			modalInstance.result.then(function (dateSelect){
				$scope.transaction.displayDate = dateSelect;
			}, function(){});
		};

		var ctrlModalDate = function ($scope, $modalInstance, displayDate){
			$scope.displayDate = displayDate || new Date();
			$scope.cancel = function () {
				$modalInstance.dismiss('cancel');
			};
			$scope.selectDate = function(dt){
				$modalInstance.close(dt);
			};

			$scope.DatepickerCtrl = function() {
				$scope.today = function() {
					$scope.dt = new Date();
				};
				$scope.initDate = function(){
					$scope.dt = displayDate;
				}
				$scope.initDate();

				this.showWeeks = false;
				this.minDate = false;

				this.dateOptions = {
					'year-format': "'yy'",
					'starting-day': 1
				};

				this.format = 'dd-MMMM-yyyy';
			};
		};
	})
	.controller('Users', function($scope, $rootScope, $location, MoneyLover){
		
	})
	.controller('Transaction', function($scope, $rootScope, $location, MoneyLover){

	});
}(window.angular));