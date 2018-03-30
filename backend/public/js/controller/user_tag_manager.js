(function($a){
    'use strict';

    $a.module('ML').controller('userTagManager', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'User Tag Manager';

        function getTags(){
            $http.get('/user-tag-manager/get')
                .success(function(data){
                    $scope.tags = data.tags;
                })
                .error(function(data){
                    alert('Error From Server');
                })
        }
        getTags();

        $scope.getList = function(){
            getTags();
        };

        $scope.add = function(){
            var tag = prompt("Enter new tag");
            // console.log(tag);
            if(tag && tag !== ""){
                $scope.tags.push(tag);
            }
        };

        $scope.remove = function(tag){
            $scope.tags.forEach(function(element, index){
                if(element === tag){
                    $scope.tags.splice(index, 1);
                }
            });
        };

        $scope.save = function(){
            $http.post('/user-tag-manager/save', {taglist: $scope.tags})
                .success(function(data){
                    if(data.s){
                        getTags();
                    } else {
                        alert(data.msg);
                    }
                })
                .error(function(data){
                    alert('Error From Server');
                })
        };
    })
}(angular));
