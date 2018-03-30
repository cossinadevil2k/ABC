(function ($a) {
    'use strict';
    $a.module('ML').controller('automation_log', function ($scope, $rootScope, $modal, $routeParams, $http) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Automation Log';

        $scope.page = 1;
        var limit = 40;

        $scope.automation_log = {};
        $scope.noContent = false;

        $scope.isFirstPage = true;
        $scope.isLastPage = true;

        $scope.$on('$viewContentLoaded', function () {
            loadContent($scope.page);
        });

        $scope.nextPage = function (num) {
            $scope.page += num;

            loadContent($scope.page);
        };

        function excutePage() {
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.automation_log.length < limit;
        };

        function loadContent(page) {
            var url = '/api/automation_log/browse';
            var skip = limit * (page - 1);
            var params = {
                offset: skip,
                limit: limit
            };

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.automation_log = response.data.data;
                        if ($scope.automation_log.length < 1) {
                            $scope.noContent = true;
                        } else {
                            $scope.noContent = false;
                        }
                        excutePage();
                    } else {
                        alert('Get list email push automation error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        };

        $scope.clearLog = function () {
            var ok = confirm("You will clear log, are you sure?");
            if (ok) {
                var url = '/api/automation_log/clear';
                $http({
                    method: 'POST',
                    url: url
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadContent($scope.page);
                        } else {
                            alert(response.data.message);
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });
            };
        }

        function analysisStatus() {

        }
    })
}(angular));
