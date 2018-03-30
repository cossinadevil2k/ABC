(function ($a) {
    'use strict';
    $a.module('ML').controller('subscriptionRenewLogController', function ($scope, $http, $rootScope, $modal) {
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Subscription Renew Log';
        $scope.page = 1;
        var limit = 40;

        $scope.isFirstPage;
        $scope.isLastPage;
        $scope.noContent;

        $scope.subscription_renew_log = [];

        $scope.$on('$viewContentLoaded', function () {
            loadLog();
        });

        $scope.nextPage = function (num) {
            $scope.page += num;

            loadLog();
        };

        function excutePage() {
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.subscription_renew_log.length < limit;
        };

        function loadLog() {
            var url = "/subscription-renew-log/browse";

            var params = {
                'skip': $scope.page,
                'limit': limit
            }

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.subscription_renew_log = response.data.data;
                        excutePage();
                        if ($scope.subscription_renew_log.length > 0) {
                            $scope.noContent = false;
                        } else {
                            $scope.noContent = true;
                        }
                    } else {
                        alert('Get list log error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        }

        $scope.searchKey = function (event, key) {
            var url = '/subscription-renew-log/searchByBill';

            if (event.keyCode === 13) {
                var params = {
                    searchKey: key
                }

                $http({
                    method: 'POST',
                    url: url,
                    data: params
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            $scope.subscription_renew_log = response.data.data;
                            excutePage();
                            if ($scope.subscription_renew_log.length > 0) {
                                $scope.noContent = false;
                            } else {
                                $scope.noContent = true;
                            }
                        } else {
                            alert('Get list log error');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });
            }

        }

        $scope.search = function (key) {
            var url = '/subscription-renew-log/searchByBill';

            var params = {
                searchKey: key
            }

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.subscription_renew_log = response.data.data;
                        excutePage();
                        if ($scope.subscription_renew_log.length > 0) {
                            $scope.noContent = false;
                        } else {
                            $scope.noContent = true;
                        }
                    } else {
                        alert('Get list log error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        }

    });
}(angular));
