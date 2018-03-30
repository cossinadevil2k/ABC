(function ($a) {
    'use strict';
    $a.module('ML').controller('searchQuery', function ($scope, $rootScope, $http, $modal, $location) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Search-query Manager';

        $scope.isLoading = false;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        var limit = 20;
        $scope.queryList = [];

        $scope.nextPage = function (numberPage) {
            $scope.page += numberPage;
            getList();
        };

        function excutePage(scope) {
            $scope.isFirstPage = $scope.page == 1;
            $scope.isLastPage = scope.length < limit;
        };

        function getList() {
            var skip = limit * ($scope.page - 1);
            $scope.isLoading = true;
            $http.post('/search-query/get', { skip: skip, limit: limit })
                .success(function (result) {
                    $scope.isLoading = false;
                    if (result.s) {
                        $scope.queryList = result.d;
                        excutePage($scope.queryList);
                    }
                    else alert("Get list failed");
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        }

        getList();

        function alertModal(message) {
            var modalInstance = $modal.open({
                templateUrl: 'alert.html',
                controller: ctrlAlert,
                resolve: {
                    message: function () {
                        return message;
                    }
                }
            });

            modalInstance.result.then(function () { });
        }

        function ctrlAlert($scope, $modalInstance, message) {
            $scope.message = message;

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }

        $scope.regen = function (query) {
            var ok = confirm('"' + query.name + '" will be regenerate new cached result. Are you sure?');
            if (ok) {
                $scope.isLoading = true;
                $http.post('/search-query/regenerate', { query: query })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            getList();
                            alert("Regenerate search-query is being process");
                        }
                        else alert("Regen new result failed");
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }
        };

        $scope.exportToCsv = function (query) {
            var ok = "Are you sure?";

            if (!ok) return;

            $scope.isLoading = true;

            $http.post('/search-query/export-full', { tags: query.query })
                .success(function (result) {
                    $scope.isLoading = false;

                    if (!result.s) {
                        alert("Export failed");
                    } else {
                        alertModal('The request is being processed. You will be notified whenever it done');
                    }
                })
                .error(function () {
                    $scope.isLoading = false;

                    alert('Error From Server');
                });

        };

        $scope.removeQuery = function (query) {
            var ok = confirm('"' + query.name + '" will be removed. Are you sure?');
            if (ok) {
                $scope.isLoading = true;
                $http.post('/search-query/remove', { query: query })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) getList();
                        else alert("Remove search-query failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            }
        };

        $scope.regenerateAll = function () {
            var ok = confirm('" Will you regenerate all search query. Are you sure?');
            if (ok) {
                $scope.isLoading = true;
                $http.post('/search-query/regenerate-all', { query: {} })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            alert('successfully');
                            getList();
                        }
                        else alert("Regenerate all search-query failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            }
        }

        $scope.createAutomationQuick = function (query) {
            if (!query) return;
            
            $location.path("/email_push_automation").search({ query: query.name,id : query._id, modal: true });
        }
    });
}(angular));