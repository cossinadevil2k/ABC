(function ($a, location) {
    'use strict';
    $a.module('ML').controller('users', function ($scope, $rootScope, $location, $http, $routeParams, $modal) {
        var limit = 20;
        var offset = 0;
        $scope.env = env;
        $scope.isSearchPage = false;
        $scope.isFirstPage = true;
        $scope.isLastPage = false;
        $scope.totalUser = null;
        $scope.noResult = false;
        $scope.resultAmount = 0;
        $scope.subscription = null;

        $scope.isLoading = true;

        var searchMode = [{ value: 0, title: "Tìm tương đối" }, { value: 1, title: "Tìm chính xác" }];
        $scope.searchMode = searchMode[1];

        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'User Manager';

        $scope.tableName = 'User list';
        $scope.displaySearch = false;
        $scope.listUser = [];
        $scope.page = 1;
        $scope.indexList = offset;

        function checkFirstLastPage() {
            $scope.isFirstPage = $scope.page == 1;
            $scope.isLastPage = $scope.listUser.length < limit;
        }

        function searchController(condition, mode, limit, callback) {
            $scope.isLoading = true;
            $http.post('/user/search', {
                mode: mode,
                condition: condition,
                limit: limit
            }).success(function (data) {
                $scope.isLoading = false;
                if (data.error) {
                    alert(data.message);
                    return;
                } else {
                    callback(data);
                }

            }).error(function (data) {
                $scope.isLoading = false;
                callback(data);
            });
        }

        function getUserList(query, callback) {
            var url = '/user/list';
            var postData = { limit: query };
            if (query.subscription === 'no-linked-wallet' || query.subscription === 'no-premium') {
                url = '/user/list-no-subscription';
                postData = {
                    skip: query.skip,
                    limit: query.limit,
                    subscription: query.subscription
                };
            } else if (query.subscription) {
                url = '/user/list-subscription';
                postData = {
                    skip: query.skip,
                    limit: query.limit,
                    subscription: query.subscription
                };
            }

            $scope.isLoading = true;
            $scope.listUser = [];
            $http.post(url, postData)
                .success(function (data) {
                    $scope.isLoading = false;

                    if (data.error) {
                        alert(data.message);
                        return;
                    } else {
                        callback(data);
                    }
                }).error(function (data) {
                    $scope.isLoading = false;
                    callback(data);
                });
        }

        function editUser(userInfo, callback) {
            $http.post('/user/edit', userInfo).success(function (data) {
                callback(data);
            }).error(function (data) {
                callback(data);
            });
        }

        $scope.selectSearchMode = function (mode) {
            $scope.searchMode = searchMode[mode];
        };

        var getDevice = function (user) {
            $http.get('/info/device/' + user._id)
                .success(function (data) {
                    if (data && data !== false && data !== 'false') {
                        data.forEach(function (device) {
                            if (device.platform === 1) {
                                if (!user.hasAndroid) {
                                    user.hasAndroid = true;
                                }
                            } else if (device.platform === 2) {
                                if (!user.hasIos) {
                                    user.hasIos = true;
                                }
                            } else if (device.appId === 5) {
                                if (!user.hasWindows) {
                                    user.hasWindows = true;
                                }
                            } else if (device.appId === 4) {
                                if (!user.hasWp) {
                                    user.hasWp = true;
                                }
                            } else if (device.platform === 6) {
                                if (!user.hasOsx) {
                                    user.hasOsx = true;
                                }
                            } else if (device.platform === 7) {
                                if (!user.hasWeb) {
                                    user.hasWeb = true;
                                }
                            }
                        });
                    }
                })
                .error(function () {
                    alert("Error from server");
                });
        };

        var getCountry = function (user) {
            if (user.tags) {
                user.tags.forEach(function (tag) {
                    if (tag) {
                        if (tag.indexOf('country') !== -1) {
                            user.flag = tag.split(':')[1];
                        }
                    }
                });
            }
        };

        $scope.findAndExportCsv = function (keyword) {
            if (!keyword) return alert('Please type the keyword to search');

            var kw = keyword.trim();

            var ok = confirm("Confirm your keyword: '" + kw + "'. Are you sure?");
            if (!ok) return;

            if (kw.indexOf('tag ') != -1) {
                kw = kw.slice(4).toLowerCase();
                $http.post('/users/find-and-export-to-csv', { tags: kw })
                    .success(function (result) {
                        if (!result.s) alert("Export failed");
                        else {
                            $scope.isWaitingFile = true;
                            alertModal('The request is being processed. You will be notified whenever it done');
                        }
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            } else return alert('Keyword invalid');
        };

        $scope.search = function (keyword) {
            // $scope.page = 1;
            // offset = 0;
            // search(keyword.trim(), offset, limit);
            var url = '/users?search=' + encodeURIComponent(keyword);
            location.href = url;
        };

        $scope.searchKey = function (event, keyword) {
            // if (!$scope.isLoading) {
            //     var keyCode = window.event ? event.keyCode : event.which;
            //     if (keyCode === 13) $scope.search(keyword.trim());
            // }
            if (event.keyCode != 13) {
                return;
            }

            var url = '/users?search=' + encodeURIComponent(keyword);
            location.href = url;
        };

        function search(keyword, skip, limit) {
            if (!keyword) return;

            $scope.isLoading = true;
            $scope.listUser = [];
            if (keyword.indexOf('tag ') != -1) {
                var kw = keyword.slice(4).toLowerCase();
                $http.post('/user/find-by-tag', { tags: kw, limit: limit, skip: skip })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            $scope.isSearchPage = true;
                            $scope.noResult = result.d.length === 0;
                            $scope.listUser = result.d;
                            $scope.listUser.forEach(function (user, index) {
                                if (user) {
                                    getDevice(user);
                                    getCountry(user);
                                    //getSkipPassword(user);
                                } else $scope.listUser[index] = {};
                            });
                            if (result.t) $scope.resultAmount = result.t;
                            checkFirstLastPage();
                        }
                    }).error(function () {
                        alert('Error From Server');
                    });
            } else {
                var mode;

                if (validateEmail(keyword)) mode = 1;
                else mode = 0;

                var condition = {
                    // email: keyword.toLowerCase()
                    // email: keyword.toLowerCase()
                };

                if (keyword.toLowerCase().indexOf('userid:') !== -1) {
                    condition._id = keyword.split(":")[1].toLowerCase();
                    mode = 1;
                } else {
                    condition.email = keyword.toLowerCase();
                }

                var newLimit = {
                    limit: limit,
                    offset: skip
                };

                searchController(condition, mode, newLimit, function (data) {
                    $scope.isLoading = false;
                    if (data.error) $scope.errorMsg = data.error;
                    else {
                        $scope.isSearchPage = true;
                        $scope.noResult = data.data.length === 0;
                        data.data.forEach(function (user) {
                            getDevice(user);
                            getCountry(user);
                            //getSkipPassword(user);
                        });
                        $scope.listUser = data.data;
                        $scope.resultAmount = data.total;
                        checkFirstLastPage();
                    }
                });
            }
        }

        $scope.backToList = function () {
            // $scope.isSearchPage = false;
            // $scope.page = 1;
            // this.keyword = '';
            // offset = 0;
            // $scope.getListUser();
            location.href = '/users';
        };

        $scope.getListUser = function (options) {
            var query = {
                limit: limit,
                offset: offset
            };

            if (options) {
                if (options.subscription) query.subscription = options.subscription;
            }

            getUserList(query, function (data) {
                $scope.isSearchPage = false;
                $scope.noResult = data.data.length === 0;
                data.data.forEach(function (user) {
                    getDevice(user);
                    getCountry(user);
                });
                $scope.listUser = data.data;

                if (data.total) {
                    $scope.tableName += " (total: " + data.total + ")";
                }

                checkFirstLastPage();
            });
        };

        $scope.nextPage = function (status) {
            $scope.page += status;
            offset = ($scope.page - 1) * limit;
            if ($scope.isSearchPage) {
                search(this.keyword, offset, limit);
            } else {
                $scope.getListUser({ subscription: $scope.subscription });
            }
        };


        $scope.userDetailsPage = function (user) {
            location.href = "/info/user/" + user.email;
        };

        $scope.changePurchased = function (user) {
            var purchased = user.purchased ? false : true;
            var s = confirm('Bạn thực sự muốn thực hiện thay đổi này?');
            if (s) {
                user.purchased = purchased;
                editUser(user, function (data) { });
            }
        };

        $scope.changeCustomerSupport = function (user) {
            var s = confirm("Do you want to enable Customer Support Mode for " + user.email + "?");
            if (s) {
                //user.skipPassword = skiped;
                //editUser(user, function (data) {
                //
                //});
                $http.post('/user/set-customer-support', { userId: user._id, status: true })
                    .success(function (result) {
                        if (result.s) {
                            user.customerSupport = true;
                        } else alert("Setting customer support failed");
                    }).error(function () {
                        alert('Error From Server');
                    });
            }
        };

        $scope.changeSync = function (user) {
            var acceptSync = user.acceptSync ? false : true;
            var s = confirm('Bạn thực sự muốn thực hiện thay đổi này?');
            if (s) {
                user.acceptSync = acceptSync;
                user.sendMail = true;
                editUser(user, function (data) { });
            }
        };

        $scope.showSearchMobile = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/users/searchMobile.html',
                controller: modalController,
            });
        };

        var modalController = function ($scope, $modalInstance) {
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.search = function (keyword) {
                offset = 0;
                search(keyword.trim(), offset, limit);
                $scope.cancel();
            };
        };

        $scope.acceptPurchased = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/users/reason.html',
                controller: ctrlAcceptPurchased,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });

            modalInstance.result.then(function (user) {
                userInfo = user;
            }, function () { });
        };

        var ctrlAcceptPurchased = function ($scope, Page, $modalInstance, userInfo) {
            $scope.userInfo = userInfo;

            $scope.setPurchased = function (userInfo) {
                var purchased = userInfo.purchased ? false : true;
                var s = confirm('Bạn thực sự muốn thực hiện thay đổi này?');
                if (s) {
                    userInfo.purchased = purchased;
                    editUser(userInfo, function (data) {
                        if (!data.err) {
                            var action = "";

                            if (purchased) {
                                action = "free -> premium";
                            } else {
                                action = "premium -> free";
                            }

                            $http.post('/premiumlog/savelog', { email: userInfo.email, action: action })
                                .success(function (data) {
                                    if (data.s) {
                                        $modalInstance.close(userInfo);
                                    }
                                })
                                .error(function () {
                                    alert("Error while save admin action");
                                    $modalInstance.close(userInfo);
                                });
                        }
                    });
                }
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        function alertModal(message) {
            var modalInstance = $modal.open({
                templateUrl: 'alert.html',
                controller: ctrlAlert,
                resolve: {
                    message: function () {
                        return message;
                    }
                }
            });

            modalInstance.result.then(function () { });
        }

        function ctrlAlert($scope, $modalInstance, message) {
            $scope.message = message;

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        function validateEmail(email) {
            var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
            return re.test(email);
        }

        $scope.deleteUser = function (user, index) {
            if ($scope.env == 'production') return 0;

            var ok = confirm("User " + user.email + 'will be deleted, are you sure?');
            if (ok) {
                $http.post('/user/delete-user', { userId: user._id })
                    .success(function (result) {
                        if (result.s) $scope.listUser.splice(index, 1);
                        else alert("Delete user failed or you do not have permission to do this");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            }
        };

        init();

        function init() {
            var params = $location.search();
            // console.log('params ', params);
            if (params.search) {
                $scope.keyword = params.search;
                search(params.search, 0, limit);
            } else if (params.subscription) {
                if (['linked-wallet', 'premium', 'no-linked-wallet', 'no-premium'].indexOf(params.subscription) === -1) {
                    alert('Data not found');
                    return $scope.getListUser();
                }

                $scope.subscription = params.subscription;
                $scope.getListUser({ subscription: params.subscription });
            } else {
                $scope.getListUser();
            }
        }

    })
}(angular, location));
