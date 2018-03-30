(function($a){
    'use strict';
    var initQuest = 'Bạn thực sự muốn thực hiện thao tác này?';

    $a.module('ML').controller('bank', function($scope, $rootScope, $http, $modal, $routeParams, localStorageService){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Bank';
        $scope.listBank = [];


        function saveBank(listBank, callback) {
            $http.post('/bank/update', {
                listBank: listBank
            }).success(function(data, err) {
                callback(data);
            }).error(function(data, err) {
                alert('Error');
                callback();
            });
        }

        function updateBank(listBank) {
            var newTime = parseInt(new Date().getTime() / 1000, 10);
            var newList = {
                t: newTime,
                data: listBank
            };
            localStorageService.add('bankList', JSON.stringify(newList));
            $scope.lastUpdate = moment(newTime * 1000).format();
            $scope.listBank = listBank;
        }

        var btnStatus = function(status) {
            switch (status) {
                case 1:
                    $scope.okCheck = true;
                    $scope.sendUpload = false;
                    $scope.sendOk = false;
                    break;
                case 2:
                    $scope.okCheck = false;
                    $scope.sendUpload = true;
                    $scope.sendOk = false;
                    break;
                case 3:
                    $scope.okCheck = false;
                    $scope.sendUpload = false;
                    $scope.sendOk = true;
                    break;
                default:
                    $scope.okCheck = true;
                    $scope.sendUpload = false;
                    $scope.sendOk = false;
            }
        };

        $scope.getList = function(status) {
            if (status) {
                $http.post('/bank/get').success(function(data, err) {
                    localStorageService.add('bankList', JSON.stringify(data.data));
                    $scope.lastUpdate = moment(data.data.t * 1000).format();
                    $scope.listBank = data.data.data;
                }).error(function(data, err) {
                    alert('Error');
                });
            } else {
                var listBank = localStorageService.get('bankList');
                if (listBank) {
                    $scope.lastUpdate = moment(listBank.t * 1000).format();
                    $scope.listBank = listBank.data;
                } else {
                    $scope.getList(1);
                }
            }
        };

        $scope.generate = function() {
            var s = confirm(initQuest);
            if (s) {
                btnStatus(2);
                var tmpListBank = [];
                $scope.listBank.forEach(function(bank, index) {
                    delete bank.tmp;
                    tmpListBank.push(bank);
                });
                saveBank(tmpListBank, function(data) {
                    updateBank(tmpListBank);
                    btnStatus(3);
                    setTimeout(btnStatus(1), 3000);
                });
            }
        };

        $scope.delete = function(bank) {
            $scope.listBank.forEach(function(bankInfo, key) {
                if (bankInfo === bank) {
                    $scope.listBank.splice(key, 1);
                }
            });
            updateBank($scope.listBank);
        };

        $scope.edit = function(bank) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/bank/info.html',
                controller: ctrlEdit,
                resolve: {
                    bankMsg: function() {
                        return bank;
                    }
                }
            });

            modalInstance.result.then(function() {
                updateBank($scope.listBank);
            });
        };

        $scope.addNew = function() {
            var modalInstance = $modal.open({
                templateUrl: '/partials/bank/info.html',
                controller: ctrlAdd,
                resolve: {
                    bankMsg: function(){
                        return {
                            t: 1
                        };
                    },
                    listBank: function(){
                        return $scope.listBank;
                    }
                }
            });

            modalInstance.result.then(function(lstBank) {
                updateBank(lstBank);
            }, function() {});
        };

        var ctrlAdd = function($scope, Page, $modalInstance, bankMsg, listBank) {
            $scope.bankMsg = bankMsg;
            $scope.errorMsg = null;

            $scope.saveBankMsg = function(bank) {
                bank.tmp = true;
                listBank.push(bank);
                $modalInstance.close(listBank);
            };
            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            };
        };

        var ctrlEdit = function($scope, Page, $modalInstance, bankMsg){
            var tmpBankMsg = bankMsg;
            $scope.bankMsg = bankMsg;

            $scope.saveBankMsg = function() {
                $modalInstance.close($scope.bankMsg);
            };
            $scope.cancel = function() {
                $scope.bankMsg = tmpBankMsg;
                $modalInstance.dismiss('cancel');
            };
        };
    });
}(angular));