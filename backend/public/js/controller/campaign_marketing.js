(function ($a) {
    'use strict';
    $a.module('ML').controller('campaignMarketingCtrl', function ($scope, $rootScope, $modal, $routeParams, $http) {

        $scope.campaigns = [];
        $scope.page = 1;
        $scope.noContent;
        var limit = 20;

        $scope.$on('$viewContentLoaded', function () {
            console.log('campaignMarketingCtrl');

            loadContent($scope.page);
        });



        function loadContent(page) {
            var url = '/api/campaign-marketing/browse';
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
                        $scope.campaigns = response.data.data;
                        if ($scope.campaigns.length < 1) {
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
            $scope.isLastPage = $scope.campaigns.length < limit;
        };

        $scope.changeDisabled = function (campaign) {
            alert('Chưa có, coming soon !');
        }

    })
}(angular));
