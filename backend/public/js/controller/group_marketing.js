(function ($a) {
    'use strict';
    $a.module('ML').controller('groupMarketingCtrl', function ($scope, $rootScope, $modal, $routeParams, $http) {

        $scope.groups = [];
        $scope.page = 1;
        $scope.noContent;
        var limit = 20;

        $scope.$on('$viewContentLoaded', function () {
            console.log('groupMarketingCtrl');

            loadContent($scope.page);
        });

        function loadContent(page) {
            var url = '/api/group/browse';
            var skip = limit * (page - 1);
            var param = {
                skip: skip,
                limit: limit,
                page: page
            };

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.groups = response.data.data;
                        if ($scope.groups.length < 1) {
                            $scope.noContent = true;
                        } else {
                            $scope.noContent = false;
                        }
                        excutePage(response.data);
                    } else {
                        alert('Get list group error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        }

        $scope.nextPage = function (num) {
            $scope.page += num;

            loadContent($scope.page);
        };

        function excutePage(scope) {
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.groups.length < limit;
        };


        $scope.changeDisabled = function (group) {
            alert('Chưa có, coming soon !');
        }

    })
}(angular));
