(function ($a) {
    'use strict';
    var initQuest = 'Bạn thực sự muốn thực hiện thao tác này?';

    $a.module('ML').controller('currency', function ($scope, $rootScope, $http, $modal, $routeParams, localStorageService) {
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Currency';
        $scope.listCurrency = [];
        $scope.lastUpdate = new Date();

        function saveCurrency(listCurrency, callback) {
            $http.post('/currency/update', {
                listCurrency: listCurrency
            }).success(function (data, err) {
                callback(data);
            }).error(function (data, err) {
                alert('Error');
                callback();
            });
        }

        function updateCurrency(listCurrency) {
            var newTime = parseInt(new Date().getTime() / 1000, 10);
            var newList = {
                t: newTime,
                data: listCurrency
            };
            localStorageService.add('currencyList', JSON.stringify(newList));
            $scope.lastUpdate = moment(newTime * 1000).format();
            $scope.listCurrency = listCurrency;
        }

        function validateCurrency(info) {
            if (!info.c || info.c.length < 3) return false;
            if (!info.s || info.s.length === 0) return false;
            if (!info.n || info.n.length > 100) return false;
            if (info.t !== 0 && info.t !== 1) return false;
            if (!info.r || info.r.length === 0) return false;
            if (!info.dm) return false;
            if (!info.gs) return false;

            return true;
        }

        var btnStatus = function (status) {
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

        $scope.generate = function () {
            var s = confirm(initQuest);
            if (s) {
                btnStatus(2);
                var tmpListCurrency = [];
               
                var listCurrency = localStorageService.get('currencyList');

                $scope.listCurrency.forEach(function (currency, index) {
                    delete currency.tmp;
                    tmpListCurrency.push(currency);
                });
                saveCurrency(tmpListCurrency, function (data) {
                    updateCurrency(tmpListCurrency);
                    btnStatus(3);
                    setTimeout(btnStatus(1), 3000);
                });
            }
        };

        function convertArrayToNameArray(arrayObj) {
            var newArray = [];
            for (var i = 0; i < arrayObj.length; i++) {
                newArray[arrayObj[i].n] = arrayObj[i];
            }
            return newArray;
        }

        $scope.getList = function (status) {
            if (status) {
                $http.post('/currency/get').success(function (data, err) {
                    localStorageService.add('currencyList', JSON.stringify(data.data));
                    $scope.lastUpdate = moment(data.data.t * 1000).format();
                    $scope.listCurrency = data.data.data;
                }).error(function (data, err) {
                    alert('Error');
                });
            } else {
                $scope.getList(1);
            }
        };

        $scope.addNew = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/currency/info.html',
                controller: ctrlAdd,
                resolve: {
                    currencyInfo: function () {
                        return {
                            t: 0,
                            r: 2
                        };
                    },
                    listCurrency: function () {
                        return $scope.listCurrency;
                    }
                }
            });

            modalInstance.result.then(function (lstCurrency) {
                updateCurrency(lstCurrency);
            }, function () { });
        };

        $scope.edit = function (currencyInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/currency/info.html',
                controller: ctrlEdit,
                resolve: {
                    currencyInfo: function () {
                        return currencyInfo;
                    }
                }
            });

            modalInstance.result.then(function () {
                updateCurrency($scope.listCurrency);
            });
        };

        $scope.delete = function (currency) {
            $scope.listCurrency.forEach(function (currencyInfo, key) {
                if (currencyInfo === currency) {
                    $scope.listCurrency.splice(key, 1);
                }
            });
            updateCurrency($scope.listCurrency);
        };

        var ctrlAdd = function ($scope, Page, $modalInstance, currencyInfo, listCurrency) {
            $scope.currencyInfo = currencyInfo;
            $scope.errorMsg = null;
            $scope.characters = [
                {
                    name: 'DOT',
                    value: '.'
                }, {
                    name: 'COMMA',
                    value: ','
                }, {
                    name: 'SPACE',
                    value: ' '
                }
            ];

            $scope.saveCurrency = function (currency) {
                var ok = validateCurrency(currency);
                if (ok) {
                    currency.tmp = true;
                    listCurrency.push(currency);
                    $modalInstance.close(listCurrency);
                } else {
                    $scope.errorMsg = 'Hãy kiểm tra lại thông tin tiền tệ.';
                }
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        var ctrlEdit = function ($scope, Page, $modalInstance, currencyInfo) {
            var tmpCurrencyInfo = currencyInfo;
            $scope.currencyInfo = currencyInfo;
            $scope.mode = 'edit';
            $scope.characters = [
                {
                    name: 'DOT',
                    value: '.'
                }, {
                    name: 'COMMA',
                    value: ','
                }, {
                    name: 'SPACE',
                    value: ' '
                }
            ];

            $scope.saveCurrency = function () {
                var ok = validateCurrency($scope.currencyInfo);
                if (ok) $modalInstance.close($scope.currencyInfo);
                else $scope.errorMsg = 'Hãy kiểm tra lại thông tin tiền tệ.';
            };
            $scope.cancel = function () {
                $scope.currencyInfo = tmpCurrencyInfo;
                $modalInstance.dismiss('cancel');
            };
        };
    })
}(angular));