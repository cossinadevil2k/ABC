(function($a){
    'use strict';

    $a.module('ML').controller('rwRequest', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Remote Wallet Extend Limit Request';

        var limit = 20;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;
        $scope.isSearchPage = false;
        $scope.listRequest = [];

        function getList(){
            $scope.isLoading = true;
            $http.post('/remote-wallet/get-request', {limit: limit, skip: limit * ($scope.page - 1)})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        $scope.listRequest = result.d;
                        checkPage();
                    } else alert("Get request list due to error");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        getList();

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listRequest.length < limit;
        }

        $scope.deleteRequest = function(request) {
            var ok = confirm('Are you sure?');
            if (ok) {
                $scope.isLoading = true;
                $http.post('/remote-wallet/delete-extend-limit-request', {id: request._id})
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) getList();
                        else alert("Delete request failed");
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }
        };

        $scope.accept = function(request) {
            var ok = confirm('Are you sure?');
            if (!ok) return;

            $scope.isLoading = true;
            $http.post('/remote-wallet/accept-extend-limit-request', {request: request})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        var action = "Accept Extend Remote Wallet Limit Request";
                        $http.post('/premiumlog/savelog', {email:request.user.email, action:action})
                            .success(function(data){

                            })
                            .error(function(){

                            });
                        getList();
                    }
                }).error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        };

        $scope.reject = function(request) {

        }
    });
}(angular));