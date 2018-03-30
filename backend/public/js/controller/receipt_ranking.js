'use strict';

(function($a, async, moment){
    $a.module('ML').controller('receiptRanking', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 9;
        $rootScope.MLPageDetail = 'Receipt Handle Statistic';

        $scope.startDate = null;
        $scope.endDate = null;
        $scope.rankingData = {};
        $scope.listAdmin = {};
        $scope.tabSelected = 'done';

        function getAdminNameById(id){
            $http.post('/admin/find-one', {id: id})
                .success(function(result){
                    if (!result.s) {
                        return alert('Get admin name due to error');
                    }

                    $scope.listAdmin[id] = result.d.username;
                })
                .error(function(){
                    alert('Error From Server');
                });
        }

        function getAdmin(data){
            data.forEach(function(element){
                if (!$scope.listAdmin[element._id]) {
                    getAdminNameById(element._id);
                }
            });
        }

        function compare(a,b) {
            return b.total - a.total;
        }

        function mergeData(done_data, rejected_data){
            var output = [];
            var pin_data = rejected_data;
            var ref_data = done_data;
            var pin_key = 'rejected';
            var ref_key = 'done';

            if (done_data.length >= rejected_data.length) {
                pin_data = done_data;
                pin_key = 'done';
                ref_data = rejected_data;
                ref_key = 'rejected';
            }

            pin_data.forEach(function(pin){
                var obj = {
                    _id: pin._id
                };

                obj[pin_key] = pin.total || 0;

                ref_data.forEach(function(ref){
                    if (ref._id === pin._id) {
                        obj[ref_key] = ref.total;
                    }
                });

                if (!obj[ref_key]) {
                    obj[ref_key] = 0;
                }

                obj['total'] = obj[pin_key] + obj[ref_key];

                output.push(obj);
            });

            return output;
        }

        function handleData(data){
            var output = mergeData(data.done, data.rejected);
            output.sort(compare);
            getAdmin(output);
            return output;
        }

        function getData(){
            $http.post('/receipt/ranking', {startDate: $scope.startDate.format('YYYY-MM-DD'), endDate: $scope.endDate.format('YYYY-MM-DD')})
                .success(function(result){
                    if (!result.s){
                        return alert('Get ranking data due to error');
                    }

                    $scope.rankingData = handleData(result.d);
                    getAdmin($scope.rankingData);
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function setDateRange($scope, $modalInstance, startDate, endDate){
            $scope.range = {
                start: startDate.format('YYYY-MM-DD'),
                end: endDate.format('YYYY-MM-DD')
            };

            $scope.submit = function(){
                $modalInstance.close(this.range);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }

        function ctrlListReceiptByAdmin($scope, $modalInstance, admin_info, start_date, end_date, status){
            $scope.admin_name = admin_info.name;

            $scope.isLoading = false;
            $scope.page = 1;
            $scope.isFirstPage = true;
            $scope.isLastPage = true;
            var limit = 20;

            $scope.list = [];

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };

            $scope.nextPage = function(value) {
                $scope.page += value;
                getCompleteList();
            };

            function getCompleteList(){
                var skip = limit * ($scope.page -1);

                var postData = {
                    skip: skip,
                    limit: limit,
                    admin_id: admin_info._id,
                    startDate: start_date.format('YYYY-MM-DD'),
                    endDate: end_date.format('YYYY-MM-DD'),
                    status: status
                };

                $scope.isLoading = true;

                $http.post('/receipt/find-solved-by-admin', postData)
                    .success(function (result) {
                        $scope.isLoading = false;

                        if (result.s) {
                            $scope.list = result.d;
                            checkPage();
                        } else {
                            alert('Get receipts due to failed');
                        }
                    })
                    .error(function(){
                        $scope.isLoading = false;

                        alert("Error From Server");
                    });
            }

            function checkPage(){
                $scope.isFirstPage = $scope.page === 1;
                $scope.isLastPage = $scope.list.length < limit;
            }

            function init(){
                getCompleteList();
            }

            init();
        }

        $scope.selectTab = function(tab){
            $scope.tabSelected = tab;
        };

        $scope.setDateRange = function(){
            var modalInstance = $modal.open({
                templateUrl: "receipt_date_range.html",
                controller: setDateRange,
                resolve: {
                    startDate: function(){
                        return $scope.startDate;
                    },
                    endDate: function(){
                        return $scope.endDate;
                    }
                }
            });

            modalInstance.result.then(function(range){
                if (moment(range.start, 'YYYY-MM-DD')._d.toString() == $scope.startDate._d.toString()
                    && moment(range.end, 'YYYY-MM-DD')._d.toString() == $scope.endDate._d.toString()) {
                    return 0;
                }

                $scope.startDate = moment(range.start, 'YYYY-MM-DD');
                $scope.endDate = moment(range.end, 'YYYY-MM-DD');

                getData();
            });
        };

        $scope.listReceiptByAdmin = function(admin_id, status) {
            var modalInstance = $modal.open({
                templateUrl: 'list_receipt_by_admin.html',
                controller: ctrlListReceiptByAdmin,
                resolve: {
                    admin_info: function(){
                        return {
                            _id: admin_id,
                            name: $scope.listAdmin[admin_id]
                        };
                    },

                    start_date: function(){
                        return $scope.startDate;
                    },

                    end_date: function () {
                        return $scope.endDate;
                    },

                    status: function () {
                        return status;
                    }
                }
            });
        };
        
        function init(){
            $scope.startDate = moment().startOf('month');
            $scope.endDate = moment().startOf('day');

            getData();
        }

        init();
    });
}(angular, async, moment));