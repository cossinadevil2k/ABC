(function($a){
    "use strict";
    $a.module('ML').controller('subscriptionCode',function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Subscription Code';
        $scope.page = 1;
        var limit = 50;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.products = [];
        $scope.selectedProduct = "All";
        $scope.filter = {
            used: "All",
            expire: "All"
        };
        $scope.codeList = [];
        $scope.info = {
            total: 0,
            used: 0
        };

        getProductList();
        getInfo($scope.selectedProduct);

        function getProductList(){
            $http.post('/subscription-code/product-list', {})
                .success(function(result){
                    if (result.s) {
                        $scope.products = result.d;
                    } else alert("Get Product List Failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function getCodeList(product){
            var postData = {
                limit: limit,
                skip: limit * ($scope.page - 1),
                filter: $scope.filter
            };

            if (product !== 'All') postData.product = product;

            $http.post('/subscription-code/get', postData)
                .success(function(result){
                    if (result.s) {
                        $scope.codeList = result.d;
                        checkPage();
                    } else alert("Get the codes failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function getInfo(product){
            var postData = {};
            if (product !== 'All') postData.productId = product;

            $http.post('/subscription-code/count', postData)
                .success(function(result){
                    if (result.s) {
                        $scope.info = result.d;
                    } else alert("Get Info Failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function checkPage(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.codeList.length < limit);
        }

        $scope.selectProduct = function(productId){
            $scope.selectedProduct = productId;

            getInfo($scope.selectedProduct);
        };

        $scope.selectFilter = function(key, value){
            $scope.filter[key] = value;
        };

        $scope.getList = function(){
            getCodeList($scope.selectedProduct);
        };

        $scope.addNew = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/subscription-code/add.html',
                controller: ctrlAdd,
                resolve: {
                    productList: function(){
                        return $scope.products;
                    }
                }
            });

            modalInstance.result.then(function(){
                $scope.getList();
                getInfo($scope.selectedProduct);
            });
        };

        $scope.delete = function(code_id){

        };

        var ctrlAdd = function($scope, $http, $modalInstance, productList){
            $scope.products = productList;
            $scope.genCodeOption = {
                hasExpire: false,
                amount: 10
            };

            function checkOption(option){
                if (!option.amount) return false;
                if (!option.productId) return false;
                if (option.hasExpire && !option.expireDate) return false;

                return true;
            }

            $scope.selectProduct = function(productId){
                $scope.genCodeOption.productId = productId;
            };

            $scope.datePicker = function() {
                this.showWeeks = false;
                this.minDate = ( this.minDate ) ? null : new Date();
            };

            $scope.generate = function(){
                var ok = checkOption($scope.genCodeOption);
                if (ok){
                    $http.post('/subscription-code/generate', $scope.genCodeOption)
                        .success(function(result){
                            if (result.s) {
                                $modalInstance.close();
                            } else alert("Generate new code failed");
                        })
                        .error(function(){
                            alert("Error From Server");
                        });
                }
            };

            $scope.cancel = function(){
                $modalInstance.dismiss("cancel");
            };
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            $scope.getList();
        };
    });
}(angular));