(function($a){
    'use strict';

    $a.module('ML').controller('rwList', function($scope, $http, $rootScope, $modal, $location){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Remote Wallet List';
        $scope.walletList = [];
        var limit = 20;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;
        $scope.walletDetails = {};
        $scope.isViewRank = false;
        $scope.loadingTopService = false;
        $scope.serviceRanking = [];

        /**IMPLEMENT**/
        getList(0, limit);

        /**FUNCTIONS**/
        function getList(skip, limit){
            $scope.isLoading = true;
            $http.post('/remote-wallet/list', {skip: skip, limit: limit})
                .success(function(result) {
                    $scope.isLoading = false;
                    if (result.s) {
                        $scope.walletList = result.d;
                        if (result.total) $scope.total = result.total;
                        checkPage();
                    } else {
                        alert("Getting Remote Wallet failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.walletList.length < limit;
        }

        function nextPage(value){
            $scope.page += value;
            var skip = limit * ($scope.page - 1);
            getList(skip, limit);
        }

        function showRank() {
            $scope.isViewRank = !$scope.isViewRank;

            if ($scope.serviceRanking.length === 0) {
                $scope.loadingTopService = true;

                $http.post('/remote-wallet/provider/wallet-amount', {})
                    .success(function(result) {
                        $scope.loadingTopService = false;

                        if (!result.status) return alert('Get service ranking failed');
                        $scope.serviceRanking = result.data;
                        $scope.serviceRanking.sort(function(a, b) {
                            return b.amount - a.amount;
                        });
                    })
                    .error(function() {
                        $scope.loadingTopService = false;

                        alert('Error from server');
                    });
            }
        }

        /**EXPORTS**/
        $scope.nextPage = nextPage;
        $scope.showRank = showRank;
    });
}(angular));