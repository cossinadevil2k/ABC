(function ($a) {
    'use strict';

    $a.module('ML').controller('tags', function ($scope, $rootScope, $modal, $http) {
        $rootScope.tabSelect = 7;
        $rootScope.MLPageDetail = 'TAGS';

        $scope.$on('$viewContentLoaded', function () {
            // console.log('Tag Controller');
            loadTag();
        });
        $scope.tags = {};
        $scope.noContent = false;

        $scope.create = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/tags/create.html',
                controller: ctrlCreate,
                resolve: {
                    tags: function () {
                        return $scope.tags;
                    }
                }
            });

            modalInstance.result.then(function (data) {

            });
        };

        function ctrlCreate($scope, $modalInstance) {
            $scope.tag = {};

            $scope.createTag = function (tag) {
                var newTag = {};
                newTag.name = tag.name;
                newTag.duplicate = tag.duplicate;
                newTag.description = tag.description;

                var url = '/api/tags/create';

                $http({
                    method: 'POST',
                    url: url,
                    data: newTag
                }).then(function successCallback(response) {
                    if (response.data.status === 1) {
                        loadTag();
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });
                $modalInstance.close();
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.edit = function (tag) {
            var editTag = angular.copy(tag);
            var clonedTags = angular.copy(tag);

            var modalInstance = $modal.open({
                templateUrl: '/partials/tags/edit.html',
                controller: ctrlUpdate,
                resolve: {
                    editTag: function () {
                        return editTag;
                    },
                    clonedTags: function () {
                        return clonedTags;
                    }
                }
            });

            modalInstance.result.then(function (data) {
                // console.log('dada', data);
                var clonedTags = data.clonedTags;

                var url = '/api/tags/edit';

                var oldValue = clonedTags.name + '|' + clonedTags.duplicate + '|' + clonedTags.description;
                var newValue = data.newTag;
                var params = { oldValue: oldValue, newValue: newValue };
                // console.log(params);
                $http({
                    method: 'POST',
                    url: url,
                    data: params
                }).then(function successCallback(response) {
                    if (response.data.status == 1) {
                        loadTag();
                    } else {
                        alert(response.data.message);
                    }
                }, function errorCallback(response) {
                    alert(response);
                });
            });
        };

        function ctrlUpdate($scope, $modalInstance, editTag, clonedTags) {
            $scope.editTag = editTag;

            $scope.updateTag = function (tagEdit) {

                var newValue = tagEdit.name + '|' + tagEdit.duplicate + '|' + tagEdit.description;

                $modalInstance.close({ clonedTags: clonedTags, newTag: newValue });
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        function loadTag() {
            var url = '/api/tags/browse';
            var tagArray = [];
            $http({
                method: 'GET',
                url: url
            }).then(function successCallback(response) {
                if (response.data.status === 1) {
                    var string = response.data.data;
                    for (var i = 0; i < string.length; i++) {
                        var tags = {};
                        var temp = string[i].split('|');
                        tags.name = temp[0].replace(/[^\w\s]/gi, ''); // remove special character
                        tags.duplicate = temp[1].replace(/[^\w\s]/gi, '');// remove special character
                        tags.description = temp[2].replace(/[^\w\s]/gi, '');
                        tagArray.push(tags);
                    }
                    $scope.tags = tagArray;
                    if (tagArray.length > 0) {
                        $scope.noContent = false;
                    } else {
                        $scope.noContent = true;
                    }
                }
            }, function errorCallback(response) {
                alert(response);
            });
        };

        $scope.delete = function (tag) {
            var url = '/api/tags/delete';
            var params = { value: tag.name + '|' + tag.duplicate + '|' + tag.description };
            var ok = confirm("Tag " + tag.name + ' will be deleted, are you sure?');
            if (ok) {
                $http({
                    method: 'POST',
                    url: url,
                    data: params
                }).then(function successCallback(response) {
                    loadTag();
                }, function errorCallback(response) {
                    alert(response.data.message);
                });
            }
        };

    })
}(angular));
