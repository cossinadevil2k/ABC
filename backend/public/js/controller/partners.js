(function($a){
    'use strict';

    $a.module('ML').controller('Partners', function ($scope, $rootScope, $http, $modal) {
        $rootScope.MLPageDetail = 'Partner Manager';
        $rootScope.tabSelect = 3;

        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;

        $scope.partnerList = [];

        $scope.isLoading = false;

        var limit = 20;

        var getPartnerList = function(skip, limit){
            $scope.isLoading = true;
            $http.post('/partners/get', {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;

                    if(result.s){
                        $scope.partnerList = result.d;
                        checkPage();
                    } else {
                        alert("Get list failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;

                    alert("Error from Server");
                });
        };

        var checkPage = function(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.partnerList.length < limit);
        };

        var nextPage = function(value) {
            $scope.page += value;

            var skip = limit * ($scope.page - 1);

            getPartnerList(skip, limit);
        };

        var addPartner = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/partners/info.html',
                controller: ctrlPartnerInfo,
                resolve: {
                    mode: function(){
                        return "add";
                    },
                    partnerInfo: function(){
                        return {};
                    }
                }
            });

            modalInstance.result.then(function() {
                $scope.page = 1;

                getPartnerList(0, limit);
            });
        };

        var openPartnerDetail = function(partner){
            var modalInstance = $modal.open({
                templateUrl: '/partials/partners/info.html',
                controller: ctrlPartnerInfo,
                resolve: {
                    mode: function(){
                        return "edit";
                    },
                    partnerInfo: function(){
                        return partner;
                    }
                }
            });

            modalInstance.result.then(function() {
                $scope.page = 1;

                getPartnerList(0, limit);
            });
        };

        var ctrlPartnerInfo = function($scope, $rootScope, $http, $modalInstance, mode, partnerInfo){
            $scope.mode = mode;
            $scope.partner = partnerInfo;

            if ($scope.partner.provider && $scope.partner.provider.code) {
                $scope.partner.provider  = $scope.partner.provider.code;
            }

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };

            function validateData(data){
                if (!data) return false;
                if (!data.email) return false;
                if (!data.provider) return false;

                return true;
            }

            $scope.add = function(partner){
                var ok = validateData(partner);

                if (!ok) {
                    return;
                }

                $http.post('/partners/add', partner)
                    .success(function (result) {
                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            alert("Add new partner due to error");
                        }
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            };

            $scope.edit = function(partner){
                var ok = validateData(partner);

                if (!ok) {
                    return;
                }

                $http.post('/partners/update', partner)
                    .success(function(result){
                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            alert("Edit partner due to error");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    })
            };
        };

        var deletePartner = function(partner){
            var ok = confirm("Are you sure?");

            if (!ok) {
                return;
            }

            $http.post('/partners/remove', {partnerId: partner._id})
                .success(function (result) {
                    if (result.s) {
                        getPartnerList();
                    } else {
                        alert(result.msg);
                    }
                })
                .error(function () {
                    alert("Error From Server");
                });
        };

        /**
         * INIT
         */
        getPartnerList(0, limit);

        /**
         * EXPORTS
         */

        $scope.nextPage = nextPage;
        $scope.addPartner = addPartner;
        $scope.openPartnerDetail = openPartnerDetail;
        $scope.deletePartner = deletePartner;
    });
}(angular));
