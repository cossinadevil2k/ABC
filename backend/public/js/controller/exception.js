(function ($a) {
    "use strict";

    $a.module('ML').controller('exception', function ($scope, $rootScope, $http, $modal) {
        $rootScope.MLPageDetail = "Sync Exception";
        $rootScope.tabSelect = 1;
        $scope.isLoading = false;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        var LIMIT = 20;
        $scope.platform = 0;

        var platforms = {
            'Android': 1,
            'Ios': 2,
            'Windows': 3,
            'Winphone': 3,
            'Osx': 6,
            'Web': 7
        };

        $scope.exceptionList = [];

        $scope.nextPage = function (value) {
            $scope.page += value;
            // getList();
            $scope.filter($scope.platform);
        };

        $scope.detail = function (listIndex) {
            $modal.open({
                templateUrl: '/partials/exception/detail.html',
                controller: ctrlExceptionDetail,
                resolve: {
                    exception: function () {
                        return $scope.exceptionList[listIndex];
                    }
                }
            });
        };

        function ctrlExceptionDetail($scope, $modalInstance, exception) {
            $scope.detail = exception;

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            }
        }

        function checkPage() {
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.exceptionList.length < LIMIT;
        }

        function getList() {
            getListAPI(function (err, data) {
                if (err) {
                    return alert(err);
                }

                $scope.exceptionList = data;

                checkPage();
            });
        }

        function getListAPI(callback) {
            var skip = LIMIT * ($scope.page - 1);
            $scope.isLoading = true;

            $http.post('/exception/list', { skip: skip, limit: LIMIT })
                .success(function (result) {
                    $scope.isLoading = false;

                    if (!result.status) {
                        return callback('Get exception list failed');
                    }

                    callback(null, result.data);
                })
                .error(function () {
                    $scope.isLoading = false;

                    callback('Error from server');
                });
        }

        $scope.searchKey = function (event, keyWord) {
            if (event.keyCode == 13) {
                var skip = LIMIT * ($scope.page - 1);
                $scope.isLoading = true;

                var email = keyWord;

                $http.post('/api/exception/search', { email: email, skip: skip })
                    .success(function (result) {
                        $scope.isLoading = false;
                        $scope.exceptionList = result.data;
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }
        };

        $scope.search = function (keyWord) {
            var skip = LIMIT * ($scope.page - 1);
            $scope.isLoading = true;

            var email = keyWord;

            $http.post('/api/exception/search', { email: email, skip: skip })
                .success(function (result) {
                    $scope.isLoading = false;
                    $scope.exceptionList = result.data;
                })
                .error(function () {
                    alert('Error from server');
                });
        };

        $scope.filter = function (platform) {
            $scope.platform = platform;
            if (platform != 0) {   
                var skip = LIMIT * ($scope.page - 1);
                $scope.isLoading = true;

                $http.post('/api/exception/filter', { platform: $scope.platform, skip: skip })
                    .success(function (result) {
                        $scope.isLoading = false;
                        $scope.exceptionList = result.data;
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }else{
                getList();
            }
        }

        function init() {
            getList();
        }

        init();
    });
}(angular));
