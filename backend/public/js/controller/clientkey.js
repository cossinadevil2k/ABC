(function($a){
    'use strict';

    $a.module('ML').controller('clientKey', function($scope, $rootScope, $routeParams, $http, $modal){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Client Key';
        $scope.listCK = [];
        $scope.isLoading = false;

        $scope.getList = function(rule){
            $scope.isLoading = true;
            $http.post('/clientkey/get', {rule: rule}).success(function(data){
                $scope.isLoading = false;
                if (data.s) {
                    return $scope.listCK = data.d;
                }

                if (data.e) {
                    alert(data.e);
                }
            }).error(function(){
                $scope.isLoading = false;
                alert('error');
            });
        };

        $scope.delete = function(clientkey, index){
            var ok = confirm('Do you really want to delete a clientKey named "' + clientkey.clientName + '"?');

            if (!ok) {
                return
            }

            $http.post('/clientkey/delete', {ckid: clientkey._id}).success(function(data){
                $scope.listCK.splice(index);
            }).error(function(data){
                alert("Delete Error");
            });
        };

        $scope.disable = function(key){
            var ok = confirm('Are you sure?');

            if (!ok) {
                return;
            }

            $http.post('/clientkey/disable', {clientId: key._id})
                .success(function(result){
                    $scope.isLoading = false;
                    if (!result.s) alert('Disable client key due to error');
                    else key.isDisabled = true;
                })
                .error(function(){
                    alert("Error From Server");
                });
        };

        $scope.enable = function(key){
            var ok = confirm('Are you sure?');

            if (!ok) {
                return;
            }

            $http.post('/clientkey/enable', {clientId: key._id})
                .success(function(result){
                    $scope.isLoading = false;
                    if (!result.s) alert('Enable client key due to error');
                    else key.isDisabled = false;
                })
                .error(function(){
                    alert("Error From Server");
                });
        };

        $scope.showSecret = function(key){
            key.showSecret = true;
        };

        $scope.hideSecret = function(key){
            key.showSecret = false;
        };
        
        $scope.setInternal = function(ck) {
            $http.post('/clientkey/change-internal', {id: ck._id, status: !ck.internal})
                .success(function(result) {
                    if (!result.s) return alert('Change internal status failed');
                    ck.internal = !ck.internal;
                })
                .error(function() {
                    alert('Error from server');
                });
        };

        $scope.addNew = function() {
            var modalInstance = $modal.open({
                templateUrl: '/partials/client_key/info.html',
                controller: ctrlAdd,
                resolve: {
                    lstCK: function(){
                        return $scope.listCK
                    }
                }
            });

            modalInstance.result.then(function() {
            }, function() {});
        };

        var ctrlAdd = function($scope, Page, $modalInstance, lstCK){
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };

            $scope.saveCk = function(ck) {
                if (!ck) return;
                if (!ck.clientName) return alert('Please type name of key');
                if (!ck.rule) return alert('Please select type of key');
                ck.rule = parseInt(ck.rule);

                $http.post('/clientkey/save', ck).success(function(data){
                    if(!data.s){
                        alert("Add new key due to error");
                    } else {
                        lstCK.push(data.d);
                        $modalInstance.dismiss('cancel');
                    }
                }).error(function(){
                    alert("Can't save new client key");
                });
            }
        };

        $scope.editInfo = function(key){
            var modalInstance = $modal.open({
                templateUrl:'/partials/client_key/info.html',
                controller: ctrlEdit,
                resolve: {
                    info: function(){
                        return key;
                    }
                }
            });

            modalInstance.result.then(function(info){
                key = info;
            });
        };

        var ctrlEdit = function($scope, $modalInstance, info){
            $scope.ckinfo = info;

            $scope.saveCk = function(key){
                $http.post('/clientkey/edit', {clientId: key._id, name: key.clientName, platform: key.platform})
                    .success(function(result){
                        if (!result.s) alert("Edit client key due to error");
                        else $modalInstance.close(key);
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        };

        $scope.regenSecret = function(key, index){
            var ok = confirm('Are you sure?');
            if (!ok) return;
            $http.post('/clientkey/regenerate-secret', {clientId: key._id})
                .success(function(result){
                    if (result.s) $scope.listCK[index] = result.d;
                    else alert('Regenerate secret due to error');
                })
                .error(function(){
                    alert("Error From Server");
                });
        };

        $scope.changeDisabledStatus = function(client){
            client.isDisabled = !client.isDisabled;
        };
    })
}(angular));
