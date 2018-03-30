(function ($a) {
    'use strict';
    $a.module('ML').controller('helpdeskStats', function ($rootScope, $scope, $http) {
        $rootScope.tabSelect = 5;
        $rootScope.MLPageDetail = 'Helpdesk Stats';
        $scope.isLoading = true;

        $scope.page = 1;
        var limit = 50;

        $scope.currentTab = 'issue';

        $scope.tabSelect = function (tab) {
            $scope.currentTab = tab;
        };

        function getStats(url, year, month, adminId) {
            $scope.isLoading = true;
            var postData = {
                limit: limit,
                skip: limit * ($scope.page - 1),
                year: year || null,
                month: month || null,
                adminId: adminId || null
            };

            $http.post(url, postData)
                .success(function (response) {
                    if (response.s) {
                        $scope.stats = response.d;
                        $scope.isLoading = false;
                    }
                    else alert("Get data failed");
                })
                .error(function () {
                    alert("Error From Server");
                });
        }

        $scope.getStats = function () {
            var url;
            switch ($scope.currentTab) {
                case 'issue':
                    url = '/helpdesk/stats/issue';
                    getStats(url);
                    break;
                case 'monthly':
                    url = '/helpdesk/stats/monthly';
                    if (!$scope.query || !$scope.query.year || $scope.query.year == '' || !$scope.query.month || $scope.query.month == '') {
                        $scope.query = {
                            year: moment().year(),
                            month: moment().month()
                        };
                    }
                    getStats(url, $scope.query.year, $scope.query.month);
                    break;
                case 'personal':
                    break;
                default:
                    break;
            }
        };

        $scope.customGetStats = function () {
            if (!$scope.query || !$scope.query.year || $scope.query.year == '' || !$scope.query.month || $scope.query.month == '') {
                alert("Please type year and month!");
            } else {
                var url = '/helpdesk/stats/monthly';
                getStats(url, $scope.query.year, $scope.query.month - 1);
            }
        };

        $scope.helpdeskStats = function (year, month, adminId) {
            $scope.isLoading = true;
            var postData = {
                limit: limit,
                skip: limit * ($scope.page - 1),
                year: year || null,
                month: month || null,
                adminId: adminId || null
            };
            $http.post('/helpdesk/stats/issue', postData)
                .success(function (response) {
                    if (response.s) {
                        // $scope.stats = response.d;
                        $scope.isLoading = false;
                        var dataRaw = response.d.monthly.reverse();
                        var data = [];
                        for (var i = 0; i < dataRaw.length; i++) {
                            var time = dataRaw[i].month + 1 + "-" + dataRaw[i].year;
                            var issue = dataRaw[i].amount;
                            var solved = dataRaw[i].solved;
                            data.push({
                                time: time,
                                issue: issue,
                                solved: solved,
                            });
                        }
                        new Morris.Line({
                            element: 'chart009',
                            data: data,
                            smooth: false,
                            parseTime: false,
                            pointSize: 5,
                            xkey: 'time',
                            ykeys: ['issue', 'solved'],
                            labels: ['Issue', 'Solved'],
                            lineColors: ['#E68A72', '#247882'],
                            pointStrokeColors: ['#E68A72', '#247882'],
                            pointFillColors: ['#ffffff'],
                            fillOpacity: 0
                        });

                    }
                    else alert("Get data failed");
                })
                .error(function () {
                    alert("Error From Server");
                });
        };


        $scope.helpdeskDailyStats = function () {

            var postData = {
                limit: limit,
                skip: limit * ($scope.page - 1)
            };
            var data = [];

            $http.post('/helpdesk/stats/static_daily', postData)
                .success(function (response) {
                    // console.log(response);
                    if (response.status == true) {
                        for (var i = 0; i < response.data.length; i++) {

                            var time = response.data[i].byDate;
                            time = moment(time).format('ll');
                            var issue = response.data[i].issue;
                            var resolve = response.data[i].resolve;

                            data.push({
                                time: time,
                                issue: issue,
                                solved: resolve,
                            });
                        }

                        new Morris.Line({
                            element: 'chart010',
                            data: data,
                            smooth: false,
                            parseTime: false,
                            pointSize: 5,
                            xkey: 'time',
                            ykeys: ['issue', 'solved'],
                            labels: ['Issue', 'Solved'],
                            lineColors: ['#E68A72', '#247882'],
                            pointStrokeColors: ['#E68A72', '#247882'],
                            pointFillColors: ['#ffffff'],
                            fillOpacity: 0
                        });
                    } else {
                        alert('Get data failed');
                    }
                })
                .error(function (error) {
                    alert(error);
                })
        };
    });
}(angular));
