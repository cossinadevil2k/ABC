(function ($a) {
    'use strict';

    $a.module('ML').controller('providerCategory', function ($scope, $rootScope, $http, $modal, $window, $routeParams) {
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Category List';

        $scope.countryProvider = $routeParams.provider; // country name
        $window.localStorage.setItem('countryName', $scope.countryProvider);

        $scope.categories = null;

        $scope.noContent = false;


        $scope.$on('$viewContentLoaded', function () {
            loadCategory();
        });

        function loadCategory() {
            var url = '/api/provider-category/getByCountry';
            var data = $routeParams.provider;
            $http({
                method: 'GET',
                url: url,
                params: { countryName: data }
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    $scope.categories = response.data.data;
                    if ($scope.categories.length < 1) {
                        $scope.noContent = true;
                    } else {
                        $scope.noContent = false;
                    }
                }
            }, function errorCallback(response) {
                alert(response);
            });
        }

        $scope.create = function () {

            var modalInstance = $modal.open({
                templateUrl: '/partials/file_provider/create_category.html',
                controller: ctrlCreate,
                resolve: {

                }
            });

            modalInstance.result.then(function (data) {

            });
        }

        function ctrlCreate($scope, $modalInstance) {

            $scope.provider = {};

            $scope.save = function () {

                var country = window.localStorage.getItem('countryName');
 
                var param = {};

                if ($scope.provider.name) {
                    param.name = $scope.provider.name;
                }

                if ($scope.provider.key_name) {
                    param.key_name = $scope.provider.key_name;
                }

                param.country = country;

                var url = '/api/category/createCacheCategory';

                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        loadCategory();
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.edit = function (category_name) {

            var modalInstance = $modal.open({
                templateUrl: '/partials/file_provider/edit_provider_category.html',
                controller: ctrlUpdate,
                resolve: {
                    category_name: function () {
                        return category_name;
                    }
                }
            });

            modalInstance.result.then(function (data) {

                var url = '/api/category/update';
                var param = {
                    'newData': data.newData,
                    'cachedData': data.cachedData
                };

                $http({
                    method: 'POST',
                    url: url,
                    data: { newData: param.newData, cachedData: param.cachedData }
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        loadCategory();
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });
            });
        }

        function ctrlUpdate($scope, $modalInstance, category_name) {

            loadOldProvider($scope, category_name);

            $scope.update = function (provider_edit) {

                var newData = {};

                // edit data
                var category = $scope.edit.category;
                newData.key_name = $scope.edit.key_name;
                newData.category = $scope.edit.category;

                // // cached data
                var cachedData = {};
                cachedData.key_name = $scope.cloned.key_name;
                cachedData.category = $scope.cloned.category;


                $modalInstance.close({ newData: newData, cachedData: cachedData });
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        function loadOldProvider($scope, key_name) {
            //let old data from key_name
            var url = '/api/provider-category/getByKeyName';
            var data = key_name;
            $http({
                method: 'GET',
                url: url,
                params: { key_name: data }
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    $scope.edit = response.data.data;
                    $scope.cloned = angular.copy(response.data.data);
                }
            }, function errorCallback(response) {
                alert(response);
            });
        }

        $scope.delete = function (category_name, country_name) {

            var param = {
                category_name: category_name,
                country_name: country_name
            }

            var ok = confirm("You will delete " + category_name + " ,are you sure?");
            if (ok) {
                var url = '/api/category/delete';

                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        loadCategory();
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });
            }
        }

    })

}(angular));
