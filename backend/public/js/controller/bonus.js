(function($a){
    'use strict';

    $a.module('ML').controller('bonus', function($scope, $rootScope, $http, $routeParams){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Check Wallet Permission';
        $scope.selectedType = 'email';

        $scope.checkPermission = function(){
            if($scope.walletId && ($scope.email || $scope.token)) {
                $http.post('/bonus/check-wallet-permission', {walletId: $scope.walletId, email: $scope.email, tokenDevice: $scope.token})
                    .success(function (data) {
                        if(data.s)
                            alert("Read Permission: " + data.d.readPermission + ", WritePermission: " + data.d.writePermission);
                        else
                            alert("Check Permission Error");
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }
        }
    })
}(angular));