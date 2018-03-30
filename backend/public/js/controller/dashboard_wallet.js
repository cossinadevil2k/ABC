'use strict';

(function($a) {
    $a.module('ML').controller('dashboardWallet', function($scope, $rootScope, $modal, $http) {
        $rootScope.tabSelected = 1;
        $rootScope.MlPageDetail = 'Dashboard wallet';
        $scope.dailyStart = moment().subtract(15, 'days').startOf('days');
        $scope.dailyEnd = moment().startOf('days');
        $scope.monthlyStart = moment().subtract(12, 'months').startOf('month');
        $scope.monthlyEnd = moment().startOf('month');
        $scope.isLoadingDaily = false;
        $scope.isLoadingMonthly = false;
        var dailyChart;
        var monthlyChart;

        function getStat(table, types, start, end, limit, callback) {
            $http.post('/stats', {table: table, types: types, start: start, end: end, limit: limit}).success(function(data){
                callback(false, data);
            }).error(function(data){
                callback(true, data);
            });
        }

        function formatData(data) {
            if (data.length > 0){
                data.sort(function(a, b) {
                    var timestampA = moment(a.createAt).valueOf();
                    var timestampB = moment(b.createAt).valueOf();
                    return timestampA - timestampB;
                });

                var newData = [];

                data.forEach(function(stat){
                    if(stat && stat.createAt){
                        var newCreateTime;

                        newCreateTime = moment(stat.createAt).subtract(1, 'minutes').subtract(7, 'hours').format('DD/MM');

                        newData.push({counter: stat.counter, createAt: newCreateTime}); // moment(stat.createAt).format('DD/MM HH:mm')
                    }
                });

                return newData;
            } else {
                return [];
            }
        }

        function getDailyChart(callback) {
            $scope.isLoadingDaily = true;

            getStat(100, 1, $scope.dailyStart.valueOf(), $scope.dailyEnd.valueOf(), 15, function(err, data) {
                $scope.isLoadingDaily = false;

                if (err) {
                    console.log(err);
                } else {
                    var newData = formatData(data.d);

                    if (!dailyChart) {
                        dailyChart = new Morris.Area({
                            element: 'dailyChart',
                            data: newData,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'createAt',
                            ykeys: ['counter'],
                            labels: ['Total'],
                            lineColors: ['#379ca8']
                        });
                    } else {
                        dailyChart.setData(newData);
                    }
                }

                callback();
            });
        }

        function getMonthlyChart(callback) {
            $scope.isLoadingMonthly = false;

            getStat(100, 3, $scope.monthlyStart.valueOf(), $scope.monthlyEnd.valueOf(), 12, function(err, data) {
                if (err) {
                    console.log(err);
                } else {
                    var newData = formatData(data.d);

                    if (!monthlyChart) {
                        monthlyChart = new Morris.Area({
                            element: 'monthlyChart',
                            data: newData,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'createAt',
                            ykeys: ['counter'],
                            labels: ['Total'],
                            lineColors: ['#379ca8']
                        });
                    } else {
                        monthlyChart.setData(newData);
                    }

                    callback();
                }
            });
        }

        function init() {
            getDailyChart(function() {
                getMonthlyChart(function() {

                });
            });
        }

        init();
    });
}(angular));