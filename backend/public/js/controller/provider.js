(function ($a) {
    'use strict';

    $a.module('ML').controller('provider', function ($scope, $rootScope, $modal, $http) {
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Provider';

        $scope.$on('$viewContentLoaded', function () {
            loadProvider();
            selectCountry();
        });

        $scope.providers = null;
        $scope.countries = null;
        $scope.provider = {};
        $scope.noContent = false;

        var getCountryName = function (country_code) {
            var country_name = null;
            $scope.countries.forEach(country => {
                if (country.code2l === country_code) {
                    country_name = country.name;
                }
            });

            return country_name;
        }

        function loadProvider() {
            var url = '/api/provider_cache/browse';
            $http({
                method: 'GET',
                url: url
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    var provider_list = response.data.data;
                    $scope.providers = provider_list;
                    if ($scope.providers.length < 1) {
                        $scope.noContent = true;
                    } else {
                        $scope.noContent = false;
                    }
                }
            }, function errorCallback(response) {
                alert("Error from server");
            });
        };

        function selectCountry() {
            var url = '/api/country/browse';
            $http({
                method: 'GET',
                url: url
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    var countries = response.data.data;

                    $scope.countries = countries;
                }
            }, function errorCallback(response) {
                alert("Error from server");
            });
        };

        $scope.create = function (country_code) {

            var modalInstance = $modal.open({
                templateUrl: '/partials/file_provider/create_provider.html',
                controller: ctrlCreate,
                resolve: {
                    countries: function () {
                        return $scope.countries;
                    },
                    country_code: function () {
                        return country_code;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        };

        function ctrlCreate($scope, $modalInstance, countries, country_code) {
            $scope.countries = countries;
            $scope.provider = {};

            $scope.createProvider = function (country_code) {
                if (!country_code) {
                    alert('this feild is not empty');
                    return;
                }

                var ccode = country_code.toLowerCase();

                var data = {
                    country_code: ccode
                };

                //get country name from country code
                var country_name = getCountryName(country_code);

                if (country_name) {
                    data.country_name = country_name
                }

                var url = '/api/provider_cache/create';

                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        loadProvider()
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert("Error from server");
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.build = function () {
            var url = '/api/provider-country-code/build';

            $http({
                method: 'POST',
                url: url,
                data: {}
            }).then(function successCallback(response) {
                alert(response.data.message);
            }, function errorCallback(response) {
                alert("Error from server");
            });
        };

        $scope.deleteCategory = function (provider) {
            var param = {
                provider: provider
            }
            var ok = confirm("You will delete " + provider + " ,are you sure?");
            if (ok) {
                var url = '/api/provider_cache/delete';

                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        loadProvider();
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert("Error from server");
                });
            }
        };

    })

}(angular));
