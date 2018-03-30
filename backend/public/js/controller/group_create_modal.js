(function ($a) {
    'use strict';
    $a.module('ML').controller('groupCreateModal', function ($scope, $rootScope, $modal, $modalInstance, $routeParams, $http) {

        $scope.$on('$viewContentLoaded', function () {
            $scope.groupFeild = {
            }
        });

        $scope.create = function (group) {
            var url = '/api/group/create';
            var param = {
                name: group.name,
                countries: group.countries,
                devices: group.devices
            }

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $modalInstance.close(response.data.data);
                    } else {
                        if (response.data.message == 'exists') {
                            alert('group name exists!');
                        } else {
                            alert('Save campaign-marketing error');
                        }
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }
    })
}(angular));
