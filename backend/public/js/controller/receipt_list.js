'use strict';

(function($a){
    $a.module('ML').controller('receiptList', function($scope, $rootScope, $http, localStorageService){
        $rootScope.tabSelect = 9;
        $rootScope.MLPageDetail = 'Receipt Manager';
        
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        var limit = 20;
        $scope.isLoading = false;
        $scope.noResult = false;
        $scope.searchResult = false;

        var FILTER_MODE = {
            1: 'all',
            2: 'new',
            3: 'open',
            4: 'draft',
            5: 'rejected',
            6: 'done'
        };

        $scope.filter_selected = 3;
        $scope.isAdmin = false;
        $scope.sort = 'asc';
        
        $scope.listReceipt = [];

        init();

        function init(){
            localStorageService.add('openedReceipt', []);
            getData();
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listReceipt.length < limit;
            $scope.noResult = $scope.listReceipt.length === 0;
        }

        function getAll(is_get_by_admin, skip, limit, callback, sort){
            var postData = {skip: skip, limit: limit};

            if (is_get_by_admin) {
                postData.admin = true;
            }

            if (sort) {
                postData.sort = sort;
            }

            $http.post('/receipt/find-all', postData)
                .success(function (result) {
                    if (!result.s) {
                        return callback('Get list due to failed');
                    }

                    callback(null, result.d);
                })
                .error(function () {
                    callback('Error from server');
                });
        }

        function getByStatus(is_get_by_admin, status, skip, limit, callback, sort) {
            var postData = {skip: skip, limit: limit, status: status};

            if (is_get_by_admin) {
                postData.admin = true;
            }

            if (sort) {
                postData.sort = sort;
            }

            $http.post('/receipt/find-by-status', postData)
                .success(function (result) {
                    if (!result.s) {
                        return callback('Get list due to failed');
                    }

                    callback(null, result.d);
                })
                .error(function () {
                    callback('Error from server');
                });
        }

        function deleteReceipt(id, callback){
            $http.post('/receipt/delete', {id: id})
                .success(function(result){
                    if (!result.s) {
                        return callback('Delete receipt due to failed');
                    }

                    callback();
                })
                .error(function(){
                    callback('Error from server');
                });
        }

        function getData(){
            $scope.isLoading = true;

            var mode_number = $scope.filter_selected;
            var offset = limit * ($scope.page - 1);
            var status = FILTER_MODE[mode_number];
            var admin = $scope.isAdmin;

            if (mode_number === 1) {
                getAll(admin, offset, limit, callbackStatus, $scope.sort);
            } else {
                getByStatus(admin, status, offset, limit, callbackStatus, $scope.sort);
            }

            function callbackStatus(err, data) {
                $scope.isLoading = false;
                if (err) {
                    return alert(err);
                }

                $scope.listReceipt = data;
                checkPage();
            }
        }

        function filterSelected(mode_number, is_admin){
            $scope.filter_selected = mode_number;
            $scope.isAdmin = is_admin || false;
            $scope.page = 1;

            getData();
        }

        function search(skip){
            if (!$scope.searchEmail || $scope.searchEmail == '') {
                return;
            }

            var skip = limit * ($scope.page - 1);
            $scope.isLoading = true;
            $http.post('/receipt/find-by-email', {email: $scope.searchEmail, skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;

                    if (!result.s) {
                        return alert('Searching due to failed');
                    }

                    $scope.searchResult = true;
                    $scope.listReceipt = result.d;
                    checkPage();
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        $scope.deleteReceipt = function(receipt, index){
            var ok = confirm('Are you sure?');

            if (!ok) {
                return;
            }

            deleteReceipt(receipt._id, function(err) {
                if (err) {
                    return alert(err);
                }

                $scope.listReceipt.splice(index, 1);
            });
        };

        $scope.search = function(){
            $scope.page = 1;
            search();
        };

        $scope.exitSearch = function(){
            $scope.page = 1;
            $scope.searchResult = false;
            $scope.searchEmail = '';
            init();
        };

        $scope.checkEnterSearch = function(event){
            if (event.keyCode != 13) {
                return;
            }

            $scope.search();
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            if ($scope.searchResult) {
                search();
            } else {
                getData();
            }
        };

        $scope.changeSort = function(){
            if ($scope.sort === 'asc') {
                $scope.sort = 'decs';
            } else {
                $scope.sort = 'asc';
            }

            getData();
        };

        $scope.filterSelected = filterSelected;
    });
}(angular));