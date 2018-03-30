(function ($a) {
    'use strict';
    $a.module('ML').controller('campaignCreateModal', function ($scope, $rootScope, $modal, $modalInstance, $routeParams, $http) {

        $scope.$on('$viewContentLoaded', function () {
            $scope.campaignFeild = {
            }
        });

        $scope.create = function (campaign) {
            var url = '/api/campaign-marketing/create';
            var param = {
                name: campaign.name,
                type: campaign.type
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
                            alert('campaign name exists!');
                        } else {
                            alert('Save campaign-marketing error');
                        }
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        }

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        }

    })
}(angular));
