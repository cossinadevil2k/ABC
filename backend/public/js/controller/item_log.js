'use strict';

(function($a){
    $a.module('ML').controller('ItemLog', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Purchase item log';
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        var limit = 20;
        $scope.listLog = [];

        function getData(){
            var skip = limit * ($scope.page - 1);

            sendRequest('/item-log/list', {skip: skip, limit: limit}, function(err, data){
                if (err) {
                    return alert(err);
                }

                $scope.listLog = data;
                checkPage();
            });
        }

        function sendRequest(url, postData, callback){
            $scope.isLoading = true;
            $http.post(url, postData)
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        return callback(null, result.d);
                    }

                    callback('Get data due to failed');
                })
                .error(function(){
                    $scope.isLoading = false;
                    callback('Error From Server');
                });
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listLog.length < limit;
        }

        $scope.nextPage = function(value){
            $scope.page += value;
            getData();
        };
        
        function init(){
            getData();
        }

        init();
    });
}(angular));