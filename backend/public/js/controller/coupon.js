(function($a){
    'use strict';
    $a.module('ML').controller('coupon', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Coupon Manager';

        $scope.selectedTab = 'enabled';
        $scope.listCoupon = [];

        function getCoupon(){
            var option = {};
            option.enabled = $scope.selectedTab === 'enabled';

            $http.post('/coupon/get-all', {option: option})
                .success(function(data){
                    if (data.s) {
                        $scope.listCoupon = data.d;
                    } else {
                        alert("Add new coupon due to error");
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });
        }
        getCoupon();

        function validate(item){
            $scope.requireName = false;
            $scope.requireProvider = false;
            $scope.requireDescription = false;
            $scope.requireLocation = false;
            $scope.requireAmount = false;

            if (!item || !item.name || (item.name && item.name == "")) {
                $scope.requireName = true;
                return false;
            }

            if (!item.provider) {
                $scope.requireProvider = true;
                return false;
            }

            if (!item.description) {
                $scope.requireDescription = true;
                return false;
            }

            if (!item.location) {
                $scope.requireLocation = true;
                return false;
            }

            if (!item.amount) {
                $scope.requireAmount = true;
                return false;
            }

            return true;
        }

        $scope.addNew = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/coupon/info.html',
                controller: addCtrl,
                resolve: {

                }
            });

            modalInstance.result.then(function(){

            });
        };

        $scope.tabSelect = function(tab) {
            if($scope.selectedTab != tab){
                $scope.selectedTab = tab;
                getCoupon();
            }
        };

        var addCtrl = function($scope, $modalInstance){
            $scope.submit = function(info){
                var ok = validate(info);
                if (ok) {
                    $http.post('/coupon/new', info)
                        .success(function(data){
                            if (data.s) {
                                getCoupon();
                                $scope.cancel();
                            } else {
                                alert("Add new coupon due to error");
                            }
                        })
                        .error(function(){
                            alert("Error From Server");
                        });
                }
            };

            $scope.datePicker1 = function() {
                this.showWeeks = false;
                this.minDate = ( this.minDate ) ? null : new Date();
            };
            $scope.datePicker2 = function() {
                this.showWeeks = false;
                this.minDate = ( this.minDate ) ? null : new Date();
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        };

        $scope.edit = function(coupon){
            var modalInstance = $modal.open({
                templateUrl: '/partials/coupon/info.html',
                controller: ctrlEdit,
                resolve: {
                    couponInfo: function(){
                        return coupon;
                    }
                }
            });

            modalInstance.result.then(function(){

            });
        };

        var ctrlEdit = function($scope, $modalInstance, couponInfo){
            $scope.info = couponInfo;

            $scope.submit = function(info){
                var ok = validate(info);
                if (ok) {
                    $http.post('/coupon/edit', info)
                        .success(function(data){
                            if (data.s) {
                                getCoupon();
                                $scope.cancel();
                            } else {
                                alert("Add new coupon due to error");
                            }
                        })
                        .error(function(){
                            alert("Error From Server");
                        });
                }
            };

            $scope.datePicker1 = function() {
                this.showWeeks = false;
                this.minDate = ( this.minDate ) ? null : new Date();
            };
            $scope.datePicker2 = function() {
                this.showWeeks = false;
                this.minDate = ( this.minDate ) ? null : new Date();
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.delete = function(coupon){
            var ok = confirm('Coupon [' + coupon.name +'] will be remove, are you sure?');
            if (ok) {
                $http.post('/coupon/delete', {id: coupon._id})
                    .success(function(data){
                        if (data.s) {
                            getCoupon();
                            $scope.cancel();
                        } else alert("Delete coupon due to error");
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }
        };
    });
}(angular));