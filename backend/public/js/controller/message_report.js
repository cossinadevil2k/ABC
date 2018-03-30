(function($a){
    'use strict';

    $a.module('ML').controller('pushMessageReport', function($scope, $http, $rootScope, $location, $modal){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Notifications Report';

        $scope.session = {};
        $scope.stat = {};
        $scope.isStatLoading = false;

        var query = $location.search();

        function getSession(id){
            $http.post('/message/get-one-session', {id: id})
                .success(function(result){
                    if(result.s){
                        $scope.session = result.d;
                    } else {
                        alert("Get notification info failed");
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        getSession(query.id);

        function getNotificationStat(id){
            $scope.isStatLoading = true;
            $http.post('/message/report',{id: id})
                .success(function(result){
                    $scope.isStatLoading = false;
                    if (result.s){
                        $scope.stat = result.d;
                    } else {
                        alert("Get notification stat failed");
                    }
                })
                .error(function(){
                    $scope.isStatLoading = false;
                    alert("Error From Server");
                })
        }

        getNotificationStat(query.id);

        $scope.userListReport = function(mode){
            var modalInstance = $modal.open({
                templateUrl: '/partials/messages/user-list-report.html',
                controller: ctrlUserListReport,
                resolve: {
                    session: function(){
                        return $scope.session;
                    },
                    mode: function(){
                        return mode;
                    }
                }
            });
        };


        var ctrlUserListReport = function($scope, $modalInstance, session, mode) {
            var limit = 10;
            $scope.mode = mode;
            $scope.page = 1;
            $scope.isFirstPage = true;
            $scope.isLastPage = true;
            $scope.isLoading = false;
            $scope.users = [];
            $scope.deviceLogs = [];
            $scope.session = session;

            getData($scope.mode);

            function checkFirstLastPage(){
                $scope.isFirstPage = $scope.page === 1;
                $scope.isLastPage = $scope.users.length < limit;
            }

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

            var getCountry = function(user){
                if (user.tags) {
                    user.tags.forEach(function(tag){
                        if (tag.indexOf('country') !== -1){
                            user.flag = tag.split(':')[1];
                        }
                    });
                }
            };

            $scope.detectSocial = function(userTags){
                if (!userTags) return null;
                if (userTags.indexOf('facebook') != -1) return 'facebook';
                if (userTags.indexOf('google') != -1) return 'google';
            };

            function getOpened(sessionId, page){
                var skip = limit * (page - 1);
                $scope.isLoading = true;
                $http.post('/message/opened-by-push-session', {id: sessionId, limit: limit, skip: skip})
                    .success(function(result){
                        $scope.isLoading = false;
                        if (result.s) {
                            $scope.deviceLogs = result.d;
                            //getDevice($scope.users);
                            //getCountry($scope.users);
                            checkFirstLastPage();
                        }
                        else alert("Getting opened users failed");
                    })
                    .error(function(){
                        $scope.isLoading = false;
                        alert("Error from server");
                    })
            }

            function getError(sessionId, page){
                $scope.isLoading = true;
                var skip = limit * (page - 1);
                $http.post('/message/error-by-push-session', {id: sessionId, skip: skip, limit: limit})
                    .success(function(result){
                        $scope.isLoading = false;
                        if (result.s) {
                            $scope.deviceLogs = result.d;
                            //getDevice($scope.users);
                            //getCountry($scope.users);
                            //checkFirstLastPage();
                        }
                        else alert("Getting error users failed");
                    })
                    .error(function(){
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }


            function getData(mode, page){
                if (mode === 'Opened') getOpened(session._id, page);
                else getError(session._id, page); //error
            }

            $scope.nextPage = function(value){
                $scope.page += value;
                getData($scope.mode, $scope.page);
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };
    });
}(angular));
