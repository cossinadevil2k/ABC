(function ($a) {
    'use strict';

    $a.module('ML').controller('searchQueryDetails', function ($scope, $rootScope, $http, $modal, $location) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Search-query Details';

        $scope.title = '';
        $scope.isPreviewLoading = false;
        $scope.previewDevice = [];
        $scope.previewUser = [];
        $scope.deviceCount = 0;
        $scope.userCount = 0;
        $scope.pageDevice = 1;
        $scope.pageUser = 1;
        $scope.isFirstPageDevice = true;
        $scope.isFirstPageUser = true;
        $scope.isLastPageDevice = true;
        $scope.isLastPageUser = true;
        $scope.isSaving = false;
        var limit = 10;
        var tempKey;
        $scope.previewMode = 'device';
        $scope.isEditing = false;

        initInfo();

        function getInfo(id) {
            $http.post('/search-query/get-one', { id: id })
                .success(function (result) {
                    if (result.s) {
                        $scope.queryInfo = result.d;
                        $scope.isEditing = true;
                        $scope.title = $scope.queryInfo.name + " query details";
                    }
                    else alert("Get search query failed");
                })
                .error(function () {
                    alert("Error From Server");
                });
        }

        function initInfo() {
            var queryId = $location.search().id;
            if (queryId) {
                getInfo(queryId);
            }
            else {
                $scope.queryInfo = {
                    type: 'device',
                    query: ''
                };
                $scope.title = 'Add new search-query';
            }
        }

        function getDevice(user) {
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
        }

        function getCountry(user) {
            if (user.tags) {
                user.tags.forEach(function (tag) {
                    if (tag.indexOf('country') !== -1) {
                        user.flag = tag.split(':')[1];
                    }
                });
            }
        }

        function getPreviewMongo(type, query, skip, limit, mode) {
            $scope.isPreviewLoading = true;

            $http.post('/search-query/query-preview-mongo', { type: type, query: query, limit: limit, skip: skip })
                .success(function (result) {
                    $scope.isPreviewLoading = false;
                    console.log(result);
                    if (result.s) {
                        if (result.t && result.t.user) $scope.userCount = result.t.user;
                        if (result.t && result.t.device) $scope.deviceCount = result.t.device;
                        if (result.d && result.d.device && (mode === 'all' || mode === 'device')) {
                            $scope.previewDevice = result.d.device;
                            $scope.previewDevice.forEach(function (device, index) {
                                if (!device) $scope.previewDevice[index] = {};
                            });
                        }
                        if (result.d && result.d.user && (mode === 'all' || mode === 'user')) {
                            $scope.previewUser = result.d.user;
                            $scope.previewUser.forEach(function (user, index) {
                                if (user) {
                                    getDevice(user);
                                    getCountry(user);
                                } else $scope.previewUser[index] = {}
                            });
                        }
                        $scope.previewMode = $scope.queryInfo.type;
                        checkPage();
                    } else alert("Preview query failed");
                })
                .error(function () {
                    $scope.isPreviewLoading = false;
                    alert("Error From Server");
                });
        }

        function getPreview(type, query, skip, limit, mode) {
            $scope.isPreviewLoading = true;

            $http.post('/search-query/query-preview', { type: type, query: query, limit: limit, skip: skip })
                .success(function (result) {
                    $scope.isPreviewLoading = false;
                    if (result.s) {
                        if (result.t && result.t.user) $scope.userCount = result.t.user;
                        if (result.t && result.t.device) $scope.deviceCount = result.t.device;
                        if (result.d && result.d.device && (mode === 'all' || mode === 'device')) {
                            $scope.previewDevice = result.d.device;
                            $scope.previewDevice.forEach(function (device, index) {
                                if (!device) $scope.previewDevice[index] = {};
                            });
                        }
                        if (result.d && result.d.user && (mode === 'all' || mode === 'user')) {
                            $scope.previewUser = result.d.user;
                            $scope.previewUser.forEach(function (user, index) {
                                if (user) {
                                    getDevice(user);
                                    getCountry(user);
                                } else $scope.previewUser[index] = {}
                            });
                        }
                        $scope.previewMode = $scope.queryInfo.type;
                        checkPage();
                    } else alert("Preview query failed");
                })
                .error(function () {
                    $scope.isPreviewLoading = false;
                    alert("Error From Server");
                });
        }

        function checkPage() {
            $scope.isFirstPageDevice = $scope.pageDevice === 1;
            $scope.isFirstPageUser = $scope.pageUser === 1;
            $scope.isLastPageDevice = $scope.previewDevice.length < limit;
            $scope.isLastPageUser = $scope.previewUser.length < limit;
        }

        $scope.selectPreview = function (mode) {
            $scope.previewMode = mode;
        };

        $scope.detectSocial = function (userTags) {
            if (!userTags) return null;
            if (userTags.indexOf('facebook') != -1) return 'facebook';
            if (userTags.indexOf('google') != -1) return 'google';
        };

        $scope.previewMongo = function (type, query) {
            if (!type || !query) return 0;
            $scope.pageDevice = 1;
            $scope.pageUser = 1;
            var skip = 0;

            getPreviewMongo(type, query, skip, limit, 'all');
        };

        $scope.preview = function (type, query) {
            if (!type || !query) return 0;
            $scope.pageDevice = 1;
            $scope.pageUser = 1;
            var skip = 0;
            getPreview(type, query, skip, limit, 'all');
        };

        $scope.save = function (type, query, name) {
            if (!type || !query) return 0;

            if ($scope.isEditing) {
                var ok = confirm("Are you sure?");
                if (ok) edit();
            } else {
                createNew();
            }

            function createNew() {
                if (query.indexOf('limit:') === -1) {
                    return alert('Please set limit for the query');
                }

                $scope.isSaving = true;
                $http.post('/search-query/save', { type: type, query: query, name: name, keyRedis: tempKey })
                    .success(function (result) {
                        $scope.isSaving = false;
                        if (result.s) {
                            var createAnother = confirm("Saving search-query is being process. Do you wanna create another search-query?");
                            if (createAnother) initInfo();
                            else window.location.href = '/search-query';
                        }
                        else alert("Save search-query failed");
                    })
                    .error(function () {
                        $scope.isSaving = false;
                        alert("Error From Server");
                    });
            }

            function edit() {
                alert("Edit");
            }
        };

        $scope.regen = function (query) {
            $scope.isLoading = true;
            $http.post('/search-query/regenerate', { query: query })
                .success(function (result) {
                    $scope.isLoading = false;
                    if (result.s) {
                        initInfo();
                        alert("Regenerate search-query is being process");
                    }
                    else alert("Regen new result failed");
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        };

        $scope.nextPreviewPage = function (value, type, query, mode) {
            if (mode === 'device') {
                $scope.previewMode = 'device';
                $scope.pageDevice += value;
                var skip = limit * ($scope.pageDevice - 1);
                getPreview(type, query, skip, limit, mode);
            } else {
                //user
                $scope.previewMode = 'user';
                $scope.pageUser += value;
                var skip = limit * ($scope.pageUser - 1);
                getPreview(type, query, skip, limit, mode);
            }
        };

        $scope.exportToCsv = function (query) {
            $scope.isLoading = true;
            console.log(query);
            if (query.queryMode === 'elastic') {
                $http.post('/search-query/export-full', { tags: query.query })
                    .success(function (result) {
                        $scope.isLoading = false;

                        if (!result.s) {
                            alert("Export failed");
                        } else {
                            alert('The request is being processed. You will be notified whenever it done');
                        }
                    })
                    .error(function () {
                        $scope.isLoading = false;

                        alert('Error From Server');
                    });
            } else if (query.queryMode === 'mongo') {
                $http.post('/search-query/export-full-mongo', { tags: query.query_mongo })
                    .success(function (result) {
                        $scope.isLoading = false;

                        if (!result.s) {
                            alert("Export failed");
                        } else {
                            alert('The request is being processed. You will be notified whenever it done');
                        }
                    })
                    .error(function () {
                        $scope.isLoading = false;

                        alert('Error From Server');
                    });
            }
        };

    });
}(angular));
