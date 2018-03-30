(function($a){
    'use strict';
    $a.module('ML').controller('helpdeskIssue', function($scope, $rootScope, $modal, $http, $routeParams, $route, $location, localStorageService){
        $rootScope.tabSelect = 5;
        $rootScope.MLPageDetail = 'Issue Management';

        $scope.isLoading = false;
        $scope.issues = [];
        $scope.noResult = true;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;

        $scope.issuesOpenedFromUser = 0;
        $scope.issuesOpendFromAdmin = 0;

        var limit = 50;
        var emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var helpdeskSettingKey = 'helpdeskIssueSettings';

        $scope.statused = [
            {label: 'All', value: 'all', is_mine: false},
            {label: 'New', value: 'new', is_mine: false},
            {label: 'Open', value: 'open', is_mine: false},
            {label: 'Closed', value: 'closed', is_mine: false},
            {label: 'My issues', value: 'all', is_mine: true},
            {label: 'My open issues', value: 'open', is_mine: true},
            {label: 'My closed issue', value: 'closed', is_mine: true}
        ];

        $scope.platforms = [
            {label: 'All', value: 'All'},
            {label: 'Android', value: 'Android'},
            {label: 'iOS', value: 'iOS'},
            {label: 'Mac', value: 'Mac'},
            {label: 'Windows', value: 'Windows'},
            {label: 'Windows Phone', value: 'Windows Phone'},
            {label: 'Web', value: 'Web'},
        ];

        $scope.sorts = [
            {label: 'oldest', value: 'oldest'},
            {label: 'newest', value: 'newest'}
        ];

        $scope.senders = ['user', 'admin'];

        var defaultFilters = {
            status: 'open',
            mine: false,
            platform: 'all',
            sort: 'newest',
            sender: 'user',
            purchased: true,
            limit: limit
        };

        $scope.filters = defaultFilters;

        function getDataRequest(filters, skip, callback){
            filters.skip = skip;

            $http.post('/helpdesk/issue/get-all-2', filters)
                .success(function(result){
                    if (result.s) {
                        callback(null, result.d, result.u, result.a);
                    } else {
                        callback('Get issues due to failed');
                    }
                })
                .error(function(){
                    callback('Error From Server');
                });
        }

        function getData(){
            var skip = limit * ($scope.page - 1);

            $scope.isLoading = true;

            getDataRequest($scope.filters, skip, function (err, data, openedByUser, openedAdmin) {
                $scope.isLoading = false;

                if (err) {
                    return alert(err);
                }

                $scope.issues = data;
                $scope.issuesOpenedFromUser = openedByUser;
                $scope.issuesOpendFromAdmin = openedAdmin;
                checkPage();
            });
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.issues.length < limit;
        }

        function validateEmail(email){
            return emailRegex.test(email);
        }

        function directMessageToUserList(listEmail, message, title, schedule) {

            var pushData = {};
            pushData.listUserEmail = listEmail;
            pushData.message = message;
            pushData.name = title;

            if (schedule) {
                pushData.schedule = schedule; 
            } 

            $http.post('/helpdesk/issue/add', {pushData: pushData})
                .success(function(data) {

                }).error(function() {
                    alert("Can not send message");
                });
        }

        function directMessageToUser(email, message, title) {
            var pushData = {};
            pushData.listUserEmail = [email];
            pushData.message = message;
            pushData.name = title;
            $http.post('/helpdesk/issue/add', {pushData: pushData})
                .success(function(data) {

                }).error(function() {
                    alert("Can not send message");
                });
        }

        function getSetting(){
            var filters = localStorageService.get(helpdeskSettingKey);

            if (!filters || filters === {}) {
                $scope.filters = defaultFilters;
            } else {
                $scope.filters = filters;
            }
        }

        function saveSetting(){
            localStorageService.set(helpdeskSettingKey, JSON.stringify($scope.filters));
        }

        /**
         * FUNCTIONS
         */

        $scope.selectStatus = function (status, mine) {
            $scope.filters.status = status;
            $scope.filters.mine = mine;
            $scope.page = 1;
            saveSetting();
            getData();
        };

        $scope.changeUserType = function(status){
            $scope.filters.purchased = status;
            $scope.page = 1;
            saveSetting();
            getData();
        };

        $scope.changePlatform = function(platform){
            $scope.filters.platform = platform;
            $scope.page = 1;
            saveSetting();
            getData();
        };

        $scope.changeSort = function (status) {
            $scope.filters.sort = status;
            $scope.page = 1;
            saveSetting();
            getData();
        };

        $scope.selectTab = function(person){
            $scope.filters.sender = person;
            $scope.page = 1;
            saveSetting();
            getData();
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            getData();
        };

        $scope.displayAssigned = function(list){
            if (list) {
                if (list.length && list.length > 0) {
                    var adminName = [];
                    list.forEach(function (element) {
                        adminName.push(" " + element.username);
                    });
                    return adminName.toString();
                } else {
                    return list.username;
                }
            }
        };

        $scope.sendMessage = function() {
            var modalInstance = $modal.open({
                templateUrl: '/partials/helpdesk/issue/sendMessage.html',
                controller: sendMessageController
            });
        };

        var sendMessageController = function($modalInstance, $scope){
            $scope.helpdeskIssuePage = true;
            $scope.inputUserType = 'manual';
            $scope.isScheduled = false;

            $scope.cancel = function(message, title, listUserEmail){
                if (message || title || listUserEmail) {
                    var cfmdialog = confirm('Do you really want to cancel?');
                    if (cfmdialog) {
                        $modalInstance.dismiss('cancel');
                    } else {
                        return false;
                    }
                } else {
                    $modalInstance.dismiss('cancel');
                }
            };

            $scope.send = function() {
                var message = this.message;
                var title = this.title;
                var isScheduled = this.isScheduled;
                var schedule = this.schedule;
                var scheduleTime;

                if (isScheduled) {
                    if (!schedule || !schedule.date || !schedule.time) {
                        return alert('Please set schedule date & time');
                    }

                    scheduleTime = scheduleTimeParser(schedule.date, schedule.time);
                } else {
                    scheduleTime = null;
                }

                getListEmail(this, function(listUserEmail){
                    if (!message || !title || !listUserEmail) {
                        return $scope.checkRequired = true;
                    }

                    if (!validateEmailList(listUserEmail)) {
                        return $scope.checkTrueEmail = false;
                    }

                    directMessageToUserList(listUserEmail, message, title, scheduleTime);
                    $modalInstance.dismiss('cancel');
                });
            };
        };

        function scheduleTimeParser(date, time) {
            var day = date.getDate();
            var month = date.getMonth() + 1;
            var year = date.getFullYear();

            return day + '/' + month + '/' + year + ' ' + time;
        }

        function getListEmail(scope, callback){
            if (scope.listUserEmail) {
                var list = scope.listUserEmail.split(',');
                return callback(parseEmail(list));
            }

            readFile(callback);
        };

        function readFile(callback){
            var file = document.getElementById("csv_file").files[0];
            var mailListFromFile = [];

            var reader = new FileReader();

            reader.onload = function(e){
                var text = reader.result.toString();
                var a = text.split('\n');
                mailListFromFile = checkNullEmail(a);
                callback(parseEmail(mailListFromFile));
            };

            reader.readAsText(file, "utf-8");
        }

        function validateEmailList(list){
            for(var i = 0; i < list.length; i++){
                if (!validateEmail(list[i])) {
                    return false;
                }
            }

            return true;
        }

        function parseEmail(list){
            var new_list = [];
            list.forEach(function(email){
                new_list.push(email.trim());
            });
            return new_list;
        }

        function checkNullEmail(list){
            var new_list = [];
            list.forEach(function(email){
                if (email != "") {
                    new_list.push(email);
                }
            });
            return new_list;
        }

        function init(){
            getSetting();
            getData();
        }

        init();
    });
}(angular));
