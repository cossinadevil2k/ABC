(function ($a, moment) {
    'use strict';
    $a.module('ML').controller('dashboard', function ($scope, $rootScope, Page, $location, $http, $modal) {
        $rootScope.MLPageDetail = 'Dashboard';
        $rootScope.tabSelect = 1;
        $scope.mlNumbers = {
            users: 205598,
            premium: 14604,
            wallets: 194687,
            transactions: 13149145,
            devices: 353621,
            userTotalActiveSync: 114372,
            error: ''
        };

        $scope.endDate = moment();
        $scope.startDate = moment().subtract(15, 'days');

        var premium_chart, user_chart;

        function countUser(startDate, endDate, type, callback) {
            type = type ? type : 2;
            startDate = moment(startDate).format('MM-DD-YYYY');
            endDate = moment(endDate).format('MM-DD-YYYY');
            $http.post('/user/count', {
                startDate: startDate,
                endDate: endDate,
                type: type
            }).success(callback)
                .error(function () {
                    alert("Error From Server");
                });
        }

        var getPremiumStat = function (start, end, callback) {
            $http.post('/user/premium-count', { start: start, end: end }).success(function (data) {
                callback(false, data);
            }).error(function (data) {
                callback(true, data);
            });
        };

        $scope.userTotal = function () {
            var that = this;
            that.userToalValue = 0;
            var startDate = '01-01-2000';
            var endDate = moment().zone("+07:00").format('DD-MM-YYYY').toString();
            countUser(startDate, endDate, 1, function (data) {
                if (!data.err) that.userToalValue = data.data;
                else that.userToalValue = 'Error';
            });
        };

        $scope.userTotalOfMonth = function () {
            var that = this;
            that.userTotalOfMonthValue = 0;
            var endDate = moment().format('DD-MM-YYYY');
            var startDate = moment().day(-30).format('DD-MM-YYYY');
            countUser(startDate, endDate, 2, function (data) {
                if (!data.err) that.userTotalOfMonthValue = data.data;
                else that.userTotalOfMonthValue = 'Error';
            });
        };

        $scope.dbStats = function () {
            $http.post('/dbstats', {})
                .success(function (data) {
                    console.log(data);
                    $scope.stats = data.stats;
                })
                .error(function () {
                    alert("Loi cmnr");
                });
        };

        $scope.userStats = function () {
            var addZeroNumber = function (num) {
                if (num < 10) return '0' + num;
                else return num;
            };
            var parseData = function (dataStats) {
                var tmpStats = [];

                //sort by month
                dataStats = dataStats.sort(function (obj1, obj2) {
                    return obj1._id.month - obj2._id.month;
                });

                //sort by year
                dataStats = dataStats.sort(function (obj1, obj2) {
                    return obj1._id.year - obj2._id.year;
                });

                dataStats.forEach(function (itemStats) {
                    var newItemStat = itemStats.dailyStats.sort(function (obj1, obj2) {
                        return obj1.ngay - obj2.ngay;
                    });
                    newItemStat.forEach(function (dayStats) {
                        tmpStats.push({ ngay: addZeroNumber(dayStats.ngay) + '/' + addZeroNumber(itemStats._id.month), counter: dayStats.count });
                    });
                });
                return tmpStats;
            };

            countUser($scope.startDate.valueOf(), $scope.endDate.valueOf(), 4, function (data) {
                var newData = data.data;

                if (newData) {
                    var dailyStats = [];
                    dailyStats = parseData(newData);

                    if (user_chart) {
                        user_chart.setData(dailyStats);
                    } else {
                        user_chart = new Morris.Area({
                            element: 'chart1',
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
                            labels: ['Register'],
                            lineColors: ['#379ca8']
                        });
                    }
                } else $scope.userChartMessage = 'No data';
            });
        };

        $scope.activeTotalOfMonth = function () {
            var that = this;
            var startDate = moment().startOf('month').format('DD-MM-YYYY');
            var endDate = moment().endOf('month').format('DD-MM-YYYY');
            that.activeTotalOfMonthValue = 0;
            $http.post('/events/stats', { startDate: startDate, endDate: endDate }).success(function (data) {
                if (!data.error) {
                    that.activeTotalOfMonthValue = data.data || 0;
                } else that.activeTotalOfMonthValue = 'Error';
            }).error(function () {
                alert('Error');
            });
        };

        $scope.activeSync = function () {
            var Dated = new Date();
            countUser(Dated, Dated, 3, function (data) {
                if (!data.err) $scope.mlNumbers.userTotalActiveSync = data.data;
                else $scope.mlNumbers.userTotalActiveSync = 'Error';
            });
        };

        $scope.inviteSync = function () {
            $http.post('/invited/stat', {}).success(function (data) {
                if (data.error) alert(data.msg);
                else $scope.totalInviteSync = data.data;
            }).error(function () {
                alert('Error');
            });
        };

        $scope.counts = function () {
            $http.post('/stats/count-user-transaction', {})
                .success(function (data) {
                    if (data.error) {
                        $scope.mlNumbers.error = "Error";
                    } else {
                        $scope.mlNumbers.users = data.data.users;
                        $scope.mlNumbers.premium = data.data.premium;
                        $scope.mlNumbers.transactions = data.data.transactions;
                        $scope.mlNumbers.wallets = data.data.wallets;
                        $scope.mlNumbers.devices = data.data.devices;
                        $scope.mlNumbers.linkedWallets = data.data.linkedWallets;
                    }
                })
                .error(function () {
                    alert("Error while counting users & transactions");
                });
        };

        $scope.premiumStats = function () {
            getPremiumStat($scope.startDate.format('DD/MM/YYYY'), $scope.endDate.format('DD/MM/YYYY'), function (err, data) {
                if (!err) {
                    var newData = data.d;

                    if (premium_chart) {
                        premium_chart.setData(newData);
                    } else {
                        premium_chart = new Morris.Area({
                            element: 'chart2',
                            data: newData,
                            grid: false,
                            lineWidth: 4,
                            parseTime: false,
                            pointSize: 3,
                            behaveLikeLine: true,
                            fillOpacity: 0.7,
                            smooth: false,
                            xkey: 'date',
                            ykeys: ['amount'],
                            labels: ['Total'],
                            lineColors: ['#379ca8']
                        });
                    }
                }
            });
        };

        $scope.setDateRange = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/dashboard/set_date_range.html',
                controller: datePickerController,
                resolve: {
                    startDate: function () {
                        return $scope.startDate;
                    },
                    endDate: function () {
                        return $scope.endDate;
                    }
                }
            });

            modalInstance.result.then(function (date) {
                $scope.startDate = moment(date.sd).valueOf();
                $scope.endDate = moment(date.ed).valueOf();
                $scope.userStats();
                $scope.premiumStats();
            });
        };

        var datePickerController = function ($scope, $modalInstance, startDate, endDate) {
            $scope.info = {
                sd: startDate,
                ed: endDate
            };
            $scope.done = function (info) {
                var s = new Date(info.sd),
                    e = new Date(info.ed);
                if (s > e) alert("End Date must greater or equal than Start Date");
                else $modalInstance.close(info);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        updateInfo();
        function updateInfo() {
            $scope.counts();
        }

        function compare(a, b) {
            if (a.value < b.value)
                return 1;
            if (a.value > b.value)
                return -1;
            return 0;
        }

        $scope.todayCountry = function () {
            var modalInstance = new $modal.open({
                templateUrl: '/partials/dashboard/todaycountry.html',
                controller: ctrlTodayCountry,
                resolve: {}
            });
        };

        function ctrlTodayCountry($modalInstance, $scope) {
            $scope.isLoading = false;

            var chart, chartRef;

            var today = new Date();
            $scope.date = new Date();

            displayInfo($scope.date);

            function handleData(data) {
                var output = [];
                var others_value = 0;

                data.sort(compare);

                data.forEach(function (element, index) {
                    if (index < 10) {
                        output.push(element);
                    } else {
                        others_value += element.value;
                    }
                });

                if (others_value != 0) {
                    output.push({
                        label: 'Others',
                        value: others_value
                    });
                }

                return output;
            }

            function renderChart(element, data) {
                if (element === 'chart') {
                    if (chart) {
                        chart = null;
                    }

                    chart = new Morris.Donut({
                        element: 'chart',
                        data: data
                    });
                } else if (element === 'chartRef') {
                    if (chartRef) {
                        chartRef = null;
                    }

                    chartRef = new Morris.Donut({
                        element: 'chartRef',
                        data: data
                    });
                }
            }

            function getDataNow(callback) {
                $http.post('/stats/user-country-today', {})
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback("Failed to get chart data");
                        }
                    })
                    .error(function () {
                        callback("Error From Server");
                    });
            }

            function getRefNow(callback) {
                $http.post('/stats/user-ref-today', {})
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback('Failed to get ref data chart');
                        }
                    });
            }

            function getUtmNow(callback) {
                $http.post('/stats/user-utm-today', {})
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback('Failed to get ref data chart');
                        }
                    });
            }

            function getUtmByDay(time, callback) {
                $http.post('/stats/user-utm-by-day', { time: time.valueOf() })
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback('Failed to get ref chart data');
                        }
                    }).error(function () {
                        callback('Error From Server');
                    });
            }

            function getDataByDay(time, callback) {
                $http.post('/stats/user-country-by-day', { time: time.valueOf() })
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback('Failed to get chart data');
                        }
                    })
                    .error(function () {
                        callback('Error From Server');
                    });
            }

            function getRefByDay(time, callback) {
                $http.post('/stats/user-ref-by-day', { time: time.valueOf() })
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback('Failed to get ref chart data');
                        }
                    })
                    .error(function () {
                        callback('Error From Server');
                    });
            }

            function getData(time, callback) {
                if (isToday(time)) {
                    getDataNow(callback);
                } else {
                    getDataByDay(time, callback);
                }
            }

            function getRefData(time, callback) {
                if (isToday(time)) {
                    // getRefNow(callback);
                    getUtmNow(callback);
                } else {
                    // getRefByDay(time, callback);
                    getUtmByDay(time, callback);
                }
            }

            function isToday(time) {
                return (
                    time.getFullYear() === today.getFullYear() &&
                    time.getMonth() === today.getMonth() &&
                    time.getDate() === today.getDate()
                );
            }

            function displayInfo(time) {
                $scope.isLoading = true;

                getData(time, function (err, data) {
                    $scope.isLoading = false;

                    if (err) {
                        return alert(err);
                    }

                    if (!data || data.length === 0) {
                        $scope.noData = true;
                    } else {
                        $scope.noData = false;

                        renderChart('chart', handleData(data));
                    }
                });

                getRefData(time, function (err, data) {
                    if (err) {
                        return alert(err);
                    }

                    if (!data || data.length === 0) {
                        $scope.noRefData = true;
                    } else {
                        $scope.noRefData = false;

                        renderChart('chartRef', handleData(data));
                    }
                });
            }

            $scope.showStats = function () {
                displayInfo(this.date);
            };
        }

        $scope.premiumCharts = function () {
            var modalInstance = new $modal.open({
                templateUrl: '/partials/dashboard/premium_charts.html',
                controller: ctrlPremiumCharts,
                resolve: {}
            });
        };

        function ctrlPremiumCharts($modalInstance, $scope) {
            $scope.isLoading = false;

            var countryChart, eventChart;

            var today = new Date();
            $scope.date = new Date();

            displayPremiumInfo($scope.date);

            function handleData(data) {
                var output = [];
                var others_value = 0;

                data.sort(compare);

                data.forEach(function (element, index) {
                    if (index < 10) {
                        output.push(element);
                    } else {
                        others_value += element.value;
                    }
                });

                if (others_value != 0) {
                    output.push({
                        label: 'Others',
                        value: others_value
                    });
                }

                return output;
            }

            function renderChart(element, data) {
                if (element === 'countryChart') {
                    if (countryChart) {
                        countryChart = null;
                    }

                    countryChart = new Morris.Donut({
                        element: 'countryChart',
                        data: data
                    });
                }
            }

            function getData(time, callback) {
                var postData = {};
                if (time) {
                    if (!isToday(time)) {
                        postData.time = time.valueOf();
                    }
                }

                $http.post('/stats/premium-country', postData)
                    .success(function (result) {
                        if (result.s) {
                            callback(null, result.d);
                        } else {
                            callback("Failed to get chart data");
                        }
                    })
                    .error(function () {
                        callback("Error From Server");
                    });
            }

            // function getData(time, callback){
            //     if (isToday(time)) {
            //         getDataNow(callback);
            //     }
            // }

            function isToday(time) {
                return (
                    time.getFullYear() === today.getFullYear() &&
                    time.getMonth() === today.getMonth() &&
                    time.getDate() === today.getDate()
                );
            }

            function displayPremiumInfo(time) {
                $scope.isLoading = true;

                getData(time, function (err, data) {
                    $scope.isLoading = false;

                    if (err) {
                        return alert(err);
                    }

                    if (!data || data.length === 0) {
                        $scope.noData = true;
                    } else {
                        $scope.noData = false;

                        renderChart('countryChart', handleData(data));
                    }
                });

            }

            $scope.showStats = function () {
                displayPremiumInfo(this.date);
            };
        }
    });
}(angular, moment));
