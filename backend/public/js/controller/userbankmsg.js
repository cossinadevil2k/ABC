(function($a){
    'use strict';

    $a.module('ML').controller('userbankmsg', function($scope, $rootScope, $http, $modal, $routeParams){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Bank Messages from User';

        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;
        var limit = 20;
        $scope.listmess = [];

        function getData(){
            var skip = limit * ($scope.page - 1);
            $scope.isLoading = true;
            $http.post('/userbankmsg/get',{skip: skip, limit: limit})
                .success(function(data){
                    $scope.isLoading = false;
                    if (data.err){
                        alert(data.msg);
                    } else {
                        $scope.listmess = data.data;
                        checkPage();
                    }
                })
                .error(function(data, err){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listmess.length > limit;
        }

        $scope.getList = function(){
            getData();
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            getData();
        };

        $scope.downloadMessList = function(){
            location.href='/userbankmsg/download';
        };

        $scope.delete = function(msg){
            var ok = confirm("Are you sure?");
            if(!ok) {
                return 0;
            }

            $http.post('/userbankmsg/delete', {msgId: msg._id})
                .success(function (data) {
                    $scope.getList();
                    alert(data.msg);
                })
                .error(function (data) {
                    alert('Error From Server');
                });
        };

        getData();
    });
}(angular));