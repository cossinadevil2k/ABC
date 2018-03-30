(function ($a) {
    'use strict';
    $a.module('ML').controller('systemsinfo', function ($scope, $rootScope, $http, $timeout) {
        var loadInfodata = function () {
            $http.post("/dbstats", {})
                .success(function (response) {
                    $scope.isLoading = false;
                    if (response.s) {
                        $scope.info = response.stats;
                    }
                    else alert('Get database info failed');
                }).error(function () {
                $scope.isLoading = false;
                alert('Error from server.');
            });
        };
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Systems Info';

        $scope.isLoading = true;
        loadInfodata();

        $scope.refreshInfo = function () {
            loadInfodata();
            $scope.rotationData = true;
            $timeout(function () {
                $scope.rotationData = false;
            }, 1600, true);
        };

        var getListProcess = function () {
            $http.post("/processesstats", {})
                .success(function (response) {
                    $scope.presentDate = (new Date).getTime();
                    $scope.process = response.list;
                }).error(function () {
                alert('Error');
            });
        };
        getListProcess();
        $scope.presentDate = (new Date).getTime();

        var getServerInfo = function () {
            $http.post("/serverinfo", {})
                .success(function (response) {
                    $scope.serverinfo = response.data;
                })
                .error(function () {
                    alert('Error');
                });
        };
        getServerInfo();
        $scope.refreshServer = function () {
            getServerInfo();
            $scope.rotationServer = true;
            $timeout(function () {
                $scope.rotationServer = false;
            }, 1600, true)
        };

        $scope.refreshProcess = function () {
            getListProcess();
            $scope.rotationProc = true;
            $timeout(function () {
                $scope.rotationProc = false;
            }, 1600, true)
        };

        $scope.refreshRedis = function () {
            getInfoRedis();
            $scope.rotationRedis = true;
            $timeout(function () {
                $scope.rotationRedis = false;
            }, 1600, true);
        };

        $scope.restartProcess = function (process) {
            var confirmRestart = confirm('Do you really want to RESTART app ' + process.name + '?');
            if (confirmRestart) {
                $http.post("/restartprocess", {pm_id: process.pm_id})
                    .success(function (response) {
                        if (response.s) {
                            $scope.presentDate = (new Date).getTime();
                            getListProcess();
                            $scope.orangeStatus = false;
                        } else {
                            alert(response.m || 'Restart Error');
                        }
                    }).error(function (err) {
                    alert('Error: ' + err);
                });
            } else return false;
        };

        $scope.stopProcess = function (process) {
            var confirmStop = confirm('Do you really want to STOP app ' + process.name + '?');
            if (confirmStop) {
                $http.post("/stopprocess", {pm_id: process.pm_id})
                    .success(function (response) {
                        if (response.s) {
                            getListProcess();
                            $scope.orangeStatus = true;
                        } else {
                            alert(response.m || 'Stop Error');
                        }
                    }).error(function (err) {
                    alert('Error: ' + err);
                });
            } else return false;
        };


        var getInfoRedis = function () {
            $http.get("/redis-info")
                .success(function (response) {
                    var everyInfo = response.d.replace(/\n/g, " ").replace(/\r/g, "").split(" ");
                    var childInfo = [];
                    var infoRedis = {};
                    $scope.infoRedis = infoRedis;
                    for (var i = 0; i < everyInfo.length; i++) {
                        if (everyInfo[i].indexOf("redis_version:") >= 0) {
                            infoRedis.redisVersion = everyInfo[i].replace("redis_version:", "");
                        } else if (everyInfo[i].indexOf("uptime_in_seconds:") >= 0) {
                            infoRedis.uptime = everyInfo[i].replace("uptime_in_seconds:", "");
                        } else if (everyInfo[i].indexOf("used_memory_human:") >= 0) {
                            infoRedis.memoryHuman = everyInfo[i].replace("used_memory_human:", "");
                        } else if (everyInfo[i].indexOf("rdb_last_save_time:") >= 0) {
                            infoRedis.rdbLastSave = everyInfo[i].replace("rdb_last_save_time:", "");
                        } else if (everyInfo[i].indexOf("db") >= 0 && everyInfo[i].indexOf("keys") >= 0) {
                            infoRedis.database = everyInfo[i].replace("db", "");
                            var dbDetail = infoRedis.database.split(",");
                            infoRedis.dbKeys = dbDetail[0].split("=")[1];
                            infoRedis.dbExpires = dbDetail[1].split("=")[1];
                        }
                    }
                }).error(function () {
                alert('Error');
            });
        };
        getInfoRedis();

    });
}(angular));
