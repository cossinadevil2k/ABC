(function($a){
    "use strict";
    $a.module('ML').controller('SyncFailDetail', function($scope, $http, $rootScope, $routeParams){
        $rootScope.MLPageDetail = 'Sync Failed Detail';

        getItem($routeParams.id);
        function getItem(id){
            $http.post('/sync-fail-log/get-one', {errorId: id})
                .success(function(data){
                    if(data.s) {
                        $scope.item = data.d;
                    } else alert("Get Log Failed");
                })
                .error(function(){
                    alert("Error From Server");
                })
        }

    })
}(angular));