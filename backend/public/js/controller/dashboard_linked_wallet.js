'use strict';

(function($a) {
    $a.module('ML').controller('dashboardLinkedWallet', function($scope, $rootScope, $modal, $http) {
        $rootScope.MLPageDetail = 'Dashboard Linked Wallet Details';
        $rootScope.tabSelect = 1;
        $scope.loadingTopService = false;
        $scope.serviceRanking = [];

        function showRank() {
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

        function init() {
            showRank();
        }

        init();

    });
}(angular));
