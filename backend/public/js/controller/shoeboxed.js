(function($a, document){
    $a.module('ML').controller('shoeboxed', function($scope, $modal, $rootScope, $http){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Test Shoeboxed';

        $scope.upload = function(){
            if (this.imgFile){
                var fd = new FormData();
                fd.append('filedata', document.querySelector('#imgFile').files[0]);
                $http.post('/test-shoeboxed/upload', fd, {
                    headers: {'Content-Type': undefined},
                    transformRequest: $a.identity
                }).success(function(result){

                }).error(function(){
                    alert("Error From Server");
                });
            }
        };
    });
}(angular, document));