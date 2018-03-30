'use strict';

(function($a, async){
    $a.module('ML').controller('Transaction', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Transactions';
        
        $scope.transaction_list = [];
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.page = 1;
        $scope.isLoading = false;
        var limit = 20;

        var list_device = {};

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.page.length < limit;
        }
        
        function getData(){
            $scope.isLoading = true;
            var skip = limit * ($scope.page - 1);
            $http.post('/transaction/list', {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        $scope.transaction_list = result.d;
                        checkPage();
                        checkDevice($scope.transaction_list);
                    } else {
                        alert("Get transaction due to failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert('Error From Server');
                });
        }

        function getDevice(tokenDevice, callback){
            if (list_device[tokenDevice]) {
                return callback(null, list_device[tokenDevice]);
            }

            $http.post('/transaction/get-device', {tokenDevice: tokenDevice})
                .success(function(result){
                    if (result.s) {
                        list_device[tokenDevice] = result.d;
                        callback(null, result.d);
                    } else {
                        callback('Get device due to failed');
                    }
                })
                .error(function(){
                    callback('Error From Server');
                });
        }

        function checkDevice(list_transaction){
            async.eachSeries(list_transaction, function(transaction, cb){
                getDevice(transaction.tokenDevice, function(err, device){
                    if (err) {
                        return cb(err);
                    }
                    transaction.device = device;
                    cb();
                });
            }, function(err){
                if (err) alert(err);
            });
        }

        $scope.detail = function(transaction){
            var modalInstance = $modal.open({
                templateUrl: 'transaction_detail.html',
                controller: ctrlDetail,
                resolve: {
                    transaction_id: function(){
                        return transaction._id;
                    }
                }
            });
        };

        function ctrlDetail($scope, $modalInstance, transaction_id){
            $scope.transaction = {};
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };

            function getTransaction(transaction_id){
                $scope.isLoading = true;
                $http.post('/transaction/get-one', {id: transaction_id})
                    .success(function(result){
                        $scope.isLoading = false;
                        if (result.s){
                            $scope.transaction = result.d;
                        } else {
                            alert('Get transaction detail due to failed');
                        }
                    })
                    .error(function(){
                        $scope.isLoading = false;
                        alert('Error From Server');
                    });
            }

            getTransaction(transaction_id);
        }

        $scope.nextPage = function(value){
            $scope.page += value;
            getData();
        };

        $scope.refresh = function(){
            $scope.page = 1;
            getData();
        };

        function init(){
            getData();
        }

        init();
    });
}(angular, async));