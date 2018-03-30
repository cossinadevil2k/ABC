(function($a){
    'use strict';

    $a.module('ML').controller('openedlog', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 1;
        $rootScope.MLPageDetail = 'App open log';

        $scope.listLog = [];

        $scope.appVersion = ["Android", "iOS Free", "iOS Plus", "Windows Phone", "Windows"];
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;


        var limit = 50;

        var checkFirstLastPage = function(){
            if($scope.page ==1){
                $scope.isFirstPage = true;
            } else {
                $scope.isFirstPage = false;
            }
            if($scope.listLog.length < limit){
                $scope.isLastPage = true;
            } else $scope.isLastPage = false;
        };

        checkFirstLastPage();

        var getLog = function(l, s){
            $http.post('/openedlog/getlist', {limit: l, skip:s})
                .success(function(data, err){
                    if(data.s){
                        $scope.listLog = data.data;
                        checkFirstLastPage();
                    } else {
                        alert('Get List Error');
                    }
                })
                .error(function(data){
                    alert("Error From Server");
                })
        };

        $scope.getList = function(){
            $scope.page = 1;
            getLog(limit, 0);
        };

        $scope.nextPage = function(p){
            $scope.page += p;
            var skip = limit*($scope.page -1);
            getLog(limit, skip);
        };

        $scope.clearList = function(){
            var ok = confirm("Are you SURE?");
            if(ok){
                $http.post('/openedlog/clear', {ok:"ok clear"})
                    .success(function(data, status){
                        if(data.s){
                            $scope.getList();
                        } else {
                            alert("failed");
                        }
                    })
                    .error(function(data){
                        alert("Error from server");
                    });
            }
        };
    })
}(angular));