

(function ($a) {
    'use strict';
    $a.module('ML').controller('email_push_automation', function ($scope, $rootScope, $modal, $routeParams, $http, $q) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Automation';

        $scope.page = 1;
        var limit = 20;

        $scope.auto = {};
        $scope.search_queries = {};
        $scope.templates = {};
        $scope.email_push_automation = {};
        $scope.noContent = false;
        $scope.push_notification = {};
        $scope.autoEdit = {};
        $scope.suggests = [];

        $scope.isFirstPage = true;
        $scope.isLastPage = true;

        $scope.automation_types = [
            {
                "name": "Email",
                "value": 1
            },
            {
                "name": 'Push Notificaiton',
                "value": 2
            }
        ];

        $scope.$on('$viewContentLoaded', function () {
            // console.log('Automation Controller');

            $q.all([
                loadContent($scope.page),
                selectSearchQuery(),
                selectTemplate(),
                loadPushNotification(),
                selectQueryQuick($routeParams),
                loadCampaigns(),
                loadGroups()
            ]).then(function (response) {
                var loadContentResolve = response[0];
                var searchQueryResolve = response[1];
                var templateResolve = response[2];
                var pushNotification = response[3];
                var selectQueryQuickResponse = response[4];
                var campaigns = response[5];
                var groups = response[6];

                $scope.isSearchQueryChoosen = false;
                $scope.auto = {};
                $scope.email_push_automation = loadContentResolve;
                $scope.templates = templateResolve;
                $scope.push_notification = pushNotification;
                $scope.campaigns = campaigns;
                $scope.groups = groups;

                if ($routeParams.modal) {
                    console.log('gia tri routerParams:', $routeParams.modal)
                    $scope.search_queries = selectQueryQuickResponse;
                    $scope.search_query = $scope.search_queries[0];
                    $scope.isSearchQueryChoosen = true;
                    $scope.create();
                } else {
                    $scope.search_queries = searchQueryResolve;
                }
            })
        });

        $scope.filterItem = function (condition) {

            var url = '/api/automation/filter';

            var param = condition;

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.email_push_automation = response.data.data;
                        if ($scope.email_push_automation.length < 1) {
                            $scope.noContent = true;
                        } else {
                            $scope.noContent = false;
                        }
                        excutePage(response.data);
                    } else {
                        alert('Get list group error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });
        }

        function loadGroups() {
            var deferred = $q.defer();
            var url = '/api/group/browse';
            var param = {
                skip: 0,
                limit: 10000
            }

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.groups = response.data.data
                        deferred.resolve(response.data.data);
                    } else {
                        deferred.reject();
                        alert('Get list group error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;
        }

        function loadCampaigns() {
            var deferred = $q.defer();
            var url = '/api/campaign-marketing/browse';
            var param = {
                skip: 0,
                limit: 10000
            }

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.campaigns = response.data.data;
                        deferred.resolve(response.data.data);
                    } else {
                        deferred.reject();
                        alert('Get list campaign error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;
        }

        function selectQueryQuick(routeParams) {
            var deferred = $q.defer();
            var search_queries = new Array();

            if (routeParams.modal) {
                if (routeParams.id) {
                    var search_query = routeParams.id;
                    findSearchQueryById(search_query).then(function (searchQuery) {
                        search_queries.push(searchQuery);

                        deferred.resolve(search_queries);
                    });
                } else {
                    deferred.resolve(search_queries);
                }
            } else {
                deferred.resolve(search_queries);
            }

            return deferred.promise;

        }

        function findSearchQueryById(searchQueryId) {
            var url = '/search-query/get-one';
            var param = {
                id: searchQueryId
            }

            var deferred = $q.defer();

            $http({
                method: 'POST',
                url: url,
                data: param
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.s) {
                        deferred.resolve(response.data.d);

                    } else {
                        deferred.reject();
                        alert('Get search query error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;
        }


        $scope.search = function (keyword, filter) {
            if (keyword) {
                var url = '/api/automation/search';

                var params = {
                    keyword: keyword,
                    type: filter.type
                };

                $http({
                    method: 'POST',
                    url: url,
                    data: params
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            if (filter.type === "1") {
                                $scope.campaigns = response.data.data;
                                if ($scope.campaigns.length < 1) {
                                    $scope.noContent = true;
                                } else {
                                    $scope.noContent = false;
                                }
                            } else if (filter.type === "2") {
                                $scope.groups = response.data.data;
                                if ($scope.groups.length < 1) {
                                    $scope.noContent = true;
                                } else {
                                    $scope.noContent = false;
                                }
                            } else if (filter.type === "3") {
                                $scope.email_push_automation = response.data.data;
                                if ($scope.email_push_automation.length < 1) {
                                    $scope.noContent = true;
                                } else {
                                    $scope.noContent = false;
                                }
                            }
                            excutePage(response.data);
                        } else {
                            alert('Get list email push automation error');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });
            }
        }

        $scope.choose = function (name) {
            document.getElementById("txtKeyword").value = "";
            document.getElementById("txtKeyword").value = name;
            $scope.keyword = document.getElementById("txtKeyword").value;
            document.getElementById("txtKeyword").value = "";
        }


        $scope.searchKey = function (event, keyword, filter) {

            if (keyword) {
                var url = '/api/automation/liveSearch';

                var param = {
                    keyword: keyword,
                    type: filter.type
                };

                if (event.keyCode === 13) {
                    // search
                    $scope.search(keyword, filter);
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
        }

        $scope.nextPage = function (num) {
            $scope.page += num;

            loadContent($scope.page);
        };

        function excutePage(scope) {

            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.email_push_automation.length < limit;

        };

        function generateTime() {
            var arrayTime = [];
            for (var i = 0; i < 24; i++) {
                var hour = i.toString();
                if (0 <= i && i < 10) {
                    hour = '0' + i.toString();
                }
                for (var j = 0; j < 2; j++) {
                    var mintute;
                    if (j === 0) {
                        mintute = '00';
                    } else if (j === 1) {
                        mintute = '30';
                    }

                    var time = hour + ':' + mintute;
                    arrayTime.push(time);
                }
            }

            return arrayTime;
        }

        function loadContent(page) {
            var url = '/api/email_push_automation/browse';
            var skip = limit * (page - 1);
            var params = {
                skip: skip,
                limit: limit,
                page: page
            };

            var deferred = $q.defer();

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {

                        $scope.email_push_automation = response.data.data;
                        if ($scope.email_push_automation.length < 1) {
                            $scope.noContent = true;
                        } else {
                            $scope.noContent = false;
                        }
                        excutePage(response.data);
                        deferred.resolve(response.data.data);
                    } else {
                        deferred.reject();
                        alert('Get list email push automation error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;

        };

        function selectSearchQuery() {
            var url = '/search-query/get';
            // var skip = limit * ($scope.page - 1);
            var params = {
                skip: 0,
                limit: limit
            };
            $scope.isLoading = true;
            var deferred = $q.defer();

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.s) {
                        $scope.search_queries = response.data.d;
                        deferred.resolve(response.data.d);
                    } else {
                        deferred.reject();
                        alert('Get list search query error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;

        };

        function selectTemplate() {
            var url = '/api/template/browse';
            var params = {
                'page': $scope.page,
                'limit': limit
            };

            var deferred = $q.defer();

            $http({
                method: 'POST',
                url: url,
                data: params
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        $scope.templates = response.data.data.records;
                        deferred.resolve(response.data.data.records);
                    } else {
                        deferred.reject();
                        alert('Get list tempalte error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;

        };

        function loadPushNotification() {
            var url = '/message/get';
            var deferred = $q.defer();

            $http({
                method: 'POST',
                url: url
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (!response.data.err) {
                        $scope.push_notification = response.data.data;
                        deferred.resolve(response.data.data);
                    } else {
                        deferred.reject();
                        alert('Get list push notification error');
                    }
                }
            }, function errorCallback(response) {
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;

        };

        $scope.changeDisabled = function (automation) {
            var url = '/api/email_push_automation/enable';
            var data = {};

            data._id = automation._id;
            data.isEnabled = !automation.isEnabled;

            $http({
                method: 'POST',
                url: url,
                data: data
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        loadContent($scope.page);
                    } else {
                        alert('update error');
                    }
                }
            }, function errorCallback(response) {
                alert(response.status);
            });

        };

        $scope.delete = function (automation) {
            var ok = confirm("You will delete " + automation.name + ", are you sure?");
            if (ok) {
                var url = '/api/email_push_automation/delete';
                var data = {};
                data._id = automation._id;

                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadContent($scope.page);
                        } else {
                            alert('update error');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });
            }
        };

        $scope.detail = function (automation) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/detail.html',
                controller: ctrlDetail,
                resolve: {
                    scope: function () {
                        return automation;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        }

        function ctrlDetail($scope, $modalInstance, scope) {
            $scope.init = function () {
                if (scope.type == 1) {
                    $scope.type = 'Email';
                } else if (scope.type == 2) {
                    $scope.type = 'Push Notification';
                }
                $scope.autoDetail = scope;
                $scope.itemDetailName = scope.name;
            }();

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }

        $scope.edit = function (automation) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/edit.html',
                controller: ctrlUpdate,
                resolve: {
                    scope: function () {
                        return automation;
                    },
                    searchQuery: function () {
                        return $scope.search_queries;
                    },
                    template: function () {
                        return $scope.templates;
                    },
                    push_notification: function () {
                        return $scope.push_notification;
                    },
                    automation_types: function () {
                        return $scope.automation_types;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        };

        function ctrlUpdate($scope, $modalInstance, scope, searchQuery, template, push_notification, automation_types) {

            $scope.init = function () {
                $scope.autoEdit = scope;
                $scope.search_queries = searchQuery;
                $scope.templates = template;
                $scope.push_notification = push_notification;
                $scope.automation_types = automation_types;
                if (scope.metadata) {
                    $scope.autoEdit.push = scope.metadata;
                }
                $scope.time = generateTime();
            }();

            $scope.update = function (autoEdit) {
                var url = '/api/email_push_automation/update';
                var data = {};
                data._id = autoEdit._id;
                if (autoEdit.searchQuery) {
                    data.searchQuery = autoEdit.searchQuery;
                }

                if (autoEdit.metadata.template) {
                    var templateObject = autoEdit.metadata.template;

                    if (typeof templateObject !== 'object') {
                        templateObject = JSON.parse(templateObject);
                    }


                    if (!templateObject.template_uid || !templateObject.screenshot && templateObject.name) {
                        for (var i = 0; i < $scope.templates.length; i++) {
                            if ($scope.templates[i].name === templateObject.name) {
                                templateObject = $scope.templates[i];

                                if (typeof templateObject !== 'object') {
                                    templateObject = JSON.parse(templateObject);
                                }

                                data.template = {
                                    'id': templateObject.template_uid,
                                    'name': templateObject.name,
                                    'thumbUrl': templateObject.screenshot
                                };
                            }
                        }
                    } else {
                        data.template = {
                            'id': templateObject.template_uid,
                            'name': templateObject.name,
                            'thumbUrl': templateObject.screenshot
                        };
                    }
                }

                if (autoEdit.name) {
                    data.name = autoEdit.name;
                }

                if (autoEdit.metadata.subject) {
                    data.subject = autoEdit.metadata.subject;
                }

                if (autoEdit.metadata.fromEmail) {
                    data.fromEmail = autoEdit.metadata.fromEmail;
                }

                if (autoEdit.metadata.fromName) {
                    data.fromName = autoEdit.metadata.fromName
                }

                if (autoEdit.metadata.replyTo) {
                    data.replyTo = autoEdit.metadata.replyTo;
                }

                if (autoEdit.mode) {
                    data.mode = autoEdit.mode;
                }

                if (autoEdit.type) {
                    data.type = autoEdit.type;
                }
                if (autoEdit.metadata.hourRun) {
                    data.hourRun = autoEdit.metadata.hourRun;
                }

                if (autoEdit.push) {
                    data.pushObject = autoEdit.push;
                }

                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadContent($scope.page);
                        } else {
                            alert('update error');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }

        }

        $scope.create = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/create_new.html',
                controller: ctrlCreate,
                resolve: {
                    selectSearchQuery: function () {
                        return $scope.search_queries;
                    },
                    selectTemplate: function () {
                        return $scope.templates;
                    },
                    auto: function () {
                        return $scope.auto;
                    },
                    push_notification: function () {
                        return $scope.push_notification;
                    },
                    search_query_choose: function () {
                        return $scope.search_query || {};
                    },
                    campaigns: function () {
                        return $scope.campaigns;
                    },
                    groups: function () {
                        return $scope.groups;
                    },
                    automation_types: function () {
                        return $scope.automation_types;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        };

        function ctrlCreate($scope, $modalInstance, selectSearchQuery, selectTemplate, auto, push_notification, search_query_choose, campaigns, groups, automation_types) {

            $scope.init = function () {
                $scope.search_queries = selectSearchQuery;
                $scope.templates = selectTemplate;
                $scope.push_notification = push_notification;
                $scope.time = generateTime();
                $scope.initTime = $scope.time[16].toString();
                $scope.auto = auto;
                $scope.campaigns = campaigns;
                $scope.groups = groups;
                $scope.automation_types = automation_types;

                if ($scope.search_queries.length === 1) {
                    $scope.search_query = search_query_choose;
                    auto.search_query = $scope.search_query._id;
                }
            }();

            $scope.save = function (auto) {
                var url = '/api/email_push_automation/create';
                
                if (auto.template) {
                    auto.template = JSON.parse(auto.template);
                }
                var params = {
                    name: auto.name,
                    search_query: auto.search_query,
                    mode: auto.mode,
                    type: auto.type,
                    hourRun: auto.hourRun || '08:00',
                    campaign: auto.campaign,
                    group: auto.group,
                    tracking: auto.tracking
                };

                if (auto.type == 1) {
                    // email
                    params.subject = auto.subject;
                    params.fromName = auto.fromName;
                    params.fromEmail = auto.fromEmail;
                    params.replyTo = auto.replyTo;
                    params.template_info = {
                        id: auto.template.template_uid,
                        name: auto.template.name,
                        thumb: auto.template.screenshot
                    }
                } else if (auto.type == 2) {
                    // push noti
                    if (typeof auto.push == 'string') {
                        params.pushObject = JSON.parse(auto.push);
                    } else {
                        params.pushObject = auto.push;
                    }
                }
                
                $http({
                    method: 'POST',
                    url: url,
                    data: params
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadContent($scope.page);
                        } else {
                            alert('Save automation error');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });

                $modalInstance.close();
            }

            $scope.createCampaign = function () {
                var modalInstance = $modal.open({
                    animation: true,
                    templateUrl: '/partials/email_push_automation/create_campaign.html',
                    controller: 'campaignCreateModal',
                    resolve: {

                    }
                });

                modalInstance.result.then(function (data) {
                    // console.log('create campaign result ', data);
                    auto.campaign = data._id;
                    auto.type = data.type;
                    $scope.campaigns = [];
                    $scope.campaigns.push(data);
                });
            }

            $scope.createGroup = function () {
                var modalInstance = $modal.open({
                    animation: true,
                    templateUrl: '/partials/email_push_automation/create_group.html',
                    controller: 'groupCreateModal',
                    resolve: {

                    }
                });

                modalInstance.result.then(function (data) {
                    // console.log('create group result ', data);
                    auto.group = data._id;
                    $scope.groups = [];
                    $scope.groups.push(data);
                });
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }


        $scope.duplicateCampaign = function (camp) {

            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/duplicate_campaign.html',
                controller: ctrDupCamp,
                resolve: {
                    campaign: function () {
                        return camp;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        }

        function ctrDupCamp($scope, $modalInstance, campaign) {
            $scope.createCopies = function (duplicate) {
                var url = '/api/group/duplicateCampaign'
                var param = {
                    _id: campaign._id,
                    copies: duplicate.number
                }

                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadCampaigns();
                        } else {
                            alert('Update error!')
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.alert)
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }

        $scope.detailCampaign = function (camp) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/detail_campaign.html',
                controller: ctrDetailCamp,
                resolve: {
                    scope: function () {
                        return camp;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        }

        function ctrDetailCamp($scope, $modalInstance, scope) {
            $scope.init = function () {
                $scope.CampDetail = scope;
            }();
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel')
            }
        }


        $scope.editCampaign = function (camp) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/edit_campaign.html',
                controller: ctrUpdateCampaign,
                resolve: {
                    scope: function () {
                        return camp;
                    }
                }
            });
            modalInstance.result.then(function (data) {

            });
        }
        function ctrUpdateCampaign($scope, $modalInstance, scope) {
            $scope.init = function () {
                $scope.EditCampaign = scope;
            }();

            $scope.updateCampaign = function (EditCampaign) {
                var url = '/api/campaign/update';
                var data = {};
                data._id = EditCampaign._id;
                if (EditCampaign.name) {
                    data.name = EditCampaign.name;
                }
                if (EditCampaign.type) {
                    data.type = EditCampaign.type;
                }

                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadCampaigns();
                        } else {
                            alert('Update error!')
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.alert)
                });

                $modalInstance.close();
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }

        }


        $scope.deleteCampaign = function (camp) {
            var ok = confirm("You will delete " + camp.name + " are you sure?");
            if (ok) {
                var url = '/api/campaign/delete';
                var data = {};
                data._id = camp._id;
                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadCampaigns();
                        } else {
                            alert('Delete error!')
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status)
                })
            }
        }

        $scope.duplicateGroup = function (group) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/duplicate_group.html',
                controller: ctrDupGroup,
                resolve: {
                    group: function () {
                        return group;
                    }
                }
            });
            modalInstance.result.then(function (data) {

            });
        }

        function ctrDupGroup($scope, $modalInstance, group) {

            $scope.createCopies = function (duplicate) {
                var url = '/api/group/duplicategroup';
                var data = {};
                data._id = group._id;
                data.copies = duplicate.number;

                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadGroups();
                        } else {
                            alert('Duplicate Error!')
                        }
                    }
                }, function errorCallback(response) {
                    alert(response);
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('calcel')
            }
        }


        $scope.duplicateAuto = function (automation) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/duplicate_auto.html',
                controller: ctrDupGroup,
                resolve: {
                    automation: function () {
                        return automation;
                    },
                    campaigns: function () {
                        return $scope.campaigns;
                    },
                    groups: function () {
                        return $scope.groups;
                    }
                }
            });
            modalInstance.result.then(function (data) {

            });
        }

        function ctrDupGroup($scope, $modalInstance, automation, campaigns, groups) {
            $scope.init = function () {
                $scope.campaigns = campaigns;
                $scope.groups = groups;
            }();

            $scope.createCopies = function (duplicate) {
                var url = '/api/automation/duplicate';
                var param = {
                    auto: JSON.stringify(automation),
                    campaign: duplicate.campaign,
                    group: duplicate.group,
                    number: duplicate.number
                };

                $http({
                    method: 'POST',
                    url: url,
                    data: param
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadContent($scope.page);
                        } else {
                            alert('Duplicate Error!')
                        }
                    }
                }, function errorCallback(response) {
                    alert(response);
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('calcel')
            }
        }

        $scope.detailGroup = function (group) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/detail_group.html',
                controller: ctrlDetailGroup,
                resolve: {
                    scope: function () {
                        return group;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        }
        function ctrlDetailGroup($scope, $modalInstance, scope) {
            $scope.init = function () {
                $scope.GroupDetail = scope;
            }();
            $scope.cancel = function () {
                $modalInstance.dismiss('calcel')
            }
        }

        $scope.editGroup = function (group) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/email_push_automation/edit_group.html',
                controller: ctrUpdateGroup,
                resolve: {
                    scope: function () {
                        return group;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            })
        };

        function ctrUpdateGroup($scope, $modalInstance, scope) {

            $scope.init = function () {
                $scope.EditGroup = scope;
            }();

            $scope.updateGroup = function (EditGroup) {
                var url = '/api/group/update';
                var data = {};
                data._id = EditGroup._id;

                if (EditGroup.name) {
                    data.name = EditGroup.name;
                }

                if (EditGroup.metadata.devices) {
                    data.devices = EditGroup.metadata.devices;
                }

                if (EditGroup.metadata.countries) {
                    data.countries = EditGroup.metadata.countries;
                }

                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadGroups();
                        } else {
                            alert('Update error!');
                        }
                    }
                }, function errorCallback(response) {
                    alert(response.status);
                });

                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }


        $scope.deleteGroup = function (group) {
            var ok = confirm("You will delete " + group.name + ", are you sure?");
            if (ok) {
                var url = '/api/group/delete';
                var data = {};
                data._id = group._id;
                $http({
                    method: 'POST',
                    url: url,
                    data: data
                }).then(function successCallback(response) {
                    if (response.status == 200) {
                        if (response.data.status) {
                            loadGroups()
                        } else {
                            alert("Delete Error !")
                        }
                    }
                }, function errorCallback(response) {
                    alert("Loi khong co Data ", response.status)
                })
            }
        }

        $scope.changeDisabledCampaign = function (camp) {
            var url = '/api/campaign-marketing/enablecampaign';
            var data = {}
            data._id = camp._id;
            data.isDisable = !camp.isDisable
            $http({
                method: 'POST',
                url: url,
                data: data
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        loadCampaigns()
                        loadGroups()
                        loadContent($scope.page)
                    } else {
                        alert('Update Error!')
                    }

                }
            }, function errorCallback(response) {
                alert('No data ' + response.status)
            })
        }

        $scope.changeDisabledGroup = function (group) {
            var url = '/api/group/enablegroup';
            var data = {};
            data._id = group._id;
            data.isDisable = !group.isDisable;
            $http({
                method: 'POST',
                url: url,
                data: data
            }).then(function successCallback(response) {
                if (response.status == 200) {
                    if (response.data.status) {
                        loadGroups()
                        loadContent($scope.page)
                    } else {
                        alert('update error');
                    }
                }
            }, function errorCallback(response) {
                alert('Loi khong co data' + response.status);
            });

        }
    })
}(angular));
