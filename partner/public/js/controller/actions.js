(function($a){
    'use strict';

    $a.module('ML').controller('actions', function($scope, $rootScope, $http, $modal){
        $rootScope.MLPageDetail = 'Linked Wallet Action Manager';
        $rootScope.tabSelect = 4;

        $scope.isLoading = false;

        $scope.setting = {};

        var limit = 3;

        function _POST(url, data, callback) {
            $http.post(url, data)
                .success(function(result) {
                    if (result.s) {
                        callback(null, result.d || null);
                    } else {
                        callback('Failed');
                    }
                }).error(function() {
                    callback('Error From Serer');
                });
        }

        function _checkLimitActions() {
            return $scope.setting.actions.length <= limit;
        }

        function _validateHexColor(input){
            var regexHexColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
            return regexHexColor.test(input);
        }

        function _validateUrl(input) {
            var regexUrl = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
            return regexUrl.test(input);
        }

        function getActionList(){
            $scope.isLoading = true;

            _POST('/linked-wallet-actions/get', {}, function(err, result){
                $scope.isLoading = false;

                if (err) {
                    return alert(err);
                }

                $scope.setting = result;

                // console.log($scope.setting);
            });
        }
        
        function openActionDetail(action){
            return $modal.open({
                templateUrl: '/partials/action/action_detail.html',
                controller: ctrlActionDetail,
                resolve: {
                    action: function(){
                        if (action) {
                            return action;
                        }

                        return {
                            color: $scope.setting.color
                        }
                    }
                }
            });
        }

        function ctrlActionDetail($scope, $modalInstance, action) {
            if (action) {
                $scope.info = action;
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.save = function(info){
                if (!info || !info.name || !info.type || !info.icon) {
                    return alert("Info invalid");
                }

                if (info.color) {
                    if (!_validateHexColor(info.color)) {
                        return alert('Color invalid');
                    }
                }

                if (info.metadata) {
                    if (info.type === 'link') {
                        if (_validateUrl(info.metadata)) {
                            var url = info.metadata.split('?');

                            if (url[1]) {
                                if (url[1].indexOf('ref=moneylover') === -1) {
                                    info.metadata += '&ref=moneylover';
                                }
                            } else {
                                info.metadata += '?ref=moneylover';
                            }
                        }
                    }
                }

                $modalInstance.close(info);
            };
        }
        
        var editAction = function(action, index){
            var modalEdit = openActionDetail(action);

            modalEdit.result.then(function(newAction) {
                $scope.setting.actions[index] = newAction;
            });
        };
        
        var addAction = function() {
            var modalAdd = openActionDetail();

            modalAdd.result.then(function(newAction) {
                if ($scope.setting.actions) {
                    $scope.setting.actions.push(newAction);
                } else {
                    $scope.setting.actions = [newAction];
                }
            });
        };

        var deleteAction = function(index){
            $scope.setting.actions.splice(index, 1);
        };

        var saveActionList = function(setting){
            var ok = confirm('Are you sure?');

            if (!ok) return;

            if (!setting) return;

            if (setting.color) {
                if (!_validateHexColor(setting.color)) {
                    return alert("Color invalid");
                }
            }

            if (!_checkLimitActions()) {
                return alert(`The number of Action should be less than or equal ${limit}`);
            }

            var url = '/linked-wallet-actions/save';
            $scope.isLoading = true;

            _POST(url, {data: setting}, function(err){
                $scope.isLoading = false;

                if (err) {
                    return alert(err);
                }
            });
        };

        /**
         * EXPORTS
         */

        $scope.getActionList = getActionList;
        $scope.add = addAction;
        $scope.edit = editAction;
        $scope.delete = deleteAction;
        $scope.save = saveActionList;
    });
}(angular));