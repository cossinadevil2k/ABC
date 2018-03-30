(function($a){
    'use strict';
    $a.module('ML').controller('macBeta', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Mac Beta';
        $scope.editMode = false;

        function getVersion(){
            $http.get('/mac-beta/get-version')
                .success(function(data){
                    if(data.s){
                        $scope.macInfo = data.d;
                    } else $scope.macInfo = null;
                })
                .error(function(){
                    alert("Error From Server");
                })
        }

        getVersion();

        $scope.editOn = function(){
            $scope.editMode = true;
        };

        $scope.save = function(macInfo){
            console.log(macInfo);
            $http.post('/mac-beta/update-version', macInfo)
                .success(function(result){
                    if(result.s) $scope.editMode = false;
                    else alert("Save Failed");
                })
                .error(function(){
                    alert("Error From Server");
                })
        };
    })
}(angular));
