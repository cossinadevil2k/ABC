(function($a, document){
    'use strict';
    $a.module('ML').controller('global', function($scope, $http, $modal, notificationService, $rootScope) {
        $scope.new_noti = notificationService.getNotification();

        $scope.openIssues = 0;
        $scope.totalIssues = 0;

        $scope.spotlightOpened = false;
        $scope.setting = {};

        var sidebarOpened = false;

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

        $scope.changePassword = function(message, options){
            var info = {
                templateUrl: '/partials/global/change_password.html',
                controller: ctrlChangePassword,
                resolve: {
                    message: function () {
                        return message;
                    },

                    options: function(){
                        return options;
                    }
                }
            };

            if (options && options.closeDisable) {
                info.backdrop = 'static';
            }

            var modalInstance = $modal.open(info);
        };

        var ctrlChangePassword = function($scope, $modalInstance, message, options){
            if (message) $scope.warningMessage = message;
            $scope.options = options || {};

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
                
                if (!ok) {
                    return;
                }

                $http.post('/change-password', {op: data.current, np: data.newPassword})
                    .success(function(data){
                        if (data.s){
                            $modalInstance.close();
                        } else {
                            $scope.isError = true;
                        }
                    })
                    .error(function(){
                        alert('Error From Server');
                    });
            }
        };

        $scope.openNotification = function(){
            var noti = document.getElementById("noticenter");
            noti.className += " open";
        };

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

        function checkFirstLogin(){
            if (window.lastLogin == '') {
                var message = 'This is your first login, we highly recommend you should change your default password';
                
                $scope.changePassword(message, {closeDisable: true});
            }
        }

        checkFirstLogin();
    })
}(angular, document));
