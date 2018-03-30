(function($a){
    'use strict';
    
    $a.module('ML').controller('users', function($scope, $rootScope, $http){
        $rootScope.MLPageDetail = 'Users';
        $rootScope.tabSelect = 2;
        
        $scope.listUser = [];
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;
        
        var limit = 20;
        
        var checkPage = function(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.listUser.length < limit);
        };
        
        var getUserList = function(skip, limit){
            $scope.isLoading = true;
            
            $http.post('/users/list', {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;
                    
                    if (result.s) {
                        result.d.forEach(function(user){
                            getDevice(user);
                            getCountry(user);
                        });
                        $scope.listUser = result.d;
                        checkPage();
                    } else {
                        alert("Get user list failed");
                    }
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        };

        var getCountry = function(user){
            if (user.tags) {
                user.tags.forEach(function(tag){
                    if (tag) {
                        if (tag.indexOf('country') !== -1){
                            user.flag = tag.split(':')[1];
                        }
                    }
                });
            }
        };

        var getDevice = function(user){
            $http.get('/info/device/'+user._id)
                .success(function(data){
                    if(data && data!==false && data!=='false') {
                        data.forEach(function (device) {
                            if (device.platform === 1) {
                                if (!user.hasAndroid) {
                                    user.hasAndroid = true;
                                }
                            } else if (device.platform === 2) {
                                if (!user.hasIos) {
                                    user.hasIos = true;
                                }
                            } else if (device.appId === 5){
                                if (!user.hasWindows) {
                                    user.hasWindows = true;
                                }
                            } else if (device.appId === 4){
                                if (!user.hasWp) {
                                    user.hasWp = true;
                                }
                            } else if (device.platform === 6){
                                if (!user.hasOsx) {
                                    user.hasOsx = true;
                                }
                            } else if (device.platform === 7){
                                if (!user.hasWeb) {
                                    user.hasWeb = true;
                                }
                            }
                        });
                    }
                })
                .error(function(){
                    alert("Error from server");
                });
        };

        var detectSocial = function(userTags){
            if (!userTags) return null;
            if (userTags.indexOf('facebook') != -1) return 'facebook';
            if (userTags.indexOf('google') != -1) return 'google';
        };
        
        var nextPage = function(value) {
            $scope.page += value;
            var skip = limit * ($scope.page - 1);
            
            getUserList(skip, limit);
        };

        function init() {
            var skip = limit * ($scope.page -1);

            getUserList(skip, limit);
        }

        /**
         * EXPORTS
         */

        //init
        init();

        $scope.detectSocial = detectSocial;
        $scope.nextPage = nextPage;
    });
}(angular));
