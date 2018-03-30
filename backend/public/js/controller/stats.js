(function($a){
    'use strict';

    $a.module('ML').controller('Stats', function($scope, $rootScope, $routeParams, $http, $modal){
        var page = $routeParams.status;
        $scope.page = page;
        $rootScope.MLPageDetail = 'Statistics';

        $scope.showDaily = false;
        $scope.showMinutely = false;
        $scope.mode = 'Daily';

        $scope.start = 0;
        $scope.endtime = new Date().getTime();

        $scope.errorCode = [];
        $scope.tableCode = [];

        var limit = 30;
        $scope.statsData = [];

        var charts ={};

        $scope.endDate = moment().valueOf();
        $scope.startDate = moment().subtract(15, 'days').valueOf();

        $scope.chooseDate = function() {
            var modalInstance = $modal.open({
                templateUrl: '/partials/dashboard/set_date_range.html',
                controller: ctrlChooseDate,
                resolve: {
                    startDate: function(){
                        return $scope.startDate;
                    },
                    endDate: function(){
                        return $scope.endDate;
                    }
                }
            });
            modalInstance.result.then(function(date){
                $scope.startDate = moment(date.sd).valueOf();
                $scope.endDate = moment(date.ed).valueOf();
            });
        };

        function getPremiumStat(element) {
            $http.post('/user/premium-count', {start: $scope.startDate, end: $scope.endDate})
                .success(function(data){
                    if (!data.s) return console.log('Get premium chart data failed');

                    if (!charts[element]) {
                        charts[element] = new Morris.Area({
                            element: element,
                            data: data.d,
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
                    } else charts[element].setData(data.d);
                }).error(console.log);
        }

        var ctrlChooseDate = function($scope, $modalInstance, startDate, endDate) {
            $scope.info = {
                sd: startDate,
                ed: endDate
            };
            $scope.done = function(info){
                var s = new Date(info.sd),
                    e = new Date(info.ed);
                if (s > e) alert("End Date must greater or equal than Start Date");
                else $modalInstance.close(info);
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        };

        var getStat = function(table, types, start, end, limit, callback){
            $http.post('/stats', {table: table, types: types, start: start, end: end, limit: limit}).success(function(data){
                callback(false, data);
            }).error(function(data){
                callback(true, data);
            });
        };

        var formatData = function(data){
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

                        if (page == 'hourly') {
                            newCreateTime = moment(stat.createAt).format('HH:mm DD/MM');
                        } else {
                            newCreateTime = moment(stat.createAt).subtract(1, 'minutes').subtract(7, 'hours').format('DD/MM');
                        }

                        newData.push({counter: stat.counter, createAt: newCreateTime}); // moment(stat.createAt).format('DD/MM HH:mm')
                    }
                });

                return newData;
            } else {
                return [];
            }
        };

        var mergeTransaction = function(datas1, datas2){
            var newData = [];
            datas1.forEach(function(data, index){
                newData.push({create: data.counter, del: datas2[index].counter, createAt: data.createAt});
            });
            return newData;
        };

        var mergeData = function(object){
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
        };

        $scope.getStat = function(element, tableCode){
            var table = parseInt(tableCode,10);
            if(table == 600){
                getTransactionStat(element);
            } else if (table === 1000){
                getDeviceStat(element);
            } else if (table == 1600) {
                getPushNotificationDeviceStat(element);
            } else if (table == 1610) {
                getPushNotificationSessionStat(element);
            } else if (table === 1500) {
                getPremiumStat(element)
            } else {
                getStat(table, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                    if(err) console.log(err);
                    else {
                        var newData = formatData(data.d);

                        if (!charts[element]) {
                            charts[element] = new Morris.Area({
                                element: element,
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
                        } else charts[element].setData(newData);
                    }
                });
            }
        };

        function getTransactionStat(element){
            async.parallel({
                transaction: function(cb){
                    getStat(600, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else cb(null, data);
                    });
                },
                transactionDelete: function(cb){
                    getStat(603, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else cb(null, data);
                    });
                }
            }, function(err, results){
                var newTransData = formatData(results.transaction.d);
                var newTransDelData = formatData(results.transactionDelete.d);
                var data = mergeTransaction(newTransData, newTransDelData);

                if (!charts[element]) {
                    charts[element] = new Morris.Area({
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
                } else charts[element].setData(data);
            });
        }

        function getDeviceStat(element){
            async.parallel({
                total: function(cb){
                    getStat(1000, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                android: function(cb){
                    getStat(1010, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                ios: function(cb){
                    getStat(1020, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                wp: function(cb){
                    getStat(1034, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                windows: function(cb){
                    getStat(1035, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                mac: function(cb){
                    getStat(1060, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            data.d = data.d.reverse();
                            cb(null, data);
                        }
                    });
                },
                web: function(cb){
                    getStat(1070, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
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
                if (!charts[element]) {
                    charts[element] = new Morris.Area({
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
                } else charts[element].setData(newData);
            });
        }

        function getPushNotificationSessionStat(element){
            async.parallel({
                total: function(cb){
                    getStat(1610, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                },
                accepted: function(cb){
                    getStat(1611, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                },
                denied: function(cb){
                    getStat(1612, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                },
                pending: function(cb){
                    getStat(1613, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                }
            }, function(error, results){
                var newData = mergeData(results);
                if (!charts[element]) {
                    charts[element] = new Morris.Area({
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
                        ykeys: ['accepted', 'denied', 'pending'],
                        labels: ['Accepted', 'Denied', 'pending'],
                        lineColors: ['#3EB249', '#F44336', '#3498db']
                    });
                } else charts[element].setData(newData);
            });
        }

        function getPushNotificationDeviceStat(element){
            async.parallel({
                total: function(cb){
                    getStat(1600, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                },
                sent: function(cb){
                    getStat(1601, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                },
                read: function(cb){
                    getStat(1602, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                },
                error: function(cb){
                    getStat(1603, $scope.types, $scope.start, $scope.endtime, limit, function(err, data){
                        if(err) cb(null, []);
                        else {
                            data.d = formatData(data.d);
                            cb(null, data);
                        }
                    });
                }
            }, function(error, results){
                var newData = mergeData(results);
                if (!charts[element]) {
                    charts[element] = new Morris.Area({
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
                        ykeys: ['sent', 'read', 'error'],
                        labels: ['Sent', 'Read', 'Error'],
                        lineColors: ['#3EB249', '#3498db', '#F44336']
                    });
                } else charts[element].setData(newData);
            });
        }

        function getMode() {
            if (page == 'daily') {
                $scope.types = 1;
                $scope.mode = 'Daily';
            } else if (page == 'hourly') {
                $scope.types = 2;
                $scope.mode = 'Hourly';
            } else if (page == 'monthly') {
                $scope.types = 3;
                $scope.mode = 'Monthly';
            }
        }
        getMode();

        $scope.selectMode = function(mode){
            if ($scope.mode == mode) return;
            $scope.mode = mode;
            getStat();
        };
    })
}(angular));
