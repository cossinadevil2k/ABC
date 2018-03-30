(function($a){
    'use strict';

    $a.module('ML').controller('walletstats', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 1;
        $rootScope.MLPageDetail = 'Wallet stats';

        var getWalletStats = function(element){
            $http.get('/stats/get-wallet-stats')
                .success(function(data){
                    if(data.s){
                        // console.log(data.d);
                        Morris.Bar({
                            element: element,
                            data: data.d,
                            xkey: 'y',
                            ykeys: ['value'],
                            labels: ['Wallet']
                        });
                    } else {

                    }
                })
                .error(function(data){
                    alert("Error From Server");
                })
        };

        $scope.getWalletStats = function(element){
            getWalletStats(element);
        }
    })
}(angular));