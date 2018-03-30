(function($a, moment){
    'use strict';

    $a.module('ML').controller('queryCompare', function($scope, $rootScope, $http, $modal){
        $rootScope.MLPageDetail = 'User Search Query Compare';
        $rootScope.tabSelect = 4;

        var timeLimit = 15;
        var charts = {};
        $scope.queries = [];
        $scope.results = {
            total: []
        };

        function init() {
            $scope.startDate = moment().subtract(timeLimit, 'days').format('DD/MM/YYYY');
            $scope.endDate = moment().format('DD/MM/YYYY');
        }

        var processData = function(rawData){
            var data = [];

            rawData.forEach(function(queryResult){
                var tempData = {};

                queryResult.forEach(function(dailyResult){
                    tempData[dailyResult.key_as_string] = dailyResult.doc_count;
                });

                data.push(tempData);
            });

            return data;
        };

        var mergeData = function(timeCell, rawData){
            var data = processData(rawData);

            timeCell.forEach(function(dayCell){
                data.forEach(function(queryResult, resultIndex){
                    if (queryResult[dayCell.Day]) {
                        dayCell[resultIndex + 1] = queryResult[dayCell.Day];
                    } else {
                        dayCell[resultIndex + 1] = 0;
                    }
                });
            });

            return timeCell;
        };

        var generateTimeCell = function(startDate, endDate){
            var data = [];
            var sd = moment(startDate, 'DD/MM/YYYY').startOf('day');
            var ed = moment(endDate, 'DD/MM/YYYY').startOf('day');

            while (!sd.isSame(ed)) {
                var date = sd.format('DD-MM-YYYY');

                var item = {
                    Day: date
                };

                data.push(item);

                sd.add(1, 'days');
            }

            data.push({
                Day: ed.format('DD-MM-YYYY')
            });

            return data;
        };

        var handleData = function(rawData){
            var timeCell = generateTimeCell($scope.startDate, $scope.endDate);
            timeCell = mergeData(timeCell, rawData);

            return timeCell;
        };

        var renderChart = function(element, data, queryAmount){
            var ykeys = [];
            var labels = [];
            for (var i = 1; i <= queryAmount; i++) {
                ykeys.push(i);
                labels.push('Query ' + i + ' users');
            }

            if (charts[element]) {
                charts[element].setData(data);
            } else {
                charts[element] = new Morris.Area({
                    element: element,
                    data: data,
                    grid: true,
                    lineWidth: 4,
                    parseTime: false,
                    pointSize: 3,
                    behaveLikeLine: true,
                    fillOpacity: 0.7,
                    smooth: false,
                    xkey: 'Day',
                    ykeys: ykeys,
                    labels: labels
                    //lineColors: ['#379ca8']
                });
            }
        };

        var generateChart = function(data, queryAmount){
            var chartData = handleData(data);
            renderChart('compare-result', chartData, queryAmount);
        };

        /******/

        var add = function(query){
            if (!query) return 0;

            if ($scope.queries.indexOf(query) !== -1) {
                return 0
            }

            $scope.queries.push(query);
            $scope.query = '';
        };

        var startCompare = function(){
            $scope.chartRendering = true;

            $http.post('/query-compare/compare', {queries: $scope.queries, startDate: $scope.startDate, endDate: $scope.endDate})
                .success(function(result){
                    if (result.s) {
                        generateChart(result.d, $scope.queries.length);
                        $scope.chartRendering = false;
                        $scope.results.total = result.t;
                    } else {
                        alert('Get charts failed');
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });
        };

        var clearQueryList = function(){
            $scope.queries = [];
        };

        var removeQuery = function(index){
            $scope.queries.splice(index, 1);
        };

        var enterToAdd = function(event, query){
            var keyCode = window.event ? event.keyCode : event.which;
            if (keyCode === 13) {
                add(query);
            }
        };

        var setDateRange = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/dashboard/set_date_range.html',
                controller: datePickerController,
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
                $scope.startDate = moment(date.sd).format('DD/MM/YYYY');
                $scope.endDate = moment(date.ed).format('DD/MM/YYYY');
            });
        };

        var datePickerController = function($scope, $modalInstance, startDate, endDate) {
            $scope.info = {
                sd: moment(startDate, 'DD/MM/YYYY').valueOf(),
                ed: moment(endDate, 'DD/MM/YYYY').valueOf()
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

        /****EXPORTS****/
        init();

        $scope.startCompare = startCompare;
        $scope.add = add;
        $scope.clearQueryList = clearQueryList;
        $scope.removeQuery = removeQuery;
        $scope.enterToAdd = enterToAdd;
        $scope.setDateRange = setDateRange;
    });
}(angular, moment));