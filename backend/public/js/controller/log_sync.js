(function($a){
    'use strict';
    $a.module('ML').controller('LogSync', function($scope, $http, $rootScope){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = "Client Sync Fail Log";

        $scope.logs = [];
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.searchMode = false;
        var limit = 30;

        function getLog(){
            var skip = limit * ($scope.page - 1);
            $http.post('/logsync/get', {limit: limit, skip: skip})
                .success(function(result){
                    if (result.s) {
                        $scope.logs = result.d;
                        checkPage();
                    }
                    else alert("Getting Log Failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }
        getLog();

        function checkPage(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.logs.length < limit);
        }

        function search(keyword, skip, limit){
            $http.post('/logsync/get-by-email', {email: keyword, skip: skip, limit: limit})
                .success(function(result){
                    if (result.s) {
                        $scope.searchMode = true;
                        $scope.logs = result.d;
                        checkPage();
                    } else alert("Finding Log Failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        $scope.search = function(keyword){
            if (keyword) {
                $scope.page = 1;
                search(keyword, 0, limit);
            }
        };

        $scope.searchKey = function (event, keyword) {
            var keyCode = window.event ? event.keyCode : event.which;
            if(keyCode === 13) $scope.search(keyword);
        };

        $scope.backToListMode = function(){
            $scope.searchMode = false;
            $scope.keyword = null;
            $scope.page = 1;
            getLog();
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            if ($scope.keyword && $scope.searchMode){
                var skip = limit * ($scope.page - 1);
                search($scope.keyword, skip, limit);
            } else getLog();
        };
    });
}(angular));
