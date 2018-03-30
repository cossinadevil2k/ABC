(function ($a) {
    'use strict';
    $a.module('ML').controller('subscriptionProduct', function ($scope, $http, $rootScope, $modal) {
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Subscription Products';

        $scope.products = [];

        function getProduct() {
            $http.post('/subscription-products/get', {})
                .success(function (result) {
                    if (result.s) {
                        $scope.products = result.d;
                    } else {
                        alert("Get Subscription Product Failed");
                    }
                })
                .error(function () {
                    alert("Error From Server");
                });
        }

        $scope.getProduct = getProduct;

        $scope.newProduct = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/subscription-product/info.html',
                controller: ctrlAdd,
                resolve: {

                }
            });

            modalInstance.result.then(function (newItem) {
                $scope.products.unshift(newItem);
            });
        };

        var ctrlAdd = function ($scope, $http, $modalInstance) {
            $scope.productInfo = {
                isPublic: false,
                has_trial: false,
                metadata: {
                    discount: 0
                },
                android: false,
                ios: false,
                windows: false
            };

            $scope.mode = 'add';

            $scope.saveItem = function () {
                if ($scope.productInfo.alias && typeof $scope.productInfo.alias === 'string') {
                    $scope.productInfo.alias = $scope.productInfo.alias.split(',');
                }

                if (!$scope.productInfo.metadata.type) {
                    return alert("Please select type of subscription");
                }

                if (!$scope.productInfo.metadata.discount) {
                    $scope.productInfo.metadata.discount = 0;
                } else if ($scope.productInfo.metadata.discount > 100) {
                    return alert('Discount value should equal or less than 100');
                }

                $http.post('/subscription-products/add', $scope.productInfo)
                    .success(function (result) {
                        if (result.s) {
                            getProduct();
                            $modalInstance.close();
                        } else {
                            alert("Create new product due to failed");
                        }
                    })
                    .error(function () {
                        alert('Error From Server');
                    });
            };

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.edit = function (productIndex) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/subscription-product/info.html',
                controller: ctrlEdit,
                resolve: {
                    productInfo: function () {
                        return $scope.products[productIndex];
                    }
                }
            });

            modalInstance.result.then(function (itemInfo) {
                $scope.products[productIndex] = itemInfo;
            });
        };

        var ctrlEdit = function ($scope, $http, $modalInstance, productInfo) {
            $scope.productInfo = productInfo;
            $scope.mode = 'edit';

            if ($scope.productInfo.metadata && $scope.productInfo.metadata.platform) {
                if ($scope.productInfo.metadata.platform.indexOf('android') != -1) {
                    $scope.productInfo.android = true;
                }

                if ($scope.productInfo.metadata.platform.indexOf('ios') != -1) {
                    $scope.productInfo.ios = true;
                }

                if ($scope.productInfo.metadata.platform.indexOf('windows') != -1) {
                    $scope.productInfo.windows = true;
                }
            }

            $scope.saveItem = function () {
                if (productInfo.alias && typeof productInfo.alias === 'string') {
                    productInfo.alias = productInfo.alias.split(',');
                }

                if (!productInfo.metadata || !productInfo.metadata.type) {
                    return alert("Please select type of subscription");
                }

                $http.post('/subscription-products/update-item', { item: productInfo })
                    .success(function (result) {
                        if (result.s) {
                            getProduct();
                            $modalInstance.close();
                        } else {
                            alert("Update product due to failed");
                        }
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            };

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            }
        };

        $scope.delete = function (item, index) {
            $http.post('/subscription-products/delete', { id: item._id })
                .success(function (result) {
                    if (result.s) {
                        getProduct();
                    } else {
                        alert("Delete item due to failed");
                    }
                })
                .error(function () {
                    alert("Error From Server");
                });
        };

        $scope.build = function () {
            $http.post('/subscription-products/build', {})
                .success(function (result) {
                    if (result.s) alert("Success");
                    else alert("Save new product list failed");
                })
                .error(function () {
                    alert("Error From Server");
                })
        };

        $scope.changePublic = function (product) {
            product.isPublic = !product.isPublic;

            $http.post('/subscription-products/update-item', { item: product })
                .success(function (result) {
                    if (result.s) {

                    } else {
                        alert("Update product due to failed");
                        product.isPublic = !product.isPublic;
                    }
                })
                .error(function () {
                    alert("Error From Server");
                    product.isPublic = !product.isPublic;
                });
        };

        $scope.changeTopDownload = function (product) {
            product.isTopDownload = !product.isTopDownload;

            $http.post('/subscription-products/update-item', { item: product })
                .success(function (result) {
                    if (result.s) {

                    } else {
                        alert("Update product due to failed");
                        product.isTopDownload = !product.isTopDownload;
                    }
                })
                .error(function () {
                    alert("Error From Server");
                    product.isTopDownload = !product.isTopDownload;
                });
        };

        $scope.changeMarkAsGiftState = function (product) {
            $http.post('/subscription-products/change-mark-as-gift', { id: product._id })
                .success(function (result) {
                    if (result.s) {
                        product.markAsGift = !product.markAsGift;
                    } else {
                        alert("Update product due to failed");
                    }
                })
                .error(function () {
                    alert("Error From Server");
                });
        }
    });
}(angular));
