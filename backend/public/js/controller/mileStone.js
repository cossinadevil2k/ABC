(function($a){
    'use strict';

    $a.module('ML').controller('mileStone', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Milestone';

        function closeModal(modalInstance){
           modalInstance.dismiss('cancel');
        }

        var getMilestone = function(){
            $http.post('/milestone/get', {})
                .success(function (data) {
                    if (data.s) {
                        $scope.listMilestone = data.d;
                    } else {
                        alert('Get fails!')
                    }
                })
                .error(function () {
                    alert("Error from Server");
                })
        };
        getMilestone();

        function postMethod(data, link, listInfo){
            if (!data) {
                $scope.checkRequired = true;
            } else {
                if (data.eventDate && data.title) {
                    $http.post(link, listInfo)
                        .success(function (data) {
                            if (data.s) {
                                getMilestone();
                            } else {
                                alert(data.m)
                            }
                        })
                        .error(function () {
                            alert("Error from Server");
                        })
                } else {
                    $scope.checkRequired = true;
                }
            }
        }

        $scope.addMilestone = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/setting/enterMilestone.html',
                controller: ctrlMilestone,
            });
        }
        var ctrlMilestone = function($scope, $modalInstance){
            $scope.createPage = true;
            $scope.cancel = function(){
                closeModal($modalInstance)
            };
            $scope.add = function(milestone) {
                var link = '/milestone/add';
                var listInfo = {info: milestone};
                postMethod(milestone, link, listInfo);
                $scope.cancel();
            };
        };

        $scope.del = function(milestone){
            var s = confirm("Are you sure?");
            if(s) {
                $http.post('/milestone/delete', {milestone: milestone})
                .success(function (data) {
                    if (!data.error) {
                        getMilestone();
                    } else {
                        alert(data.msg);
                    }
                })
                .error(function () {
                    alert('Error from server :(');
                });
            }
        };

        $scope.edit = function(milestone){
          var modalInstance = $modal.open({
            templateUrl: '/partials/setting/enterMilestone.html',
            controller: ctrlEditMilestone,
            resolve: {
              milestone: function() {
                  return milestone;
              }
            }
          });
        };

        var ctrlEditMilestone = function(milestone, $scope, $modalInstance){
            $scope.editPage = true;
            $scope.thisMilestone = milestone;

            $scope.cancel = function(){
                closeModal($modalInstance)
            };

            $scope.save = function(milestoneEdited) {
                var link = '/milestone/edit';
                var listInfo = {id: milestone._id, info: milestoneEdited};
                postMethod(milestoneEdited, link, listInfo);
                $scope.cancel();
            };
        };
    })
}(angular));
