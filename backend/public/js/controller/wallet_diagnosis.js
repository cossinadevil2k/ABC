(function($a){
    'use strict';

    $a.module('ML').controller('walletDiagnosis', function($scope, $rootScope, $routeParams, $http){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Wallet Diagnosis';

        $scope.loadingPermission = false;
        $scope.loadingDiagnose = false;

        $scope.permissionInfo = [];
        $scope.totalCreate = 0;
        $scope.totalDelete = 0;
        $scope.walletInfo = {};

        init();

        function init(){
            if (!$routeParams.walletid) return;
            getInfo($routeParams.walletid);
            getPermission($routeParams.walletid);
            getTransactionChart($routeParams.walletid);
        }

        function getInfo(walletId){
            $http.post('/wallet-diagnosis/wallet-info', {walletId: walletId})
                .success(function(result){
                    if (result.s) $scope.walletInfo = result.d;
                    $rootScope.MLPageDetail = $scope.walletInfo.name + ' ' + $rootScope.MLPageDetail;
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function getPermission(walletId){
            $scope.loadingPermission = true;
            $http.post('/wallet-diagnosis/wallet-permission', {walletId: walletId})
                .success(function(result){
                    $scope.loadingPermission = false;
                    if (result.s) $scope.permissionInfo = result.d;
                    else alert('Get permission info due to error');
                })
                .error(function(){
                    $scope.loadingPermission = true;
                    alert("Error From Server");
                });
        }

        function getTransactionChart(walletId){
            $scope.loadingDiagnose = true;
            $http.post('/wallet-diagnosis/transaction-count', {walletId: walletId})
                .success(function(result){
                    if (!result.s) {
                        return alert('Get Transaction chart failed');
                    }

                    if (!result.d) {
                        return console.log('no_data');
                    }

                    // console.log(result.d);

                    $scope.totalCreate = result.d.totalAdd;
                    $scope.totalDelete = result.d.totalDelete;
                    //
                    var data = processData(result.d);

                    new Morris.Area({
                        element: 'transactionCreateChart',
                        data: data,
                        grid: false,
                        lineWidth: 1,
                        parseTime: false,
                        pointSize: 0,
                        behaveLikeLine: false,
                        fillOpacity: 0.7,
                        smooth: false,
                        xkey: 'date',
                        ykeys: ['transactionDelete', 'transaction'],
                        labels: ['Delete', 'Create'],
                        lineColors: ['#ed5564', '#379ca8']
                    });

                    $scope.loadingDiagnose = false;
                })
                .error(function(){
                    $scope.loadingDiagnose = false;
                    alert("Error From Server");
                })
        }

        function parseData(dataStats){
            var tmpStats = {};

            dataStats.forEach(function(itemStats){
                var newItemStat = itemStats.stats.sort(function(obj1, obj2) {
                    return obj1.ngay - obj2.ngay;
                });

                newItemStat.forEach(function(dayStats){
                    var date = itemStats._id.year + '-' + addZeroNumber(itemStats._id.month) + '-' + addZeroNumber(dayStats.ngay);
                    tmpStats[date] = dayStats.count;
                });
            });

            return tmpStats;
        }

        function processData(data){
            if (!data.time_range.first || !data.time_range.last) {
                return [];
            }

            var timeCell = generateTimeCell(data.time_range.first, data.time_range.last);
            var referenceDataCreate = parseData(data.add);
            var referenceDataDelete = parseData(data.delete);

            timeCell.forEach(function(cell){
                cell.transaction = referenceDataCreate[cell.date] || 0;
                cell.transactionDelete = referenceDataDelete[cell.date] || 0;
            });

            return timeCell;
        }

        function addZeroNumber(num){
            if(num < 10) return '0' + num;
            else return num;
        }

        function generateTimeCell(start, end){
            var startDate = moment(start).startOf('day');
            var endDate = moment(end).startOf('day');
            var data = [];

            while(!startDate.isSame(endDate)){
                var date  = startDate.format('DD/MM/YYYY');

                var item = {
                    date: date,
                    transactionDelete: 0,
                    transaction: 0
                };

                data.push(item);

                startDate.add(1, 'days');
            }

            data.push({
                date: endDate.format('DD/MM/YYYY'),
                transactionDelete: 0,
                transaction: 0
            });

            return data;
        }
    });
}(angular));
