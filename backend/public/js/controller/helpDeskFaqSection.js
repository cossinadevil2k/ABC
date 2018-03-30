(function($a, $async){
    'use strict';
    $a.module('ML')
        .controller('helpDeskFaqSection', function($scope, $rootScope, $http, $modal){
            $rootScope.tabSelect = 5;
            $rootScope.MLPageDetail = 'Section Management';

            $scope.sections = [];
            $scope.isLoading = true;

            var getSection = function(){
                $scope.isLoading = true;
                $http.post('/helpdesk/section/get', {})
                    .success(function(data){
                        $scope.isLoading = false;
                        if(data.s){
                            $scope.sections = data.d;
                        } else {
                            alert("Get Section Failed");
                        }
                    })
                    .error(function(){
                        $scope.isLoading = false;
                        alert("Error from Server");
                    })
            };

            var deleteSection = function(id){
                var s = confirm("Are you sure?");
                if(s){
                    $http.post('/helpdesk/section/delete', {sectionId: id})
                        .success(function(data){
                            if(data.s){
                                getSection();
                            } else {
                                alert("Delete section failed");
                            }
                        })
                        .error(function(){
                            alert("Error From Server");
                        })
                }
            };

            var updateSection = function(mode, index, info){
                var modalInstance = $modal.open({
                    templateUrl: '/partials/helpdesk/section/info.html',
                    controller: ctrlUpdate,
                    resolve: {
                        mode: function(){
                            return mode;
                        },
                        info: function(){
                            return info;
                        },
                        sortIndex: function(){
                            if (mode === 'Add') return $scope.sections.length + 1;
                            else return index + 1;
                        }
                    }
                });

                modalInstance.result.then(function(){

                });
            };

            function saveSection(url, data, callback){
                $http.post(url, data)
                    .success(function(response){
                        if (response.s) callback(null);
                        else callback("Save section failed");
                    })
                    .error(function(){
                        callback("Error From Server");
                    })
            }

            var ctrlUpdate = function($scope, $modalInstance, mode, info, sortIndex){
                $scope.mode = mode;

                if(info){
                    $scope.section = info;
                }

                $scope.saveSection = function(section){
                    if(section){
                        var url, errorMsg;
                        if(mode === 'Add'){
                            url = '/helpdesk/section/add';
                            section.sortIndex = sortIndex;
                        } else {
                            url = '/helpdesk/section/edit';
                            if (!section.sortIndex || (section.sortIndex && section.sortIndex !== sortIndex))
                                section.sortIndex = sortIndex;
                        }

                        saveSection(url, section, function(err){
                            if (err) $scope.errorMsg = err;
                            else {
                                getSection();
                                $scope.cancel();
                            }
                        });
                        console.log(section);
                    }
                };

                $scope.cancel = function() {
                    $modalInstance.dismiss('cancel');
                };
            };

            $scope.sortSection = function(mode, key){
                var temp;
                var url = '/helpdesk/section/edit';
                if(mode==='up'){
                    if(key !== 0){
                        temp = $scope.sections[key];
                        $scope.sections[key] = $scope.sections[key - 1];
                        $scope.sections[key - 1] = temp;

                        $async.parallel([
                            function(callback){
                                $scope.sections[key].sortIndex = key + 1;
                                saveSection(url, $scope.sections[key], callback);
                            },
                            function(callback){
                                $scope.sections[key - 1].sortIndex = key;
                                saveSection(url, $scope.sections[key - 1], callback);
                            }
                        ], function(err){

                        })
                    }
                } else { //down
                    if(key !== $scope.sections.length -1){
                        temp = $scope.sections[key];
                        $scope.sections[key] = $scope.sections[key+1];
                        $scope.sections[key + 1] = temp;

                        $async.parallel([
                            function(callback){
                                $scope.sections[key].sortIndex = key + 1;
                                saveSection(url, $scope.sections[key], callback);
                            },
                            function(callback){
                                $scope.sections[key + 1].sortIndex = key + 2;
                                saveSection(url, $scope.sections[key + 1], callback);
                            }
                        ], function(err){

                        })
                    }
                }
            };

            $scope.getSection = function(){
                getSection();
            };
            $scope.newSection = function(){
                updateSection('Add');
            };
            $scope.editSection = function(index){
                updateSection('Edit', index, $scope.sections[index]);
            };
            $scope.deleteSection = function(id){
                deleteSection(id);
            };
        });
}(angular, async));