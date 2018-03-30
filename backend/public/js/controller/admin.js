(function($a){
    'use strict';
    $a.module('ML').controller('admin', function($scope, $rootScope, $modal, $routeParams, $http){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Admins';

        $scope.isFirstPage = true;
        $scope.isLastPage = true;


        function listAdmin(){
            $http.post('/admin/list', {})
                .success(function(data,stt){
                    if(data.error){
                        alert(data.msg);
                    } else {
                        $scope.listAdmin = data.data;
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        $scope.getListAdmin = function(){
            listAdmin();
        };

        $scope.search = function(){};

        $scope.edit = function(admin){
          var modalInstance = $modal.open({
            templateUrl: '/partials/admin/edit.html',
            controller: roleController,
            resolve: {
              admin: function() {
                  return admin;
              }
            }
          });
        };

        var roleController = function(admin, $scope, $modalInstance){
          $scope.cancel = function(){
             $modalInstance.dismiss('cancel');
          };
          $scope.admin = admin;

          $scope.updateAdmin = function(adminInfo){
            $http.post('/admin/update', {adminId: admin._id, updates: {permission: adminInfo.permission}})
                .success(function (data) {
                    if(data.error) {
                      alert('Update failed');
                    } else {
                      listAdmin();
                      $scope.cancel();
                    }
                })
                .error(function () {
                    alert("Error from Server");
                })
          }
        };

        $scope.delete = function(admin){
            var s = confirm("Are you sure?");
            if(s) {
                $http.post('/admin/delete', {adminInfo: admin})
                    .success(function (data) {
                        if (!data.error) {
                            listAdmin();
                        } else {
                            alert(data.msg);
                        }
                    })
                    .error(function () {
                        alert('Error from server :(');
                    });
            }
        };

        $scope.showSearchAdminMobile = function(){
           var modalInstance = $modal.open({
             templateUrl: '/partials/admin/searchMobile.html',
             controller: modalController,
           });
        };

        var modalController = function($scope, $modalInstance) {
          $scope.cancel = function(){
             $modalInstance.dismiss('cancel');
          };
          $scope.search = function () {
            $scope.cancel();
          };
        };

        $scope.changePermission = function(adminInfo){
            var s = confirm('Are you sure?');
            if(s){
                adminInfo.isAdminSystem = !adminInfo.isAdminSystem;
                $http.post('/admin/update', {adminId: adminInfo._id, updates: {isAdminSystem: adminInfo.isAdminSystem}})
                    .success(function(data){
                        if(data.error) alert('Update failed');
                    })
                    .error(function(){
                        alert('Error From Server');
                    })
            }
        };

        $scope.add = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/admin/info.html',
                controller: ctrlAdd,
                resolve: {}
            });
            modalInstance.result.then(function(){
            });
        };

        var ctrlAdd = function($http, $scope, $modalInstance){
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };

            $scope.addAdmin = function(adminInfo){
                if(!adminInfo ||!adminInfo.username ||adminInfo.username==="" || !adminInfo.password ||adminInfo.password===""){
                    $scope.errorMsg = "Please fill all the field below";
                } else {
                    $http.post('/admin/add', {adminInfo: adminInfo})
                        .success(function (data) {
                            if (data.error) {
                                $scope.errorMsg = data.msg;
                            } else {
                                listAdmin();
                                $scope.cancel();
                            }
                        })
                        .error(function () {
                            alert("Error from Server");
                        })
                }
            }
        };
    })
}(angular));
