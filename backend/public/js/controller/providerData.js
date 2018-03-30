(function ($a) {
    'use strict';

    $a.module('ML').controller('providerData', function ($scope, $rootScope, $http, $modal, $window, $routeParams) {
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Provider List In Category';
        $scope.providerParam = $routeParams.categoryId; // key name
        var key = $routeParams.categoryId;

        var countryName = $window.localStorage.getItem('countryName');
        $scope.countryName = countryName;
        $scope.categoryName = null;

        $scope.page = 1;
        var limit = 20;
        var limitPickMore = 10;

        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.pagePickMore = 1;
        $scope.noContent == true;

        // $scope.sortProvider = [];

        var SERVICE = {
            1: "saltedge",
            2: "finsify"
        };

        $scope.providers = null;

        $scope.$on('$viewContentLoaded', function () {
            loadProvider($scope.page);
            $scope.loadCategoryName();
        });

        function excutePage(scope) {
            if (scope.pre_page) {
                $scope.isFirstPage = false;
                // $scope.isLastPage = true;
            } else {
                $scope.isFirstPage = true;
            }

            if (scope.next_page) {
                $scope.isLastPage = false;
                // $scope.isFirstPage = true;
            } else {
                $scope.isLastPage = true;
            }
        }

        $scope.move = function (index, num) {
            var temp = $scope.providers[index];
            $scope.providers[index] = $scope.providers[index + num];
            $scope.providers[index + num] = temp;

            // $scope.sortProvider[$scope.provider[index].realId.toString()]
        }

        $scope.loadCategoryName = function () {
            var url = '/api/provider-category/getByKeyName';
            $http({
                method: 'GET',
                url: url,
                params: { key_name: key }
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    $scope.categoryName = response.data.data.category;
                }
            }, function errorCallback(response) {
                alert(response);
            });
        };

        function loadProvider(page) {
            var url = '/api/provider/browse';
            var skip = limit * (page - 1);

            var data = {
                key_name: key,
                country: countryName,
                skip: skip,
                limit: limit,
                page: $scope.page,
                type: countryName
            };

            $http({
                method: 'GET',
                url: url,
                params: data
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    $scope.providers = response.data.data;
                    if ($scope.providers.length > 0) {
                        $scope.noContent = false;
                    } else {
                        $scope.noContent = true;
                    }

                    excutePage(response.data);
                }
            }, function errorCallback(response) {
                alert(response);
            });
        };

        $scope.deleteProviderChoose = function (realId, categoryName) {
            var url = '/api/provider/delete';
            var param = {
                realId: realId,
                countryName: countryName,
                category: categoryName
            };
            var ok = confirm("You will delete " + realId + " ,are you sure?");
            if (ok) {
                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.data.status) {
                        loadProvider($scope.page);
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert('Error from server');
                });
            }
        }


        $scope.nextPage = function (num) {
            num = parseInt(num);
            $scope.page += num;

            loadProvider($scope.page);
        }

        $scope.saveProviderList = function () {
            var param = {};
            if (countryName) {
                param.country = countryName;
            }
            param.key_name = key;

            var provider_id_list = [];
            $scope.providers.forEach(function (item) {
                provider_id_list.push(item.realId);
            });
            param.provider_list = provider_id_list;

            var url = '/api/provider/create';

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    var landingUrl = "/provider-country-code/category/" + countryName;
                    location.href = landingUrl;
                } else {
                    alert(response.data.message);
                }
            }, function errorCallback(response) {
                alert('Error from server');
            });
        };

        $scope.pickMoreProvider = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/file_provider/pick_more.html',
                controller: ctrlPick,
                resolve: {

                }
            });

            modalInstance.result.then(function (data) {

            });
        };

        function ctrlPick($scope, $modalInstance) {

            $scope.pagePickMore = 1;
            $scope.isFirstPageMore = true;
            $scope.isLastPageMore = true;
            $scope.providerPick = [];
            $scope.answers = [];
            $scope.providerChoose = [];
            $scope.keyword = '';
            $scope.suggests = [];
            $scope.providersElse = []
            $scope.isChecked = [];
            var inSearchBound = [];

            function getProviderOld() {
                var url = '/api/provider/browse';

                var data = {
                    key_name: key,
                    country: countryName,
                    page: 1,
                    type: countryName
                };

                $http({
                    method: 'GET',
                    url: url,
                    params: data
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        getId(response.data.data);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });

            };

            function load(page) {
                var url = '/api/provider/browse';
                var skip = limitPickMore * (page - 1);

                var data = {
                    key_name: key,
                    country: countryName,
                    skip: skip,
                    limit: limitPickMore,
                    page: page,
                    type: countryName
                };

                $http({
                    method: 'GET',
                    url: url,
                    params: data
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {

                        $scope.providersElse = response.data.dataElse.data;
                        for (var provider of $scope.providersElse) {
                            inSearchBound.push(provider._id);
                            $scope.isChecked[provider._id] = false;
                        }

                        // clearCheckedBoxUI();
                        $scope.excutePageMore(response.data.dataElse);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });
            };

            function getId(providerChoose) {
                providerChoose.forEach(function (item) {
                    $scope.providerChoose.push(item.realId);
                });
            };
            getProviderOld();
            load($scope.pagePickMore);

            $scope.excutePageMore = function (scope) {
                if (scope.pre_page) {
                    $scope.isFirstPageMore = false;
                } else {
                    $scope.isFirstPageMore = true;
                }

                if (scope.next_page) {
                    $scope.isLastPageMore = false;
                } else {
                    $scope.isLastPageMore = true;
                }
            };

            $scope.nextPage = function (num) {
                $scope.pagePickMore += num;

                load($scope.pagePickMore);
            }

            $scope.selectProvider = function (realId) {
                if (!$scope.providerPick[realId]) {
                    // not exist
                    $scope.providerPick[realId] = true;
                    $scope.isChecked[realId] = true;
                } else {
                    // check dupicated
                    $scope.providerPick[realId] = false;
                    $scope.isChecked[realId] = false;
                }
            }


            $scope.save = function () {
                for (var provider in $scope.providerPick) {
                    if ($scope.providerPick[provider] === true) {
                        if ($scope.answers.indexOf(provider) === -1) {
                            $scope.answers.push(parseInt(provider));
                        }
                    }
                }
                if ($scope.answers.length > 0) {
                    var arrayResultProvider = [];
                    arrayResultProvider = $scope.providerChoose.concat($scope.answers);

                    var url = '/api/provider/create';
                    var param = {};
                    if (countryName) {
                        param.country = countryName;
                    }
                    param.key_name = key;

                    param.provider_list = arrayResultProvider;

                    $http({
                        method: 'POST',
                        url: url,
                        data: param
                    }).then(function successCallback(response) {
                        if (response.data.status === 1) {

                            $modalInstance.dismiss('cancel');
                            loadProvider(1);

                        } else {
                            alert(response.data.message);
                        }
                    }, function errorCallback(response) {
                        alert('Error from server');
                    });
                }
            };

            $scope.search = function (keySearch) {
                var url = '/api/provider/search';

                var param = {
                    searchKey: keySearch,
                    inSearchBound: inSearchBound,
                    type : countryName
                };

                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.data.status) {
                        $scope.providersElse = response.data.data;
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert('Error from server');
                });
            };

            $scope.liveSuggest = function (keyword, event) {
                if (keyword) {
                    var url = '/api/provider/liveSearch';

                    var param = {
                        keyword: keyword,
                        inSearchBound: inSearchBound,
                        type : countryName
                    };

                    if (event.keyCode === 13) {
                        // search
                        $scope.search(keyword);
                    } else {
                        // suggest
                        $http({
                            method: 'POST',
                            url: url,
                            data: param
                        }).then(function successCallback(response) {
                            if (response.data.status) {
                                $scope.suggests = response.data.data;
                            } else {
                                alert(response.data.message);
                            }
                        }, function errorCallback(response) {
                            alert('Error from server');
                        });
                    }
                }
            };

            $scope.choose = function (name) {
                document.getElementById("txtKeyword").value = "";
                document.getElementById("txtKeyword").value = name;
                $scope.keyword = document.getElementById("txtKeyword").value;

            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };
    })
}(angular));
