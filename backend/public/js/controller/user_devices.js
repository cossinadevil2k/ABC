(function($a){
    'use strict';
    $a.module('ML').controller('user_devices', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Device Manager';
        $scope.isLoading = true;
        var limit = 20;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.devices = [];
        $scope.result = {};

        getList();

        function getList(){
            var skip = limit * ($scope.page - 1);
            $scope.isLoading = true;
            $http.post('/devices/get-list', {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s){
                        $scope.result = result.d;
                        $scope.devices = $scope.result.list;
                        checkPaging();
                    } else alert("Get device list failed");
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        function checkPaging(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.devices.length < limit);
        }

        $scope.nextPage = function(value){
            $scope.page += value;
            getList();
        };

        $scope.notificationSelector = function(device){
            var modalInstance = $modal.open({
                templateUrl: '/partials/device/select_notification.html',
                controller: ctrlSelectNotification,
                resolve: {
                    device: function(){
                        return device
                    }
                }
            });

            modalInstance.result.then(function(){

            });
        };

        var ctrlSelectNotification = function($scope, $modalInstance, device){
            $scope.device = device;
            $scope.notifications = [];

            function getNotification(){
                $http.post('/message/get',{})
                    .success(function(result){
                        if (!result.err) {
                            $scope.notifications = result.data;
                        } else {
                            alert(result.msg);
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }

            getNotification();

            $scope.send = function(){
                if (this.selectedNotification) {
                    // console.log(this.selectedNotification, $scope.device.deviceId);
                    $modalInstance.close();
                }
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('close');
            }
        };

        $scope.openDetailModal = function(id){
            var modalInstance = $modal.open({
                templateUrl: '/partials/device/device_info.html',
                controller: ctrlDeviceInfo,
                resolve: {
                    deviceId: function(){
                        return id;
                    }
                }
            });
        };

        var ctrlDeviceInfo = function($scope, $modalInstance, deviceId){
            $scope.isLoading = false;
            $scope.device = {};

            function getDevice(id){
                $scope.isLoading = true;
                $http.post('/devices/get-one', {id: id})
                    .success(function(result){
                        $scope.isLoading = false;
                        if (result.s) $scope.device = result.d;
                        else alert("Get device info error");
                    })
                    .error(function() {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    })
            }

            getDevice(deviceId);

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        }
    });
}(angular));
