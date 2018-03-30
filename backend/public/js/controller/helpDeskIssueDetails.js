(function ($a) {
    'use strict';
    $a.module('ML').controller('helpdeskIssueDetails', function ($scope, $rootScope, $http, $routeParams, $modal, $anchorScroll, $location, $window) {
        $rootScope.tabSelect = 5;
        $rootScope.MLPageDetail = 'Issue Details';

        $scope.env = env;
        $scope.isLoading = true;
        $scope.isUpdating = false;
        $scope.isReplying = false;

        $scope.messages = [];
        $scope.issue = {};
        $scope.user = {};
        $scope.newMessage = false;
        $scope.replyError = false;
        $scope.admins = [];


        $scope.gotoBottom = function () {
            $location.hash('lastItem');
            $anchorScroll();
        };

        function getCountry(user) {
            if (user) {
                if (user.tags) {
                    user.tags.forEach(function (tag) {
                        if (tag.indexOf('country') !== -1) {
                            user.flag = tag.split(':')[1];
                        }
                    });
                }
            }
        }

        function getIssue(issue_id) {
            $http.post('/helpdesk/issue/get-one', { issueId: issue_id })
                .success(function (data) {
                    if (data.s) {
                        getCountry(data.d);
                        $scope.issue = data.d;
                        if ($scope.issue.assigned) {
                            if (typeof $scope.issue.assigned === 'string') {
                                $scope.issue.assigned = [$scope.issue.assigned];
                            }
                        }
                        $scope.user = data.d.user;
                        getCountry($scope.user);
                    }
                    else {
                        alert('Get Issue Info Failed');
                    }
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        }

        getIssue($routeParams.issue_id);

        var getMessage = function (issue_id) {
            $scope.isLoading = true;
            $http.post('/helpdesk/message/get', { issueId: issue_id })
                .success(function (data) {
                    $scope.isLoading = false;
                    if (data.s) {
                        $scope.messages = data.d;
                    } else alert("Get Message Failed");
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        };

        getMessage($routeParams.issue_id);

        var listenSocket = function (issue_id) {
            var socket = io('https://socket.moneylover.me/');
            var room = '/helpdesk/issue/' + issue_id;
            socket.on(room, function (data) {
                getIssue($routeParams.issue_id);
                getMessage($routeParams.issue_id);
                $scope.newMessage = true;

            });
        };
        listenSocket($routeParams.issue_id);

        var getAdminList = function () {
            $scope.isLoading = true;
            $http.get('/helpdesk/list-admin')
                .success(function (data) {
                    $scope.isLoading = false;
                    if (data.s) $scope.admins = data.d;
                    else $scope.errorMsg = "Get Admin Failed";
                })
                .error(function () {
                    $scope.isLoading = false;
                    $scope.errorMsg = 'Error From Server';
                })
        };

        getAdminList();

        var updateIssue = function (issue, callback) {
            var postData = {
                item: issue
            };

            if (postData.item.status === 'null') postData.item.status = null;

            if (postData.item.user) {
                if (postData.item.user._id) postData.item.user = postData.item.user._id;
            } else {
                postData.item.user = {};
                postData.item.user._id = null;
            }

            if (postData.item.assigned && postData.item.assigned.length > 0) {
                //if(postData.item.assigned._id === 'null') postData.item.assigned = postData.item.assigned._id;
                forEach(postData.item.assigned, function (element, index) {
                    postData.item.assigned[index] = element._id;
                });
            }

            if (postData.item.tags.length > 0) {
                postData.item.tags = postData.item.tags.split(",");
                postData.item.tags.forEach(function (value, index) {
                    postData.item.tags[index] = value.trim();
                });
            }
            $scope.isUpdating = true;
            $http.post('/helpdesk/issue/update', postData)
                .success(function (data) {
                    $scope.isUpdating = false;
                    if (data.s) {
                        $scope.issue = data.d;
                        callback(true);
                    }
                    else callback(false);
                })
                .error(function () {
                    $scope.isUpdating = false;
                    callback(false);
                    alert("Error From Server");
                })
        };

        $scope.moreIssue = moreIssue;

        function moreIssue(user) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/helpdesk/issue/more_issue.html',
                controller: ctrlMoreIssue,
                resolve: {
                    user: function () {
                        return user;
                    }
                }
            });

            modalInstance.result.then(function () {

            });
        }

        var ctrlMoreIssue = function ($modalInstance, $scope, user) {
            $scope.user = user;
            $scope.tabSelected = 'open';
            $scope.listIssue = [];

            var getMoreIssue = function () {
                $http.post('/helpdesk/issue/get-more', { userId: user._id })
                    .success(function (result) {
                        if (result.s) $scope.listIssue = result.d;
                        else alert("Get List Issue Failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    })
            };
            getMoreIssue();

            $scope.selectTab = function (mode) {
                $scope.tabSelected = mode;
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.requestReview = function () {
            var msg = 'Would you like to review the app?';
            var metadata = { isRequestReview: true };

            reply(msg, metadata);
        };

        $scope.requestImage = function () {
            var msg = 'Could you please attach a screenshot of the problem?';
            var metadata = { isRequestImage: true };

            reply(msg, metadata);
        };

        $scope.setResolved = function () {
            $scope.issue.status = 'Resolved';
            // console.log($scope.issue);
            logResolveDaily($scope.issue);
            $scope.updateIssue($scope.issue);
        };

        function logResolveDaily(issue) {
            var postData = {
                issue: issue._id
            }
            $http.post('/helpdesk/stats/daily', postData)
                .success(function (data) {
                    
                })
                .error(function (err) {
                    alert(err);
                })
        }


        function reply(msg, metadata) {
            var postData = {
                issueId: $routeParams.issue_id,
                message: msg,
                userId: $scope.user._id,
                // language: $scope.issue.metadata.l
            };
            if ($scope.issue.metadata && $scope.issue.metadata.l) {
                postData.language = $scope.issue.metadata.l
            };
            if (metadata) postData.metadata = metadata;
            if ($scope.issue.assigned && $scope.issue.assigned.length > 0) {
                postData.isAssigned = true;
            }
            $scope.isReplying = true;
            $http.post('/helpdesk/message/mod-reply', postData)
                .success(function (data) {
                    $scope.isReplying = false;
                    if (data.s) {
                        $scope.replyError = false;
                        $scope.messages.push(data.d);
                        $scope.message = null;
                        $scope.issue.seen = false;
                        if (!$scope.issue.assigned) getIssue($routeParams.issue_id);
                    } else $scope.replyError = true;
                })
                .error(function () {
                    $scope.isReplying = false;
                    alert("Error From Server");
                });
        }

        $scope.reply = function (msg) {
            if (msg) {
                reply(msg);
            }
        };

        $scope.replyAndResolved = function (msg) {
            if (msg) {
                reply(msg);

                $scope.issue.status = 'Resolved';
                $scope.updateIssue($scope.issue);
            }
        };

        $scope.editMessage = function (message) {
            $http.post('/helpdesk/message/edit-mod-message', { id: message._id, message: message.content })
                .success(function (result) {
                    message.editMode = false;
                    if (!result.s) return alert('Edit message failed');

                })
                .error(function () {
                    message.editMode = false;
                    alert('Error from server');
                });
        };

        $scope.updateIssue = function (issue) {
            updateIssue(issue, function (status) {
                if (status) {
                    $scope.updateNoteSuccess = false;
                    $scope.updateNoteSuccess = true;
                }
                else {
                    $scope.updateNoteFailed = false;
                    $scope.updateNoteFailed = true;
                }
            });
        };

        $scope.insertFaq = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/helpdesk/issue/faq_popup.html',
                controller: ctrlInsertFaq,
                resolve: {

                }
            });

            modalInstance.result.then(function (answer) {
                $scope.message = answer;
            });
        };

        var ctrlInsertFaq = function ($scope, $modalInstance) {
            var myTimeout;

            $scope.search = function (keyword) {
                if (keyword) {
                    $http.post('/helpdesk/faq/search', { keyword: keyword })
                        .success(function (data) {
                            if (data.s) {
                                $scope.suggestList = data.d;
                                $scope.showSuggest = true;
                            } else alert("Search Failed")
                        })
                        .error(function () {
                            alert("Error From Server");
                        })
                }
            };

            var startTimeoutSearch = function (keyword) {
                myTimeout = setTimeout(function () {
                    $scope.search(keyword);
                }, 2000);
            };

            var stopTimeoutSearch = function () {
                clearTimeout(myTimeout);
            };

            $scope.selectFaq = function (index) {
                $modalInstance.close($scope.suggestList[index].answer);
            };

            $scope.keywordChanged = function (keyword) {
                if (keyword || keyword !== '') {
                    stopTimeoutSearch();
                    startTimeoutSearch(keyword);
                } else $scope.showSuggest = false;
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.showInfoIssues = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/helpdesk/issue/infoMobile.html',
                controller: ctrlInfoMobile,
                resolve: {
                    issue: function () {
                        return $scope.issue;
                    },
                    user: function () {
                        return $scope.user;
                    }
                }
            });
        };

        var ctrlInfoMobile = function ($scope, $modalInstance, issue, user) {
            $scope.issue = issue;
            $scope.user = user;
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
            $scope.moreIssues = function (user) {
                moreIssue(user);
                $modalInstance.dismiss('cancel');
            }
        };

        $scope.checkAdminAssigned = function (admin) {
            if (!$scope.issue.assigned) {
                return true;
            }

            for (var i = 0; i < $scope.issue.assigned.length; i++) {
                if ($scope.issue.assigned[i]._id === admin._id) return false;
            }

            return true;
        };

        $scope.assign = function (admin) {
            $scope.issue.assigned.push(admin);
            $scope.updateIssue($scope.issue);
        };

        $scope.iosGroup = function (admins) {
            roleTags(admins, 'iOS');
        };

        $scope.androidGroup = function (admins) {
            roleTags(admins, 'Android');
        };

        $scope.bizGroup = function (admins) {
            roleTags(admins, 'Biz');
        };

        $scope.conceptGroup = function (admins) {
            roleTags(admins, 'Concept');
        };

        $scope.backendGroup = function (admins) {
            roleTags(admins, 'Web/Backend');
        };

        function roleTags(admins, roleName) {
            var adminAssigned = [];
            for (var i = 0; i < $scope.issue.assigned.length; i++) {
                adminAssigned.push($scope.issue.assigned[i].username);
            }
            for (var i = 0; i < admins.length; i++) {
                if (admins[i].role.indexOf(roleName) > -1 && adminAssigned.indexOf(admins[i].username) == -1) {
                    $scope.issue.assigned.push(admins[i]);
                }
            }
            $scope.updateIssue($scope.issue);
        }

        $scope.selectStatus = function (status) {
            if (status === 'Open') {
                if ($scope.issue.status) $scope.issue.status = null;
            }
            else $scope.issue.status = status;
            $scope.updateIssue($scope.issue);
        };

        $scope.removeAssign = function (index) {
            $scope.issue.assigned.splice(index, 1);
            $scope.updateIssue($scope.issue);
        };

        $scope.back = function () {
            $window.location.href = '/helpdesk/issue';
        }
    });
}(angular));
