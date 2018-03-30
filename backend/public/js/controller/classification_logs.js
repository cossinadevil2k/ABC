(function($a){
    'use strict';
    $a.module('ML').controller('classification_logs', function($scope, $rootScope, $http, $modal, $routeParams){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Classification logs';

        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.isLoading = false;
        var limit = 50;

        $scope.logs = [];
        $scope.total_changelog = 0;

        init();
        function init() {
            getList(0, limit);

            $http.post('/classification-log/total-category', {})
                .success(function(result){
                    if (result.s) {
                        $scope.total_changelog = result.d;
                    } else {
                        alert('Count total due to failed');
                    }
                })
                .error(function () {
                    alert('Error From Server');
                })
        }

        function getList(skip, limit){
            $http.post('/classification-log/list', {skip: skip, limit: limit})
                .success(function(result){
                    if (result.s) {
                        $scope.logs = result.d;
                        checkPage();
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.logs.length < limit;

            $scope.noResult = $scope.logs.length === 0;
        }

        $scope.nextPage = function (value) {
            $scope.page += value;
            var skip = limit * ($scope.page -1);
            $routeParams.page = $scope.page;
            getList(skip, limit);
        };

        $scope.delUserCate = function(log, index){
            var ok = confirm("Are you sure?");

            if (!ok) {
                return;
            }

            $http.post('/classification-log/delete', {id: log._id})
                .success(function(result){
                    if (!result.s) {
                        return alert("Delete log due to failed");
                    }

                    $scope.logs.splice(index, 1);
                })
                .error(function(){
                    alert("Error From Server");
                });
        };

        $scope.editUserCate = function(log){
            var modalInstance = $modal.open({
                templateUrl: '/partials/classification_logs/modalChangeCate.html',
                controller: changeCateCtrl,
                resolve: {
                    old_category: function () {
                        return log.old_category;
                    },

                    current_category: function () {
                        return log.new_category;
                    }
                }
            });

            modalInstance.result.then(function(new_category){
                $http.post('/classification-log/change-category', {id: log._id, new_category: new_category})
                    .success(function(result){
                        if (result.s) {
                            log.new_category = new_category;
                        } else {
                            alert('Change category due to failed');
                        }
                    })
                    .error(function(){
                        alert('Error From Server');
                    });
            });
        };

        var changeCateCtrl = function($scope, $modalInstance, old_category, current_category) {
            $scope.old_category = old_category;
            $scope.current_category = current_category;
            var list_metadata = {};
            $scope.select_list = [];

            getCategoryList();
            function getCategoryList(){
                $http.post('/classification-log/get-default-categories', {})
                    .success(function(result){
                        if (result.s) {
                            list_metadata = result.d;

                            if (list_metadata['expense'].indexOf($scope.old_category) != -1) {
                                $scope.select_list = list_metadata['expense'];
                            } else {
                                $scope.select_list = list_metadata['income'];
                            }

                            $scope.select_list.sort();
                        } else {
                            alert("Get metadata list due to failed");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }

            $scope.save = function () {
                if (!this.new_category) {
                    return alert("Please select new category!");
                }

                if (this.new_category === this.current_category) {
                    return alert("New category and old category should not the same")
                }

                $modalInstance.close(this.new_category);
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.showTransaction = function (transaction) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/classification_logs/transaction.html',
                controller: ctrlShowTransaction,
                resolve: {
                    transaction: function(){
                        return transaction;
                    }
                }
            });
        };

        var ctrlShowTransaction = function($scope, $modalInstance, transaction){
            $scope.transaction = transaction;

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            }
        };
    });
}(angular));
