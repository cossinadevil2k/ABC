(function($a){
    "use strict";
    $a.module('ML').controller('SyncFailLog', function($scope, $http, $rootScope){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Sync Failed Items';
        var limit = 100;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.platforms = [
            {
                id:0,
                text:"All"
            },
            {
                id:1,
                text:"Android"
            },
            {
                id:2,
                text:"iOS"
            },
            {
                id:3,
                text:"Windows"
            },
            {
                id:6,
                text:"Mac OSX"
            }
        ];
        $scope.selectedPlatform = $scope.platforms[0];
        var errorTypeSelected = ["all"];
        var platformSelected = [0];

        $scope.logs = [];

        function checkPage(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.logs.length < limit);
        }

        function getList(){
            var skip = limit * ($scope.page - 1);
            var postData = {
                limit:limit,
                skip:skip,
                platform: platformSelected,
                viewMode: errorTypeSelected
            };

            $http.post('/sync-fail-log/get', postData)
                .success(function(data){
                    $scope.isLoading = false;
                    if(data.s){
                        $scope.logs = data.d;
                        checkPage();
                    } else {
                        alert("Get Logs failed");
                    }
                })
                .error(function(){
                    alert("Error From Server");
                })
        }

        $scope.getList = function(){
            $scope.isLoading = true;
            if($scope.keyword) $scope.keyword = null;
            getList();
        };

        $scope.checkErrorSelected = function(type){
            return errorTypeSelected.indexOf(type);
        };

        $scope.checkErrorType = function(type){
            switch(type){
                case 'all':
                    if($scope.checkErrorSelected(type) === -1) errorTypeSelected = ['all'];
                    else errorTypeSelected = ['duplicate','datetime'];
                    break;
                case 'other':
                    if($scope.checkErrorSelected(type) === -1) errorTypeSelected = ['other'];
                    else errorTypeSelected = ['duplicate','datetime'];
                    break;
                default:
                    var index = $scope.checkErrorSelected(type);
                    if(index === -1) errorTypeSelected.push(type);
                    else errorTypeSelected.splice(index, 1);
            }
        };

        $scope.checkPlatformSelected = function(platformId){
            return platformSelected.indexOf(platformId);
        };

        $scope.checkPlatform = function(platformId){
            switch(platformId){
                case 0:
                    if($scope.checkPlatformSelected(platformId) != -1) platformSelected = [1];
                    else platformSelected = [0];
                    break;
                default:
                    var index = $scope.checkPlatformSelected(platformId);
                    if(index != -1) platformSelected.splice(index, 1);
                    else {
                        if(platformSelected.length === 3) platformSelected = [0];
                        else platformSelected.push(platformId);
                    }
                    break;
            }
        };

        function searchByEmail(keyword){
            var postData = {
                email: keyword,
                platform: platformSelected,
                viewMode: errorTypeSelected,
                limit: limit,
                skip: limit * ($scope.page - 1)
            };

            $http.post('/sync-fail-log/search-by-email', postData)
                .success(function(data){
                    if(data.s){
                        $scope.logs = data.d;
                    } else alert("Searching Failed");
                })
                .error(function(){
                    alert("Error From Server");
                })
        }

        $scope.clearLog = function(){
            var ok = confirm("Are you sure???");
            if (ok) {
                $http.post('/sync-fail-log/clear', {})
                    .success(function (result) {
                        if (!result.s) alert("Clear Log Failed");
                        else $scope.logs = [];
                    })
                    .error(function () {
                        alert("Error From Server");
                    })
            }
        };

        $scope.isOnlyOneSelected = function(mode, value){
            var result = false;
            if(mode === 'error') {
                result = (errorTypeSelected.length === 1 && errorTypeSelected[0] === value);
            } else { //mode === platform
                result = (platformSelected.length === 1 && platformSelected[0] === value);
            }
            return result;
        };

        $scope.searchEnter = function(event, keyword){
            if(event.keyCode === 13){
                $scope.page = 1;
                searchByEmail(keyword);
            }
        };

        $scope.searchButton = function(keyword){
            $scope.page = 1;
            searchByEmail(keyword);
        };

        $scope.nextPage = function(number){
            $scope.page += number;
            if($scope.keyword && $scope.keyword != "") searchByEmail($scope.keyword);
            else getList();
        };
    })
}(angular));
