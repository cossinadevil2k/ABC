'use strict';

(function($a) {
    $a.module('ML').controller('dashboardTransaction', function($scope, $rootScope, $http, $modal) {
        $rootScope.MLPageDetail = 'Dashboard transaction detail';
        $rootScope.tabSelect = 1;
        $scope.dailyEnd = moment().startOf('day');
        $scope.dailyStart = moment().subtract(15, 'days').startOf('day');
        $scope.monthlyEnd = moment().startOf('month');
        $scope.monthlyStart = moment().subtract(12, 'months').startOf('month');
        var monthlyChart;
        var dailyChart;
        var dailyLimit = 15;
        var monthlyLimit = 12;
        $scope.isLoadingDaily = false;
        $scope.isLoadingMonthly = false;

        function getStat(table, types, start, end, limit, callback) {
            $http.post('/stats', {table: table, types: types, start: start, end: end, limit: limit}).success(function(data){
                callback(false, data);
            }).error(function(data){
                callback(true, data);
            });
        }

        function getTransactionStat(chart, type, element, start, end, limit, callback) {
            async.parallel({
                transaction: function(cb){
                    getStat(600, type, start.valueOf(), end.valueOf(), limit, function(err, data) {
                        if(err) cb(null, []);
                        else cb(null, data);
                    });
                },
                transactionDelete: function(cb){
                    getStat(603, type, start.valueOf(), end.valueOf(), limit, function(err, data) {
                        if(err) cb(null, []);
                        else cb(null, data);
                    });
                }
            }, function(err, results){
                var newTransData = formatData(results.transaction.d);
                var newTransDelData = formatData(results.transactionDelete.d);
                var data = mergeTransaction(newTransData, newTransDelData);

                if (!chart) {
                    chart = new Morris.Area({
                        element: element,
                        data: data,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'createAt',
                        ykeys: ['create', 'del'],
                        labels: ['Create', 'Delete'],
                        lineColors: ['#379ca8', '#ed5564']
                    });
                } else {
                    chart.setData(data);
                }
                
                callback();
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

        function mergeTransaction(datas1, datas2) {
            var newData = [];
            datas1.forEach(function(data, index){
                newData.push({create: data.counter, del: datas2[index].counter, createAt: data.createAt});
            });
            return newData;
        }
        
        function init() {
            $scope.isLoadingDaily = true;
            getTransactionStat(dailyChart, 1, 'dailyChart', $scope.dailyStart, $scope.dailyEnd, dailyLimit, function() {
                $scope.isLoadingDaily = false;
                $scope.isLoadngMonthly = true;
                
                getTransactionStat(monthlyChart, 3, 'monthlyChart', $scope.monthlyStart, $scope.monthlyEnd, monthlyLimit, function() {
                    $scope.isLoadingMonthly = false;
                });
            });
        }
        
        init();
    });
}(angular));
