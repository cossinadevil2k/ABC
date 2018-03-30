'use strict';

(function($a) {
    $a.module('ML').controller('dashboardPlatform', function($scope, $rootScope, $modal, $http) {
        $rootScope.MLPageDetail = 'Dashboard Platform Details';
        $rootScope.tabSelect = 1;
        var dailyLimit = 31;
        var monthlyLimit = 12;
        $scope.dailyEnd = moment().startOf('day');
        $scope.dailyStart = moment().subtract(dailyLimit, 'days').startOf('day');
        $scope.monthlyEnd = moment().startOf('month');
        $scope.monthlyStart = moment().subtract(monthlyLimit, 'months').startOf('month');
        $scope.totalDesktop = 0;
        $scope.totalWeb = 0;
        $scope.totalDesktopHasMobile = 0;
        $scope.totalWebHasMobile = 0;
        
        $scope.loadingDeviceDailyChart = false;
        $scope.loadingDeviceMonthlyChart = false;
        $scope.loadingMobileDesktop = false;
        $scope.loadingDesktop = false;
        $scope.loadingWeb = false;
        $scope.loadingMobileWeb = false;
        
        var platformChart = {
            dailyPlatform: null,
            monthlyPlatform: null,
            yearlyPlatform: null
        };
        var mobileDesktopChart;
        var desktopChart;
        var mobileWebChart;
        var webChart;
        
        var TYPE = {
            DAILY:1,
            MONTHLY: 3
        };

        function getStat(table, types, start, end, limit, callback) {
            $http.post('/stats', {table: table, types: types, start: start.valueOf(), end: end.valueOf(), limit: limit}).success(function(data) {
                callback(false, data);
            }).error(function(data){
                callback(true, data);
            });
        }
        
        function getMobileHasDesktopUser(callback) {
            $scope.loadingMobileDesktop = true;
            
            getStat(903, 1, $scope.dailyStart, $scope.dailyEnd, dailyLimit, function(err, data) {
                $scope.loadingMobileDesktop = false;
                
                if (err) return callback();

                var chartData = formatData(data.d);
                chartData = formatData2(chartData);

                if (!mobileDesktopChart) {
                    mobileDesktopChart = new Morris.Area({
                        element: 'mobile-desktop',
                        data: chartData,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'createAt',
                        ykeys: ['value'],
                        labels: ['New user'],
                        lineColors: ['#3EB249']
                    });
                } else {
                    mobileDesktopChart.setData(chartData);
                }
                
                callback();
            });
        }
        
        function getDesktopUser(callback) {
            $scope.loadingDesktop = true;

            getStat(904, 1, $scope.dailyStart, $scope.dailyEnd, dailyLimit, function(err, data) {
                $scope.loadingDesktop = false;

                if (err) return callback();

                var chartData = formatData(data.d);
                chartData = formatData2(chartData);

                if (!desktopChart) {
                    desktopChart = new Morris.Area({
                        element: 'desktop-total',
                        data: chartData,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'createAt',
                        ykeys: ['value'],
                        labels: ['New user'],
                        lineColors: ['#3EB249']
                    });
                } else {
                    desktopChart.setData(chartData);
                }

                callback();
            });
        }
        
        function getWebUser(callback) {
            $scope.loadingWeb = true;

            getStat(905, 1, $scope.dailyStart, $scope.dailyEnd, dailyLimit, function(err, data) {
                $scope.loadingWeb = false;

                if (err) return callback();

                var chartData = formatData(data.d);
                chartData = formatData2(chartData);

                if (!webChart) {
                    webChart = new Morris.Area({
                        element: 'web-total',
                        data: chartData,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'createAt',
                        ykeys: ['value'],
                        labels: ['New user'],
                        lineColors: ['#3EB249']
                    });
                } else {
                    webChart.setData(chartData);
                }

                callback();
            });
        } 
        
        function getMobileHasWebUser(callback) {
            $scope.loadingMobileWeb = true;

            getStat(906, 1, $scope.dailyStart, $scope.dailyEnd, dailyLimit, function(err, data) {
                $scope.loadingMobileWeb = false;

                if (err) return callback();

                var chartData = formatData(data.d);
                chartData = formatData2(chartData);

                if (!mobileWebChart) {
                    mobileWebChart = new Morris.Area({
                        element: 'mobile-web',
                        data: chartData,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'createAt',
                        ykeys: ['value'],
                        labels: ['New user'],
                        lineColors: ['#3EB249']
                    });
                } else {
                    mobileWebChart.setData(chartData);
                }

                callback();
            });
        }

        function getTotalDesktop(callback) {
            $http.post('/dashboard/user-desktop', {})
                .success(function(result) {
                    if (!result.status) {
                        alert('Get total desktop failed');
                        return callback();
                    }

                    $scope.totalDesktop = result.total;
                    $scope.totalDesktopHasMobile = result.hasMobile;

                    callback();
                })
                .error(function() {
                    alert("Error from server");
                    callback();
                });
        }

        function getTotalWeb(callback) {
            $http.post('/dashboard/user-web', {})
                .success(function(result) {
                    if (!result.status) {
                        alert('Get total web failed');
                        return callback();
                    }

                    $scope.totalWeb = result.total;
                    $scope.totalWebHasMobile = result.hasMobile;

                    callback();
                })
                .error(function() {
                    alert("Error from server");
                    callback();
                });
        }
        
        function getDeviceStat(type, element, start, end, limit, callback) {
            $scope.loadingDeviceChart = true;
            
            async.parallel({
                total: function(cb) {
                    getStat(1000, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                android: function(cb) {
                    getStat(1010, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                ios: function(cb){
                    getStat(1020, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                wp: function(cb){
                    getStat(1034, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                windows: function(cb){
                    getStat(1035, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                mac: function(cb){
                    getStat(1060, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                web: function(cb){
                    getStat(1070, type, start, end, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                }
            }, function(err, results){
                var newData = mergeData(results);
                newData = newData.reverse();
                
                if (!platformChart[element]) {
                    platformChart[element] = new Morris.Area({
                        element: element,
                        data: newData,
                        grid: false,
                        lineWidth: 4,
                        parseTime: false,
                        pointSize: 3,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'createAt',
                        ykeys: ['android', 'ios', 'wp', 'windows', 'mac', 'web'],
                        labels: ['android', 'ios', 'wp', 'windows', 'mac', 'web'],
                        lineColors: ['#3EB249', '#F44336', '#FFEB3B', '#2196F3', '#607D8B', '#8E24AA']
                    });
                } else {
                    platformChart[element].setData(newData);
                }

                $scope.loadingDeviceChart = false;
                
                callback();
            });
        }

        function mergeData(object){
            var newData = [];
            var total = object.total.d;
            var objSize = Object.keys(object).length;
            var objKeys = Object.keys(object);
            
            total.forEach(function(data, index){
                var info = {};
                info.createAt = data.createAt;
                
                for(var i=0; i < objSize; i++){
                    var counter = object[objKeys[i]].d[index] || 0;
                    
                    if(counter === 0)
                        info[objKeys[i]] = counter;
                    else
                        info[objKeys[i]] = counter.counter;
                }
                
                newData.push(info);
            });

//                for(var i = totalSize - 1; i>=0; i--){
//                    var info = {};
//                    info.createAt = total[i].createAt;
//                    for(var j = objSize - 1; j>= 0; j--){
//                        var counter = object[objKeys[j]].d[i] || 0;
//                        if(counter === 0){
//                            info[objKeys[j]] = counter;
//                        } else {
//                            info[objKeys[j]] = counter.counter;
//                        }
//                        newData.push(info);
//                    }
//                }
            return newData;
        }
        
        function formatData2(data) {
            var result = [];
            var dataSize = data.length;
            
            for (var i = 1; i < dataSize; i++) {
                var obj = {};
                
                obj.createAt = data[i].createAt;
                obj.value = data[i].counter - data[i - 1].counter;
                
                result.push(obj);
            }
            
            return result;
        }

        function formatData(data) {
            if (data.length > 0) {
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
        
        function init() {
            $scope.loadingDeviceDailyChart = true;
            getDeviceStat(TYPE.DAILY, 'dailyPlatform', $scope.dailyStart, $scope.dailyEnd, dailyLimit, function() {
                $scope.loadingDeviceDailyChart = false;
                $scope.loadingDeviceMonthlyChart = true;
                
                getDeviceStat(TYPE.MONTHLY, 'monthlyPlatform', $scope.monthlyStart, $scope.monthlyEnd, monthlyLimit, function() {
                    $scope.loadingDeviceMonthlyChart = false;
                    
                    getMobileHasDesktopUser(function() {
                        getDesktopUser(function() {
                            getWebUser(function() {
                                getMobileHasWebUser(function() {
                                    getTotalDesktop(function() {
                                        getTotalWeb(function() {

                                        });
                                    })
                                });
                            });
                        });
                    });
                });
            });
        }
        
        init();
    });
}(angular));
