(function($a){
    'use strict';

    $a.module('ML').controller('invited', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Sync';
        $scope.listInvite = [];
        $scope.indexList = 0;
        $scope.invStatus = 0;

        var page = 1;

        function getInviteSync(limit, cb, keyword){
            var postData = {status: $scope.invStatus, limit: limit.limit, skip: limit.skip, keyword: keyword};

            $http.post('/invited/list', postData).success(function(data, err){
                cb(data);
            }).error(function(data,err){
                alert('Error');
            });
        }

        function updateInviteSync(info, cb){
            $http.post('/invited/update', info).success(function(data){
                cb(data);
            }).error(function(){
                alert('Error');
            });
        }

        $scope.search = function(){
            var limit = {limit: 50, skip: 0};
            page = 1;
            var keyword = this.keyword;
            $scope.invStatus = this.invStatus;
            getInviteSync(limit, function(data){
                if(data.error) alert('Error');
                else {
                    $scope.indexList = 0;
                    $scope.listInvite = data.data;
                }
            }, keyword);
        };

        $scope.nextPage = function(number){
            page += number;
            if(page < 2) page = 1;
            var newSkip = (page - 1) * 50;
            var limit = {limit: 50, skip: newSkip};
            var keyword = this.keyword;
            getInviteSync(limit, function(data){
                if(data.error) alert('Error');
                else {
                    $scope.indexList = newSkip;
                    $scope.listInvite = data.data;
                }
            }, keyword);
        };

        $scope.get = function(){
            var limit = {limit: 50, skip: 0};
            page = 1;
            $scope.status = 0;
            this.keyword = '';
            getInviteSync(limit, function(data){
                if(data.error) alert('Error');
                else {
                    $scope.indexList = 0;
                    $scope.listInvite = data.data;
                }
            });
        };

        $scope.update = function(inviteInfo, status){
            var s = confirm('Bấm OK/Đồng ý để tiếp tục');
            if(s){
                var infoUpdate = {inviteInfo: inviteInfo, status: status};
                $http.post('/invited/update', infoUpdate).success(function(data){
                    $scope.listInvite.forEach(function(invite, key) {
                        if (invite === inviteInfo) {
                            $scope.listInvite.splice(key, 1);
                        }
                    });
                }).error(function(){
                    alert('Error');
                });
            }
        };
    })
}(angular));