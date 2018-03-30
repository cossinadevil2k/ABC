(function($a){
    'use strict';

    $a.module('ML').controller('pnRequest', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Push Notifications Requests';

        $scope.listSession = [];
        $scope.isLoading = false;
        $scope.page = 1;
        var limit = 20;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.view = 'Pending';

        getRequestSessions(0, limit);

        function getRequestSessions(skip, limit){
            $scope.isLoading = true;
            var url = '';

            switch ($scope.view) {
                case 'Pending':
                    url = '/push-notification-request/get-pending';
                    break;
                case 'Accepted':
                    url = '/push-notification-request/get-accepted';
                    break;
                case 'Denied':
                    url = '/push-notification-request/get-denied';
                    break;
                case 'All':
                    url = '/push-notification-request/get-all';
                    break;
                default:
                    url = '/push-notification-request/get-all';
                    break;
            }

            $http.post(url, {skip: skip, limit: limit})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        $scope.listSession = result.d;
                        checkPage();
                    }
                    else if (result.e && result.e === 'permission_error') {
                        alert("Only system admin can use this feature");
                    }
                    else {
                        alert("Get notification push request failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        $scope.accept = function(session){
            var ok = confirm("Are you sure?");
            if (ok) {
                $scope.isLoading = true;
                $http.post('/push-notification-request/accept', {session: session})
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            var skip = limit * ($scope.page - 1);
                            getRequestSessions(skip, limit);
                        }
                        else if (result.e && result.e === 'permission_error') {
                            alert("Only system admin can use this feature");
                        }
                        else {
                            alert("Deny request failed");
                        }
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }
        };

        $scope.deny = function(session){
            var ok = confirm("Are you sure?");
            if (ok) {
                $scope.isLoading = true;
                $http.post('/push-notification-request/deny', {session: session})
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            var skip = limit * ($scope.page - 1);
                            getRequestSessions(skip, limit);
                        }
                        else if (result.e && result.e === 'permission_error') {
                            alert("Only system admin can use this feature");
                        }
                        else {
                            alert("Deny request failed");
                        }
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }
        };

        $scope.remove = function(session){
            var ok = confirm('Are you sure?');
            if (ok) {
            $scope.isLoading = true;
            $http.post('/push-notification-request/remove', {id: session._id})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        var skip = limit * ($scope.page - 1);
                        getRequestSessions(skip, limit);
                    }
                    else if (result.e && result.e === 'permission_error') {
                        alert("Only system admin can use this feature");
                    }
                    else {
                        alert("Remove request failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
            }
        };

        $scope.viewSelect = function(view){
            $scope.view = view;
            $scope.page = 1;
            getRequestSessions(0, limit);
        };

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listSession.length < limit;
        }

        $scope.nextPage = function(value){
            $scope.page += value;
            var skip = limit * ($scope.page - 1);
            getRequestSessions(skip, limit);
        }
    });
}(angular));