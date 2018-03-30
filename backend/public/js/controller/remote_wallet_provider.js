(function($a, document){
    'use strict';
    $a.module('ML').controller('rwProvider', function($http, $scope, $rootScope, $modal){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Remote Wallet Service Manager';
        $scope.imgRootUrl = (env === 'production') ? 'https://static.moneylover.me/img/icon/provider/' : 'https://statictest.moneylover.me/img/icon/provider/';

        var limit = 20;
        $scope.listProvider = [];
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.PROVIDER = {
            1: "SaltEdge",
            2: "Finsify"
        };
        $scope.isLoading = true;
        $scope.isSearchPage = false;
        $scope.filter = null;
        $scope.statistic = null;

        function getStats() {
            $http.post('/remote-wallet/provider/count', {})
                .success(function(result) {
                    if (!result.status) return alert('Get provider stats failed');

                    $scope.statistic = result.data;
                })
                .error(function() {
                    alert('Error from server');
                });
        }
        getStats();

        function validateHexColor(input){
            var regexHexColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
            return regexHexColor.test(input);
        }

        function validateUrl(input) {
            var regexUrl = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
            return regexUrl.test(input);
        }

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.listProvider.length < limit;
        }

        function getList(){
            $http.post('/remote-wallet/get-provider', {skip: limit * ($scope.page -1), limit: limit, filter: $scope.filter})
                .success(function(result){
                    if (result.s) {
                        $scope.listProvider = result.d;
                        $scope.isLoading = false;
                        checkPage();
                    }
                    else alert('Get List Failed');
                })
                .error(function(){
                    alert('Error From Server');
                });
        }
        getList();

        $scope.filterSelect = function(mode){
            if ($scope.filter === mode) {
                return;
            }

            $scope.filter = mode;
            $scope.page = 1;
            getList();
        };

        $scope.backToList = function(){
            $scope.isSearchPage = false;
            $scope.page = 1;
            getList();
        };

        $scope.changeIcon = function(provider){
            var modalInstance = $modal.open({
                templateUrl: '/partials/rw-provider/icon.html',
                controller: ctrlChangeIcon,
                resolve: {
                    provider: function(){
                        return provider;
                    },
                    imgRootUrl: function(){
                        return $scope.imgRootUrl;
                    }
                }
            });

            modalInstance.result.then(function(icon_link){
                provider.icon = icon_link;
            });
        };

        var ctrlChangeIcon = function($scope, $modalInstance, provider, imgRootUrl) {
            $scope.icon = provider.icon;
            $scope.errorMsg = null;
            $scope.imgRootUrl = imgRootUrl;

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
            
            $scope.submit = function(){
                $scope.errorMsg = null;
                var fd = new FormData();
                fd.append('filedata', document.querySelector('#newIcon').files[0]);
                fd.append('imagename', provider.code + '.png');
                fd.append('providerId', provider._id);
                $http.post('/remote-wallet/change-icon', fd, {
                    headers: {'Content-Type': undefined},
                    transformRequest: $a.identity
                })
                .success(function(result){
                    if (result.s) $modalInstance.close(result.icon);
                    else $scope.errorMsg = "Change Icon Failed";
                }).error(function(){
                        $scope.errorMsg = "Error From Server";
                });
            }
        };

        $scope.editMetaSearch = function(provider) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/rw-provider/edit_meta.html',
                controller: ctrlEditMeta,
                resolve: {
                    provider: function(){
                        return provider;
                    }
                }
            });

            modalInstance.result.then(function(meta_search){
                provider.meta_search = meta_search;
            });
        };

        var ctrlEditMeta = function($scope, $modalInstance, provider) {
            $scope.meta = provider.meta_search || "";
            $scope.errorMsg = null;

            $scope.save = function(meta){
                $scope.errorMsg = null;
                $http.post('/remote-wallet/change-meta-search', {meta: meta, id: provider._id})
                    .success(function(result){
                        if (result.s) $modalInstance.close(meta);
                        else $scope.errorMsg = "Edit meta search failed";
                    })
                    .error(function(){
                        $scope.errorMsg = "Error From Server";
                    })
            };

            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.changeDisabled = function(provider) {
            var ok = confirm("Are you sure?");
            if (ok) {
                $http.post('/remote-wallet/change-disabled', {_id: provider._id, disabled: !provider.disabled})
                    .success(function(result){
                        if (result.s) provider.disabled = !provider.disabled;
                        else alert("Change provider disabled status failed");
                    })
                    .error(function() {
                        alert("Error From Server");
                    });
            }
        };

        $scope.changeFree = function(provider) {
            var ok = confirm("Are you sure?");
            if (ok) {
                $http.post('/remote-wallet/change-free', {_id: provider._id, free: !provider.is_free})
                    .success(function(result){
                        if (result.s) provider.is_free = !provider.is_free;
                        else alert("Change provider free status failed");
                    })
                    .error(function() {
                        alert("Error From Server");
                    });
            }
        };

        $scope.changeDebugStatus = function(provider) {
            var ok = confirm("Are you sure?");
            if (ok) {
                $http.post('/remote-wallet/change-debug', {_id: provider._id, debug: !provider.is_debug})
                    .success(function(result){
                        if (result.s) provider.is_debug = !provider.is_debug;
                        else alert("Change provider debug status failed");
                    })
                    .error(function() {
                        alert("Error From Server");
                    });
            }
        };
        
        $scope.changeHasBalance = function(provider) {
            var ok = confirm('Are you sure?');
            
            if (!ok) {
                return;
            }
            
            $scope.isLoading = true;
            var status = !provider.hasBalance;
            
            $http.post('/remote-wallet/change-has-balance', {providerId: provider._id, status: status})
                .success(function(result){
                    $scope.isLoading = false;
                    
                    if (result.s) {
                        provider.hasBalance = status;
                    } else {
                        alert("Change failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        };

        $scope.searchKey = function (event, keyword) {
            var keyCode = window.event ? event.keyCode : event.which;
            if(keyCode === 13) $scope.search(keyword);
        };

        function search(keyword, skip) {
            $scope.isLoading = true;
            $http.post('/remote-wallet/search', {keyword: keyword, limit: limit, skip: skip})
                .success(function(result){
                    $scope.isLoading = false;
                    if (result.s) {
                        $scope.isSearchPage = true;
                        $scope.listProvider = result.d;
                        checkPage();
                    }
                    else alert("Searching provider failed");
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        $scope.search = function(keyword){
            $scope.isLoading = true;
            $scope.page = 1;
            search(keyword, 0);
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            if ($scope.isSearchPage) {
                var skip = limit * ($scope.page - 1);
                search(this.keyword, skip);
            } else getList();
        };

        $scope.goToPage = function(page){
            var p = parseInt(page);
            if (p > 0 && !isNaN(p)) {
                $scope.page = parseInt(page);
                getList();
            }
        };

        $scope.updateProvider = function(){
            var ok = confirm("Remote wallet providers will be updated, are you sure?");
            if (ok) {
                $http.post('/remote-wallet/init-provider-list', {})
                    .success(function(result){
                        if (result.s) alert("Providers are updating");
                        else alert("Provider update failed");
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }
        };

        
        $scope.rebuildCache = function(service){
            var ok = confirm('Cache will be rebuilt, are you sure?');
            if (ok) {
                $http.post('/remote-wallet/build-cache', {service: service})
                    .success(function(result){
                        if(result.s) alert("Cache is being rebuilt");
                        else alert("Cache rebuild failed");
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }
        };

        $scope.showIconlessList = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/rw-provider/iconless.html',
                controller: ctrlIconless,
                resolve: {

                }
            });

            modalInstance.result.then(function(){});
        };

        var ctrlIconless = function($scope, $modalInstance) {
            var limit = 10;
            $scope.page = 1;
            $scope.list = [];
            $scope.isLoading = false;
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.list.length < limit;

            function getList(){
                $scope.isLoading = true;
                $http.post('/remote-wallet/iconless-list', {skip: limit * ($scope.page - 1), limit: limit})
                    .success(function(result){
                        $scope.isLoading = false;
                        if (result.s) {
                            $scope.list = result.d;
                            checkPage();
                        }
                        else alert('Get list failed');
                    }).error(function(){
                        $scope.isLoading = false;
                        alert('Error From Server');
                    });
            }

            getList();

            function checkPage(){
                $scope.isFirstPage = $scope.page === 1;
                $scope.isLastPage = $scope.list.length < limit;
            }

            $scope.nextPage = function(value){
                $scope.page += value;
                getList();
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('close');
            }
        };
        
        $scope.editActions = function(provider){
            var modalInstance = $modal.open({
                templateUrl: '/partials/rw-provider/actions.html',
                controller: ctrlEditActions,
                resolve: {
                    provider: function(){
                        return provider;
                    }
                }
            });
        };
        
        var ctrlEditActions = function($scope, $modalInstance, provider){
            $scope.setting = {};

            getSetting(provider.realId);
            function getSetting(serviceId){
                $http.post('/remote-wallet/provider/action/get', {serviceId: serviceId})
                    .success(function(data){
                        if (data.s) {
                            $scope.setting = data.d;
                            if (!$scope.setting.actions) {
                                $scope.setting.actions = [];
                            }
                        } else {
                            alert("Get data failed");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }

            $scope.addAction = function(){
                var instance2 = $modal.open({
                    templateUrl: '/partials/rw-provider/action_detail.html',
                    controller: ctrlAddAction,
                    resolve: {
                        action: function(){
                            return {
                                color: $scope.setting.color
                            }
                        }
                    }
                });

                instance2.result.then(function(data){
                    $scope.setting.actions.push(data);
                });
            };

            $scope.edit = function(action){
                var instanceEdit = $modal.open({
                    templateUrl: '/partials/rw-provider/action_detail.html',
                    controller: ctrlAddAction,
                    resolve: {
                        action: function(){
                            return action;
                        }
                    }
                });

                instanceEdit.result.then(function(data){
                    action = data;
                });
            };

            $scope.delete = function(index){
                var ok = confirm('Action will be deleted. Are you sure?');

                if (!ok) return;

                $scope.setting.actions.splice(index, 1);
            };

            $scope.save = function(setting){
                var ok = confirm('Are you sure?');

                if (!ok) return;

                if (!setting) return;

                if (setting.color) {
                    if (!validateHexColor(setting.color)) {
                        return alert("Color invalid");
                    }
                }

                $http.post('/remote-wallet/provider/action/save', {serviceId: provider.realId, data: setting})
                    .success(function(result){
                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            alert("Save failed");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        };

        var ctrlAddAction = function($scope, $modalInstance, action){
            $scope.info = action;

            $scope.add = function(info){
                if (!info || !info.name || !info.type || !info.icon) {
                    return alert("Info invalid");
                }

                if (info.color) {
                    if (!validateHexColor(info.color)) {
                        return alert('Color invalid');
                    }
                }

                if (info.metadata) {
                    if (info.type === 'link') {
                        if (validateUrl(info.metadata)) {
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

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        }
    });
}(angular, document));
