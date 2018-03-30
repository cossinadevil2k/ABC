(function ($a) {
    $a.module('ML').controller('register_dev_ml', function ($scope, $rootScope, $modal, $http) {
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Open API';


        $scope.page = 1;
        var perPage = 10;
        $scope.partners = [];
        $scope.noContent = true;

        $scope.isFirstPage = true;
        $scope.isLastPage = true;

        var STATUS_MODE = {
            PENDING: 0,
            DONE: 1
        };

        $scope.$on('$viewContentLoaded', function () {
            loadPartner($scope.page);
        });

        function excutePage(scope) {
            if (!scope.pre_page) {
                $scope.isFirstPage = true;
                // $scope.isLastPage = false;
            } else {
                $scope.isFirstPage = false;
            }

            if (!scope.next_page) {
                $scope.isLastPage = true;
                // $scope.isFirstPage = false;
            } else {
                $scope.isLastPage = false;
            }
        }

        function loadPartner(page) {
            var url = '/api/register_dev_ml/browse';

            // var page = $scope.page;
            var params = {
                page: page,
                perPage: perPage
            };

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.partners = response.data.data;
                        if ($scope.partners.length < 1) {
                            $scope.noContent = true;
                        } else {
                            $scope.noContent = false;
                        }
                        excutePage(response.data);
                    } else {
                        alert('Get list partner error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        };

        $scope.nextPage = function (int) {
            $scope.page += int;

            loadPartner($scope.page);
        };

        $scope.accept = function (partner, flag) {
            var url = '/api/register_dev_ml/accept';

            var data = {
                _id: partner._id,
                flag: flag
            };

            if (flag == false) {
                // denine
                var ok = confirm("You will denine " + partner.email + ", are you sure?");
                if (ok) {
                    $http({
                        method: 'POST',
                        url: url,
                        data: data
                    }).then(function successCallback(response) {
                        if (response.status == 200) {
                            if (response.data.status) {
                                loadPartner($scope.page);
                            } else {
                                alert('Update partner error');
                            }
                        }
                    }, function errorCallback(response) {
                        alert(response.status);
                    });
                }
            } else {
                // approve
                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadPartner($scope.page);
                        } else {
                            alert('Update partner error');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });
            }
        };

        $scope.filter = function (type) {
            var url = '/api/register_dev_ml/filter';

            var data = {
                type: type
            }

            $http({
                method: 'POST',
                url: url,
                data: data
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.partners = response.data.data;
                    } else {
                        alert('Filter partner error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        }

        $scope.showSecret = function (partner) {
            partner.showSecret = true;
        };

        $scope.hideSecret = function (partner) {
            partner.showSecret = false;
        };

        $scope.detail = function (item) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/open_api/detail.html',
                controller: ctrlDetail,
                resolve: {
                    scope: function () {
                        return item;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        };

        function ctrlDetail($scope, $modalInstance, scope) {
            $scope.init = function () {
                if (scope.status == 0) {
                    $scope.status = 'Pending';
                } else if (scope.status == 1) {
                    $scope.status = 'Accepted';
                } else if (scope.status == 2) {
                    $scope.status = 'Denied';
                }

                $scope.partnerDetail = scope;
                $scope.itemDetailName = scope.partnerName;
            }();

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        };


    })
}(angular));
