(function ($a) {
    $a.module('ML').controller('PremiumProducts', function ($scope, $rootScope, $http, $modal) {
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Premium products';
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        var limit = 20;
        $scope.listProduct = [];

        function sendRequest(url, postData, callback) {
            $scope.isLoading = true;

            $http.post(url, postData)
                .success(function (result) {
                    if (result.s) {
                        return callback(null, result.d);
                    }

                    callback('Request due to failed');
                })
                .error(function () {
                    $scope.isLoading = false;
                    callback('Error From Server');
                });
        }

        function getList() {
            var skip = limit * ($scope.page - 1);

            sendRequest('/premium-products/list', { skip: skip, limit: limit }, function (err, data) {
                if (err) {
                    return alert(err);
                }

                $scope.listProduct = data;
                checkPage();
            });
        }

        function checkPage() {
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listProduct.length < limit;
            $scope.noResult = $scope.listProduct.length === 0;
        }

        function validateInfo(data) {
            if (!data.name) return false;
            if (!data.product_id) return false;
            if (!data.type) return false;
            if (!data.price_gl) return false;
            if (!data.price_vn) return false;
            // if (!data.discount.toString()) return false;

            return true;
        }

        function aliasParser(data) {
            var output = [];
            if (typeof data === 'string') {
                data = data.split(',');
            }
            data.forEach(function (element) {
                if (element) {
                    output.push(element);
                }
            });
            return output;
        }

        $scope.nextPage = function (value) {
            $scope.page += value;
            getList();
        };

        $scope.create = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/premium_products/info.html',
                controller: ctrlCreate,
                resolve: {

                }
            });

            modalInstance.result.then(function () {
                getList();
            });
        };

        function ctrlCreate($scope, $modalInstance) {
            $scope.submit = function () {
                if (!validateInfo(this.info)) {
                    return alert('Please fill all required fields');
                }

                this.info.type = parseInt(this.info.type);

                var metadata = [];

                if (this.info.type === 6) {
                    if (!this.metadata || !this.metadata.platform || !this.metadata.script) {
                        return alert('Please fill all required fields');
                    }

                    metadata.push('platform:' + this.metadata.platform);
                    metadata.push('script:' + this.metadata.script);
                }

                if (this.info.alias) {
                    this.info.alias = aliasParser(this.info.alias);
                }

                // metadata.push('discount:' + this.info.discount.toString());
                this.info.metadata = metadata.toString();

                sendRequest('/premium-products/create', this.info, function (err) {
                    if (err) {
                        alert(err);
                    }

                    $modalInstance.close();
                });
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        $scope.edit = function (product) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/premium_products/info.html',
                controller: ctrlEdit,
                resolve: {
                    product: function () {
                        return product;
                    }
                }
            });

            modalInstance.result.then(function () {

            });
        };

        function ctrlEdit($scope, $modalInstance, product) {
            $scope.info = product;
            $scope.metadata = {
                platform: null,
                script: null,
                discount: 0
            };

            // display metadata
            if (product.type == 6 && product.metadata) {
                var metadata = product.metadata.split(',');
                metadata.forEach(function (data) {
                    if (data.indexOf('platform:') > -1) {
                        $scope.metadata.platform = data.split(':')[1];
                    } else if (data.indexOf('script:') > -1) {
                        $scope.metadata.script = data.split(':')[1];
                    } else if (data.indexOf('discount') > -1) {
                        $scope.metadata.discount = data.split(':')[1];
                    }
                });
            }

            $scope.submit = function () {
                this.info.type = parseInt(this.info.type);

                var metadata = [];

                if (this.info.type === 6) {
                    if (!this.metadata || !this.metadata.platform || !this.metadata.script) {
                        return alert('Please fill all required fields');
                    }

                    metadata.push('platform:' + this.metadata.platform);
                    metadata.push('script:' + this.metadata.script);
                }

                if (this.info.alias) {
                    this.info.alias = aliasParser(this.info.alias);
                }

                metadata.push('discount:' + this.info.discount);
                this.info.metadata = metadata.toString();

                sendRequest('/premium-products/edit', { product: this.info }, function (err) {
                    if (err) {
                        getList();
                        return alert(err);
                    }

                    $modalInstance.close();
                });
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        $scope.changePublic = function (product) {
            product.isPublic = !product.isPublic;

            sendRequest('/premium-products/edit', { product: product }, function (err) {
                if (err) {
                    return alert(err);
                }
            });
        };

        $scope.changeTopDownload = function (product) {
            product.isTopDownload = !product.isTopDownload;

            sendRequest('/premium-products/edit', { product: product }, function (err) {
                if (err) {
                    return alert(err);
                }
            });
        }

        $scope.delete = function (product) {
            sendRequest('/premium-products/delete', { product_id: product._id }, function (err) {
                if (err) {
                    return alert(err);
                }

                getList();
            });
        };

        function init() {
            getList();
        }

        init();
    });
}(angular));
