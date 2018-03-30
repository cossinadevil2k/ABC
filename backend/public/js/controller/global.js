(function($a, document){
    'use strict';
    $a.module('ML').controller('global', function($scope, $http, $modal, notificationService, $rootScope) {
        $scope.new_noti = notificationService.getNotification();

        $scope.openIssues = 0;
        $scope.totalIssues = 0;

        $scope.spotlightOpened = false;
        $scope.setting = {};

        //binding notification
        $scope.$watch(function(){ return notificationService.getNotification(); }, function(newValue, oldValue){
            $scope.new_noti = newValue;
        });

        setInterval(function(){
            checkMaintainStatus();
        }, 60000);

        function checkMaintainStatus(){
            $http.get('/server-setting/get')
                .success(function(result){
                    if (result.s) {
                        $scope.setting = result.data;
                        if ($scope.setting.isServerMaintain === 'true') {
                            document.getElementById("footerMaintainStatus").removeAttribute('hidden');
                        } else {
                            document.getElementById("footerMaintainStatus").setAttribute('hidden', 'true');
                        }
                    }
                })
                .error(function(){

                });
        }
        checkMaintainStatus();

        $scope.logout = function() {
            $http.post('/logout').success(function(data) {
                if (data.error === 0) window.location = '/login';
                else alert("Logout Failed");
            }).error(function() {
                alert("Error From Server");
            });
        };

        $scope.changePassword = function(adminId){
            var modalInstance = $modal.open({
                templateUrl: '/partials/global/change_password.html',
                controller: ctrlChangePassword,
                resolve: {

                }
            })
        };

        var ctrlChangePassword = function($scope, $modalInstance){
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };

            $scope.closeAlert = function(mode){
                if(mode === 'success'){
                    $scope.isSuccess = false;
                } else if (mode === 'warning') {
                    $scope.isWarning = false;
                } else {
                    //error
                    $scope.isError = false;
                }
            };

            function checkSubmitData(data){
                if(!data ||!data.current || !data.newPassword || !data.retype){
                    $scope.isWarning = true;
                    $scope.warningMessage = 'Please complete all the fields!';
                    return false;
                } else if (data.newPassword.length < 6 || data.retype.length <6){
                    $scope.isWarning = true;
                    $scope.warningMessage = 'New Password must be at least 6 characters!';
                    return false;
                } else if (data.retype !== data.newPassword){
                    $scope.isWarning = true;
                    $scope.warningMessage = 'Retype New Password and New Password must match!';
                    return false;
                } else {
                    return true;
                }
            }

            $scope.submit = function(data){
                var ok = checkSubmitData(data);
                if(ok){
                    $http.post('/admin/change-password', {passwords: data})
                        .success(function(data){
                            if(!data.s){
                                if(data.msg ==='wrong_password'){
                                    $scope.isWarning = true;
                                    $scope.warningMessage = 'Wrong Password!';
                                } else if(data.msg === 'admin_not_exist'){
                                    $scope.isWarning = true;
                                    $scope.warningMessage = 'Admin Not Found!';
                                } else if(data.msg === 'change_password_failed'){
                                    $scope.isError = true;
                                }
                            } else {
                                $scope.isSuccess = true;
                            }
                        })
                        .error(function(){
                            alert('Error From Server');
                        })
                }
            }
        };

        $scope.openNotification = function(){
            var noti = document.getElementById("noticenter");
            noti.className += " open";
        };

        var sidebarOpened = false;

        $scope.showSidebar = function(){
            var sidebar = document.getElementById("sidebar-wrapper");
            var burger = document.getElementById("show-menu");

            var defaultBurger = "btn btn-primary";

            if(!sidebarOpened){
                sidebar.className = "open";
                burger.className += " sidebar-opened";
                sidebarOpened = true;
            } else {
                sidebar.className = "";
                burger.className = defaultBurger;
                sidebarOpened = false;
            }

        };

        function countIssue(){
            $http.post('/helpdesk/issue/count', {})
                .success(function(result){
                    if (result.s) {
                        $scope.openIssues = result.d.open;
                        $scope.totalIssues = result.d.total;
                    } else alert("Issue Counting Fails");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function countReceipt(){
            $http.post('/receipt/count', {})
                .success(function(result){
                    if (result.s) {
                        $scope.openReceipts = result.d.openReceipts;
                    } else alert("Issue Counting Fails");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        countIssue();
        countReceipt();

        $scope.userSpotlight = function(){
            if (!$scope.spotlightOpened) {
                var modalInstance = $modal.open({
                    templateUrl: 'user_spotlight.html',
                    controller: ctrlUserSpotlight
                });

                modalInstance.opened.then(function(){
                    $scope.spotlightOpened = true;
                });

                modalInstance.result.then(function(){
                    //close
                }, function(){
                    //dismiss
                    $scope.spotlightOpened = false;
                });
            }
        };

        var ctrlUserSpotlight = function($scope, $modalInstance){
            $scope.hasResult = false;
            $scope.results = [];
            $scope.isLoading = false;

            var myTimeout;

            function validateEmail(email) {
                var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
                return re.test(email);
            }

            $scope.detectSocial = function(userTags){
                if (!userTags) return null;
                if (userTags.indexOf('facebook') != -1) return 'facebook';
                if (userTags.indexOf('google') != -1) return 'google';
            };

            function doSearch(kw){
                myTimeout = setTimeout(function(){
                    $scope.isLoading = true;
                    $http.post('/user/search', {limit: 100, skip: 0, condition: {email:kw}, mode: 1})
                        .success(function(result){
                            if (result.error) alert("Searching failed");
                            else {
                                result.data.forEach(function(user){
                                    getDevice(user);
                                    getCountry(user);
                                });
                                $scope.results = result.data;
                                $scope.hasResult = true;
                                $scope.isLoading = false;
                            }

                        })
                        .error(function(){
                            $scope.isLoading = false;
                            alert('Error From Server');
                        });
                }, 1000);
            }

            function stopTimeout(){
                clearTimeout(myTimeout);
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
                
            };

            function editUser(userInfo, callback) {
                $http.post('/user/edit', userInfo).success(function(data) {
                    callback(data);
                }).error(function(data) {
                    callback(data);
                });
            }

            $scope.setPurchased = function(userInfo){
                var purchased = userInfo.purchased ? false : true;
                var s = confirm('Bạn thực sự muốn thực hiện thay đổi này?');
                if (s) {
                    userInfo.purchased = purchased;
                    editUser(userInfo, function(data) {
                        if (!data.err) {
                            var action = "";

                            if (purchased){
                                action = "free -> premium";
                            } else {
                                action = "premium -> free";
                            }

                            $http.post('/premiumlog/savelog', {email: userInfo.email, action: action})
                                .success(function(data){
                                    if(!data.s){
                                        alert('Set premium failed');
                                    }
                                })
                                .error(function(){
                                    alert("Error while save admin action");
                                })
                        }
                    });
                }
            };

            $scope.listenKeyPress = function(kw){
                if (kw && validateEmail(kw)) {
                    stopTimeout();
                    doSearch(kw);
                }
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };
    })
}(angular, document));
