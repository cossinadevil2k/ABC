'use strict';

(function($a){
    $a.module('ML').controller('UseCredit', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Use Credits';

        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;
        var limit = 20;

        $scope.product_list = [];

        init();
        function init(){
            $scope.page = 1;
            getList(0, limit, function(err, data){
                if (err) {
                    return alert(err);
                }

                $scope.product_list = data;
            })
        }

        function getList(skip, limit, callback){
            $scope.isLoading = true;

            $http.post('/use-credits/list', {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;

                    if (result.s) {
                        callback(null, result.d);
                    } else {
                        callback('Get list failed');
                    }
                })
                .error(function(){
                    $scope.isLoading = false;

                    callback('Error From Server');
                });
        }

        function validateItem(item){
            if (!item) {
                alert('Please type product info');
                return false;
            }

            if (!item.name) {
                alert("Please type product name");
                return false;
            }

            if (!item.product_id) {
                alert("Please type product_id");
                return false;
            }

            if (!item.metadata || !item.metadata.credit) {
                alert("Please amount of credit");
                return false;
            }

            if (!item.metadata || !item.metadata.credit_type) {
                alert("Please type of credit");
                return false;
            }

            return true;
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.product_list.length < limit;
        }

        $scope.addProduct = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/use_credit/info.html',
                controller: ctrlAddCredit,
                resolve: {

                }
            });

            modalInstance.result.then(function(){
                init();
            });
        };

        function ctrlAddCredit($scope, $modalInstance){

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.save = function(){
                if (!validateItem(this.item)) {
                    return;
                }

                $scope.isLoading = true;

                $http.post('/use-credits/create', {item: this.item})
                    .success(function(result){
                        $scope.isLoading = false;

                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            alert("Create new item failed");
                        }
                    })
                    .error(function(){
                        $scope.isLoading = false;

                        alert("Error From Server");
                    });
            };
        }

        $scope.edit = function(product, index){
            var modalInstance = $modal.open({
                templateUrl: '/partials/use_credit/info.html',
                controller: ctrlEditCreditProduct,
                resolve: {
                    product: function(){
                        return product;
                    }
                }
            });

            modalInstance.result.then(function(){

            });
        };

        function ctrlEditCreditProduct($scope, $modalInstance, product){
            $scope.item = product;

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };

            $scope.save = function(){
                if (!validateItem(this.item)) {
                    return;
                }

                $scope.isLoading = true;

                $http.post('/use-credits/update', {item: this.item})
                    .success(function(result){
                        $scope.isLoading = false;

                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            alert("Create new item failed");
                        }
                    })
                    .error(function(){
                        $scope.isLoading = false;

                        alert("Error From Server");
                    });
            };
        }

        $scope.delete = function(product, index){
            $scope.isLoading = true;

            $http.post('/use-credits/delete', {id: product._id})
                .success(function(result){
                    $scope.isLoading = false;

                    if (result.s) {
                        $scope.product_list.splice(index, 1);
                    } else {
                        alert('Delete product due to failed');
                    }
                })
                .error(function(){
                    alert('Error From Server');
                });
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            var skip = limit * ($scope.page - 1);

            getList(skip, limit, function(err, data) {
                if (err) {
                    return alert(err);
                }

                $scope.product_list = data;
                checkPage();
            });
        };
    });
}(angular));