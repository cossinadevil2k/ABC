(function($a, moment){
    'use strict';
    $a.module('ML').controller('dashboard', function($scope, $rootScope, $http, $modal) {
        $rootScope.MLPageDetail = 'Dashboard';
        $rootScope.tabSelect = 1;

        var walletChart;
        var days = 15;
        $scope.startDate = moment().subtract(days, 'days').valueOf();
        $scope.endDate = moment().valueOf();

        getDashboardStats();

        function getDashboardStats() {
            $http.post('/dashboard/stats', {})
                .success(function(result){
                    if (result.s) {
                        $scope.mlNumbers = result.d;
                    } else {
                        alert("Get stats failed");
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function getWalletChartData(startDate, endDate, callback) {
            $http.post('/dashboard/charts', {startDate: startDate, endDate: endDate})
                .success(function(result){
                    if (result.s) {
                        callback(null, result.d);
                    } else {
                        callback('Get chart data failed');
                    }
                })
                .error(function () {
                    callback("Error From Server");
                });
        }

        function renderChart(data){
            var addZeroNumber = function(num){
                if(num < 10) return '0' + num;
                else return num;
            };

            var parseData = function(dataStats){
                var tmpStats = [];

                //sort by month
                dataStats = dataStats.sort(function(obj1, obj2){
                    return obj1._id.month - obj2._id.month;
                });

                //sort by year
                dataStats = dataStats.sort(function(obj1, obj2){
                    return obj1._id.year - obj2._id.year;
                });

                dataStats.forEach(function(itemStats){
                    var newItemStat = itemStats.dailyStats.sort(function(obj1, obj2) {
                        return obj1.ngay - obj2.ngay;
                    });
                    newItemStat.forEach(function(dayStats){
                        tmpStats.push({ngay: addZeroNumber(dayStats.ngay) + '/' + addZeroNumber(itemStats._id.month), counter: dayStats.count});
                    });
                });
                return tmpStats;
            };


            if (data) {
                var dailyStats = [];
                dailyStats = parseData(data);

                if (walletChart) {
                    walletChart.setData(dailyStats);
                } else {
                    walletChart = new Morris.Area({
                        element: 'wallets',
                        data: dailyStats,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: true,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'ngay',
                        ykeys: ['counter'],
                        labels: ['Wallets'],
                        lineColors: ['#379ca8']
                    });
                }
            } else $scope.userChartMessage = 'No data';
        }

        $scope.walletChart = function () {
            getWalletChartData($scope.startDate, $scope.endDate, function(err, result){
                if (result) {
                    renderChart(result);
                } else {
                    alert(err);
                }
            });
        };
    });
}(angular, moment));
