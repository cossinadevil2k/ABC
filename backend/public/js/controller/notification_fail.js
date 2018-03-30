(function($a){
    'use strict';
    
    $a.module('ML').controller('NotificationFail', function($scope, $http, $rootScope){
        var limit = 20;
        
        function getList(skip, limit){
            $http.post('/notification-fail/list', {skip: skip, limit: limit})
                .success(function(result){
                    console.log(result);
                }).error(function () {
                    alert("Error From Server");
                });
        }
        
        getList(0, limit);
    });
}(angular));
