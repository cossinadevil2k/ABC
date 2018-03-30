(function($a){
    'use strict';

    $a.module('ML').controller('premiumlog', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Admin log';

        $scope.displaySearch = false;
        $scope.listLog = [];

        var searchMode = [{value: 0, title:"Tìm theo admin"}, {value: 1, title:"Tìm theo email"}];
        $scope.searchMode = searchMode[0];

        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.page = 1;
        var limit = 100;

        checkFirstLastPage();

        function getLog(l, s){
            $http.post('/premiumlog/getlist', {limit: l, skip: s})
                .success(function(data){
                    if(data.s){
                        $scope.listLog = data.d;
                        checkFirstLastPage();
                    } else {
                        alert(data.msg);
                    }
                })
                .error(function(data){
                    alert("Error From Server");
                })
        }

        function checkFirstLastPage(){
            if($scope.page ==1){
                $scope.isFirstPage = true;
            } else {
                $scope.isFirstPage = false;
            }
            if($scope.listLog.length < limit){
                $scope.isLastPage = true;
            } else $scope.isLastPage = false;
        }

        function searchPage() {
            $scope.isFirstPage = true;
            $scope.isLastPage = true;
        }

        function search(keyword, callback){
            var url = '';
            if($scope.searchMode.value === 0) {
                url = '/premiumlog/search-admin';
            } else {
                // value = 1
                url = '/premiumlog/search-email';
            }
            $http.post(url, {keyword: keyword})
                .success(function(data){
                    callback(data);
                })
                .error(function(data){
                    callback(false);
                })
        }

        $scope.getList = function(){
            $scope.page = 1;
            getLog(limit, 0);
        };

        $scope.searchKey = function (event, keyword) {
            var keyCode = window.event ? event.keyCode : event.which;
            if(keyCode === 13) $scope.search(keyword);
        };

        $scope.search = function(keyword){
            search(keyword, function(data){
                if(data){
                    if(data.s){
                        if(data.d.length > 0){
                            $scope.listLog = data.d;
                            searchPage();
                        }
                        else
                            alert("No result");
                    } else {
                        alert(data.msg);
                    }
                } else {
                    alert("Error From Server");
                }
            })
        };

        $scope.clearList = function(){
            var ok = confirm("Are you SURE????");
            if(ok){
                $http.post('/premiumlog/clear', {ok:"ok clear"})
                    .success(function(data){
                        if(data.s){
                            $scope.getList();
                        } else {
                            alert("failed");
                        }
                    })
                    .error(function(data){
                        alert('Error From Server');
                    })
            }
        };

        $scope.selectSearchMode = function(mode){
            $scope.searchMode = searchMode[mode];
        };

        $scope.nextPage = function(p){
            $scope.page += p;
            var skip = limit*($scope.page -1);
            getLog(limit, skip);
        };
    })
}(angular));
