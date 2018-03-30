(function($a){
    'use strict';
    $a.module('ML').controller('LogSyncDetail', function($scope, $http, $routeParams, $rootScope){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = "Client Sync Fail Log Detail";
        $scope.info = {};

        getInfo($routeParams.id);

        function getInfo(id){
            $http.post('/logsync/get-by-id', {id: id})
                .success(function(result){
                    if (result.s) $scope.info = result.d;
                    else alert("Getting Log Failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }
    });
}(angular));
