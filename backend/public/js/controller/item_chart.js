(function($a) {
    'use strict';

    $a.module('ML').controller('ItemChart', function($scope, $rootScope, $http, $modal) {
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Purchase item chart';
        $scope.mode = 'Daily';
        var productList = {};
        var totalData = [];
        var totalChart;
        var productData = [];
        var productChart;
        var platformData = [];
        var platformChart;
        $scope.selectedProduct = null;
        $scope.totalEndTime = moment().format('DD/MM/YYYY');
        $scope.totalStartTime = moment().subtract(7, 'days').format('DD/MM/YYYY');
        $scope.selectedProduct = null;
        $scope.topTenEndTime = moment().format('DD/MM/YYYY');
        $scope.topTenStartTime = moment().subtract(7, 'days').format('DD/MM/YYYY');

        $scope.selectViewMode = function(mode) {
            if (mode !== $scope.mode) {
                $scope.mode = mode;
                init();
            }
        };
        
        $scope.selectProduct = function() {
            var modalInstance = $modal.open({
                templateUrl: '/partials/item_chart/select_product.html',
                controller: ctrlSelectProduct,
                resolve: {
                    startDate: function() {
                        return $scope.totalStartTime;
                    },
                    endDate: function() {
                        return $scope.totalEndTime;
                    }
                }
            });

            modalInstance.result.then(function(selectedProduct) {
                $scope.selectedProduct = selectedProduct;
            });
        };

        function getTotal() {
            $http.post('/item-chart/total', {start: $scope.totalStartTime, end: $scope.totalEndTime, mode: $scope.mode})
                .success(function(result) {
                    if (!result.status) {
                        return alert('Get total failed');
                    }

                    totalData = result.data;

                    if (totalChart) {
                        totalChart.setData(totalData);
                    } else {
                        totalChart = new Morris.Area({
                            element: 'turnover_total',
                            data: totalData,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: ['amount'],
                            labels: ['USD'],
                            lineColors: ['#379ca8']
                        });
                    }
                })
                .error(function() {
                    alert('Error from server');
                });
        }

        function getTopTen(startTime, endTime) {
            $scope.loadingTopTenProduct = true;
            $http.post('/item-chart/top-purchase', {start: startTime, end: endTime})
                .success(function(result) {
                    $scope.loadingTopTenProduct = false;
                    if (!result.status) return alert('Get top 10 product failed');

                    $scope.topTenData = result.data;
                })
                .error(function() {
                    $scope.loadingTopTenProduct = false;
                    alert('Error from server');
                });
        }

        function getTopByCountry(startTime, endTime) {
            $scope.loadingTopCountry = true;
            $http.post('/item-chart/top-country', {start: startTime, end: endTime})
                .success(function(result) {
                    $scope.loadingTopCountry = false;
                    if (!result.status) return alert('Get top country failed');

                    var countryList = Object.keys(result.data);
                    var data = [];

                    countryList.forEach(function(country) {
                        data.push({
                            country: country,
                            amount: result.data[country]
                        });
                    });

                    data.sort(function(a, b) {
                        return b.amount - a.amount;
                    });

                    $scope.topCountry = data;
                })
                .error(function() {
                    $scope.loadingTopCountry = false;
                    alert('Error from server');
                });
        }

        function getTotalGroupByProductType() {
            $http.post('/item-chart/total-by-type', {start: $scope.totalStartTime, end: $scope.totalEndTime, mode: $scope.mode})
                .success(function(result) {
                    if (!result.status) return alert('Get chart data failed');

                    var keys = Object.keys(result.data[0]);
                    keys.forEach(function(key, index) {
                        if (key === 'date') {
                            return keys.splice(index, 1);
                        }
                    });

                    if (productChart) {
                        productChart.setData(result.data);
                    } else {
                        productChart = new Morris.Area({
                            element: 'turnover_product',
                            data: result.data,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: keys,
                            labels: keys,
                            lineColors: ['#EF5350', '#EC407A', '#AB47BC', '#7E57C2', '#5C6BC0']
                        });
                    }
                })
                .error(function() {

                });
        }

        function getTotalGroupByPlatform() {
            $http.post('/item-chart/total-by-platform', {start: $scope.totalStartTime, end: $scope.totalEndTime, mode: $scope.mode})
                .success(function(result) {
                    if (!result.status) return alert('Get chart data failed');

                    platformData = result.data;

                    if (platformChart) {
                        platformChart.setData(result.data);
                    } else {
                        platformChart = new Morris.Area({
                            element: 'turnover_platform',
                            data: platformData,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: ['iOS', 'Android', 'Windows'],
                            labels: ['iOS', 'Android', 'Windows'],
                            lineColors: ['#EF5350', '#EC407A', '#AB47BC']
                        });
                    }
                })
                .error(function() {
                    alert('Error from server');
                });
        }
        
        function ctrlSelectProduct($scope, $modalInstance, startDate, endDate) {
            $scope.productList = [];

            function getIcon() {
                if (productList.icon && productList.icon.length > 0) {
                    return $scope.productList = productList.icon;
                }

                $http.post('/icons/get', {})
                    .success(function(result) {
                        if (result.error) return alert('Get icon list failed');
                        productList.icon = result.data;
                        $scope.productList = result.data;
                    })
                    .error(function() {
                        alert('Error from server');
                    });
            }

            function getCredit() {
                if (productList.credit && productList.credit.length > 0) {
                    return $scope.productList = productList.credit;
                }

                $http.post('/use-credits/list', {skip: 0, limit: 99})
                    .success(function(result) {
                        if (!result.s) return alert('Get credit product list failed');
                        $scope.productList = result.d;
                        productList.credit = result.d;
                    })
                    .error(function() {
                        alert('Error from server');
                    });
            }

            function getPremium() {
                if (productList.premium && productList.premium.length > 0) {
                    return $scope.productList = productList.premium;
                }

                $http.post('/premium-products/list', {skip: 0, limit: 99})
                    .success(function(result) {
                        if (!result.s) return alert('Get product list failed');
                        $scope.productList = result.d;
                        productList.premium = result.d;
                    })
                    .error(function() {
                        alert('Error from server');
                    });
            }

            function getSubscription() {
                if (productList.subscription && productList.subscription.length > 0) {
                    return $scope.productList = productList.subscription;
                }

                $http.post('/premium-products/list', {skip: 0, limit: 99})
                    .success(function(result) {
                        if (!result.s) return alert('Get product list failed');
                        $scope.productList = result.d;
                        productList.subscription = result.d;
                    })
                    .error(function() {
                        alert('Error from server');
                    });
            }

            $scope.getProduct = function(productType) {
                switch (productType) {
                    case 'icon':
                        getIcon();
                        break;
                    case 'premium':
                        getPremium();
                        break;
                    case 'credit':
                        getCredit();
                        break;
                    case 'subscription':
                        getSubscription();
                        break;
                    default:
                        break;
                }
            };

            $scope.showProductChart = function(productId) {
                $http.post('/item-chart/by-product', {start: startDate, end: endDate, product_id: productId})
                    .success(function(result) {
                        if (!result.status) return alert('Get turnover by product failed');

                        productData = result.data;

                        if (productChart) {
                            productChart.setData(productData);
                        } else {
                            productChart = new Morris.Area({
                                element: 'turnover_product',
                                data: productData,
                                grid: false,
                                lineWidth: 4,
                                parseTime: false,
                                pointSize: 3,
                                behaveLikeLine: true,
                                fillOpacity: 0.7,
                                smooth: false,
                                xkey: 'date',
                                ykeys: ['amount'],
                                labels: ['USD'],
                                lineColors: ['#379ca8']
                            });
                        }

                        $modalInstance.close(productId);
                    })
                    .error(function() {
                        alert('Error from server');
                    });
            };

            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            };
        }
        
        $scope.selectDateRange = function() {
            var modalInstance = $modal.open({
                templateUrl: '/partials/item_chart/select_date_range.html',
                controller: ctrlSelectDateRange,
                resolve: {}
            });

            modalInstance.result.then(function(date) {
                $scope.topTenStartTime = date.startTime;
                $scope.topTenEndTime = date.endTime;
            });
        };
        
        function ctrlSelectDateRange($scope, $modalInstance) {
            $scope.selectDate = function() {
                if (this.startDate > this.endDate) {
                    return alert('Start date must less than or equal end date');
                }

                var startTime = moment(this.startDate.valueOf()).format('DD/MM/YYYY');
                var endTime = moment(this.endDate.valueOf()).format('DD/MM/YYYY');

                getTopTen(startTime, endTime);
                $modalInstance.close({startTime: startTime, endTime: endTime});
            };

            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            }
        }

        function init() {
            if ($scope.mode === 'Daily') {
                $scope.totalEndTime = moment().format('DD/MM/YYYY');
                $scope.totalStartTime = moment().subtract(7, 'days').format('DD/MM/YYYY');
                $scope.topTenEndTime = moment().format('DD/MM/YYYY');
                $scope.topTenStartTime = moment().subtract(7, 'days').format('DD/MM/YYYY');
            } else if ($scope.mode === 'Weekly') {
                $scope.totalEndTime = moment().format('DD/MM/YYYY');
                $scope.totalStartTime = moment().startOf('week').subtract(7, 'weeks').format('DD/MM/YYYY');
                $scope.topTenEndTime = moment().format('DD/MM/YYYY');
                $scope.topTenStartTime = moment().startOf('week').subtract(7, 'weeks').format('DD/MM/YYYY');
            } else {
                //Monthly
                $scope.totalEndTime = moment().format('DD/MM/YYYY');
                $scope.totalStartTime = moment().startOf('month').subtract(7, 'months').format('DD/MM/YYYY');
                $scope.topTenEndTime = moment().format('DD/MM/YYYY');
                $scope.topTenStartTime = moment().startOf('month').subtract(7, 'months').format('DD/MM/YYYY');
            }

            getTotal();
            getTopTen($scope.topTenStartTime, $scope.topTenEndTime);
            getTotalGroupByProductType();
            getTotalGroupByPlatform();
            getTopByCountry($scope.topTenStartTime, $scope.topTenEndTime);
        }
        init();
    });
}(angular));
