(function($a) {
    'use strict';
    
    $a.module('ML').controller('dashboardUser', function($scope, $rootScope, $modal, $http) {
        $rootScope.MLPageDetail = 'Dashboard User Details';
        $rootScope.tabSelect = 1;
        var dailyChart;
        var monthlyChart;
        var yearlyChart;
        $scope.dailyEndTime = moment().format('DD/MM/YYYY');
        $scope.dailyStartTime = moment().subtract(15, 'days').format('DD/MM/YYYY');
        $scope.monthlyEndTime = moment().startOf('month').format('DD/MM/YYYY');
        $scope.monthlyStartTime = moment().subtract(12, 'months').startOf('month').format('DD/MM/YYYY');
        $scope.yearlyEndTime = moment().startOf('year').format('DD/MM/YYYY');
        $scope.yearlyStartTime = moment().subtract(5, 'years').startOf('year').format('DD/MM/YYYY');
        $scope.countryEndTime = moment().format('DD/MM/YYYY');
        $scope.countryStartTime = moment().subtract(15, 'days').format('DD/MM/YYYY');
        $scope.userCountryData = [];
        $scope.isLoadingDaily = false;
        $scope.isLoadingMonthly = false;
        $scope.isLoadingYearly = false;
        $scope.isLoadingCountry = false;
        var countryChart;
        
        function setDailyChart(startTime, endTime, callback) {
            $scope.isLoadingDaily = true;

            $http.post('/dashboard/user-stats', {start_time: startTime, end_time: endTime, mode: 1})
                .success(function(result) {
                    $scope.isLoadingDaily = false;

                    if (!result.status) {
                        alert('Get daily data failed');
                        return callback();
                    }

                    if (dailyChart) {
                        dailyChart.setData(result.data);
                    } else {
                        dailyChart = new Morris.Area({
                            element: 'dailyChart',
                            data: result.data,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: ['total'],
                            labels: ['Total'],
                            lineColors: ['#379ca8']
                        });
                    }

                    callback();
                })
                .error(function() {
                    $scope.isLoadingDaily = false;
                    alert("Error from server");
                    callback();
                });
        }
        
        function setMonthlyChart(startTime, endTime, callback) {
            $scope.isLoadingMonthly = true;

            $http.post('/dashboard/user-stats', {start_time: startTime, end_time: endTime, mode: 2})
                .success(function(result) {
                    $scope.isLoadingMonthly = false;

                    if (!result.status) {
                        alert('Get daily data failed');
                        return callback();
                    }

                    if (monthlyChart) {
                        monthlyChart.setData(result.data);
                    } else {
                        monthlyChart = new Morris.Area({
                            element: 'monthlyChart',
                            data: result.data,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: ['total'],
                            labels: ['Total'],
                            lineColors: ['#379ca8']
                        });
                    }

                    callback();
                })
                .error(function() {
                    $scope.isLoadingMonthly = false;
                    alert("Error from server");
                    callback();
                });
        }

        function setYearlyChart(startTime, endTime, callback) {
            $scope.isLoadingYearly = true;

            $http.post('/dashboard/user-stats', {start_time: startTime, end_time: endTime, mode: 3})
                .success(function(result) {
                    $scope.isLoadingYearly = false;

                    if (!result.status) {
                        alert('Get yearly data failed');
                        return callback();
                    }

                    if (yearlyChart) {
                        yearlyChart.setData(result.data);
                    } else {
                        yearlyChart = new Morris.Area({
                            element: 'yearlyChart',
                            data: result.data,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: ['total'],
                            labels: ['Total'],
                            lineColors: ['#379ca8']
                        });
                    }

                    callback();
                })
                .error(function() {
                    $scope.isLoadingYearly = false;
                    alert("Error from server");
                    callback();
                });
        }

        function getUserCountryData(startTime, endTime, callback) {
            $scope.isLoadingCountry = true;

            $http.post('/stats/user-country-by-date-range', {start_time: startTime, end_time: endTime})
                .success(function(result) {
                    $scope.isLoadingCountry = false;

                    if (!result.status) {
                        alert('Get user country data failed');
                        return callback();
                    }
                    
                    $scope.totalByDateRange = result.total;

                    result.data.sort(function(a, b) {
                        return b.value - a.value;
                    });
                    
                    var top15Total = 0;
                    var countryRatio = [];
                    var limit = (result.data.length >= 15) ? 15 : result.data.length;
                    
                    for (var i = 0; i < limit; i++) {
                        top15Total += (result.data[i].value / result.total) * 100;
                        
                        countryRatio.push({
                            label: result.data[i].label,
                            value: (result.data[i].value / result.total) * 100
                        });
                    }
                    
                    if (result.data.length > 15) {
                        countryRatio.push({
                            label: 'Other',
                            value: 100 - top15Total
                        });
                    }

                    countryRatio.map(function(data) {
                        data.value = data.value.toFixed(2);
                        
                        return data;
                    });

                    $scope.userCountryData = result.data;

                    if (countryChart) {
                        countryChart.setData(countryRatio);
                    } else {
                        countryChart = new Morris.Donut({
                            element: 'countryChart',
                            data: countryRatio
                        });
                    }

                    callback();
                })
                .error(function() {
                    $scope.isLoadingCountry = false;
                    alert("Error from server");
                    callback();
                });
        }

        $scope.openDateRangePicker = function() {
            var modalInstance = $modal.open({
                templateUrl: 'change-user-daily-date-range.html',
                controller: datePickerCtrl,
                resolve: {}
            });

            modalInstance.result.then(function(dateRange) {
                $scope.dailyStartTime = dateRange.startTime;
                $scope.dailyEndTime = dateRange.endTime;

                setDailyChart($scope.dailyStartTime, $scope.dailyEndTime, function() {

                });
            });
        };

        $scope.openDateRangePicker2 = function() {
            var modalInstance = $modal.open({
                templateUrl: 'change-user-daily-date-range.html',
                controller: datePickerCtrl,
                resolve: {}
            });

            modalInstance.result.then(function(dateRange) {
                $scope.countryStartTime = dateRange.startTime;
                $scope.countryEndTime = dateRange.endTime;

                getUserCountryData($scope.countryStartTime, $scope.countryEndTime, function() {

                });
            });
        };

        function datePickerCtrl($scope, $modalInstance) {
            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            };

            $scope.pick = function() {
                if (!this.info || !this.info.sd || !this.info.ed) {
                    return alert('Please pick start date and end date');
                }

                var startTime = moment(this.info.sd).format('DD/MM/YYYY');
                var endTime = moment(this.info.ed).format('DD/MM/YYYY');

                $modalInstance.close({startTime: startTime, endTime: endTime});
            }
        }
        
        function init() {
            setDailyChart($scope.dailyStartTime, $scope.dailyEndTime, function() {
                setMonthlyChart($scope.monthlyStartTime, $scope.monthlyEndTime, function() {
                    setYearlyChart($scope.yearlyStartTime, $scope.yearlyEndTime, function() {
                        getUserCountryData($scope.countryStartTime, $scope.countryEndTime, function() {

                        });
                    });
                });
            });
        }
        
        init();
    });
}(angular));
