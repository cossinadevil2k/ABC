'use strict';

(function($a){
    $a.module('ML').controller('UncategorizedTransaction', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Uncategorized Transactions';

        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;

        var limit = 50;

        $scope.transactions = [];

        getList(0);

        function getList(skip){
            $scope.isLoading = true;

            $http.post('/uncategorized-transaction/list', {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;

                    if (result.s) {
                        $scope.transactions = result.d;

                        checkPage();
                    } else {
                        alert('Get list failed');
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.transactions.length < limit;
        }
        
        function getListCategory(wallet_id, callback){
            $http.get('/info/cate/' + wallet_id)
                .success(function(result){
                    callback(null, result);
                })
                .error(function(){
                    callback("Error From Server");
                });
        }

        $scope.detail = function(transaction){
            var modalInstance = $modal.open({
                templateUrl: '/partials/uncategorized_transaction/detail.html',
                controller: ctrlDetail,
                resolve: {
                    transaction: function(){
                        return transaction;
                    }
                }
            });
        };
        
        function ctrlDetail($scope, $modalInstance, transaction){
            $scope.transaction = transaction;

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        $scope.changeCategory = function (transaction, index) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/uncategorized_transaction/change_category.html',
                controller: ctrChangeCategory,
                resolve: {
                    transaction: function () {
                        return transaction;
                    }
                }
            });

            modalInstance.result.then(function(){
                $scope.transactions.splice(index, 1);
            });
        };

        function ctrChangeCategory($scope, $modalInstance, transaction){
            $scope.categories = [];
            $scope.old_category = transaction.category;

            getListCategory(transaction.account._id, function(err, result){
                if (err) {
                    return alert(err);
                }

                $scope.categories = result;
            });

            $scope.change = function(){
                if (!this.new_category) {
                    return alert('Please select new category');
                }

                this.new_category = JSON.parse(this.new_category);

                // console.log(this.new_category._id);
                // console.log(this.old_category._id);

                if (this.new_category._id === this.old_category._id) {
                    return alert('New category and old category should not match');
                }

                $scope.isLoading = true;

                var postData = {
                    tr: transaction,
                    nc: this.new_category._id
                };

                $http.post('/uncategorized-transaction/change_category', postData)
                    .success(function(result){
                        $scope.isLoading = false;

                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            alert('Change category due to failed');
                        }
                    })
                    .error(function(){
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        }

        $scope.nextPage = function(value){
            $scope.page += value;

            var skip = limit * ($scope.page - 1);

            getList(skip);
        }
    });
}(angular));