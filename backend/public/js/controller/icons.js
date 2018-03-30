(function($a){
    'use strict';

    $a.module('ML').controller('icons', function($scope, $http, $rootScope, $modal, localStorageService){
        $scope.env = env;
        $rootScope.tabSelect = 8;
        $rootScope.MLPageDetail = 'Icons';
        $scope.listIcon = [];
        $scope.listPrivateIcon = [];
        $scope.currentList = "Released";

        var newItems = 0;

        function updateIcon(iconObject) {
            $http.post('/icons/update', {data: iconObject})
                .success(function(result){
                    if (!result.s) {
                        alert("Edit item due to failed");
                    }
                })
                .error(function(){
                    alert('Error From Server');
                });
        }

        function pushNewIcon(icon, callback){
            $http.post('/icons/create', {icon: icon})
                .success(function(result){
                    if (result.s) {
                        callback(null, result.d);
                    } else {
                        callback("Save icon info failed");
                    }
                })
                .error(function(){
                    callback("Error From Server");
                });
        }
        
        function getList(){
            $http.post('/icons/get', {}).success(function(data){
                $scope.listIcon = data.data;
                localStorageService.add('listIcon', JSON.stringify(data.data));

                $scope.listPrivateIcon = data.privateData;
                localStorageService.add('listPrivateIcon', JSON.stringify(data.privateData));
            }).error(function(){
                alert('Error');
            });
        }
        getList();

        $scope.showIconList = function(list){
            $scope.currentList = list;
        };

        $scope.changeStatus = function(icon, status){
            var url = '';
            var stt = true;

            // if(status === 1) icon.isFree = !icon.isFree;
            // if(status === 2) icon.isNew = !icon.isNew;
            // if(status === 3) icon.isFeature = !icon.isFeature;
            // if(status === 4) icon.isTopDownload = !icon.isTopDownload;
            // if(status === 5) icon.isHide = !icon.isHide;

            if (status === 1) {
                url = '/icons/change-free-status';
                stt = !icon.isFree;
            } else if (status === 2) {
                url = '/icons/change-new-status';
                stt = !icon.isNew;
            } else if (status === 3) {
                url = '/icons/change-feature-status';
                stt = !icon.isFeature;
            }else if (status === 4) {
                url = '/icons/change-top-download-status';
                stt = !icon.isTopDownload;
            } else if (status === 5) {
                url = '/icons/change-hide-status';
                stt = !icon.isHide;
            } else {
                return;
            }

            $http.post(url, {id: icon._id, status: stt})
                .success(function(result){
                    if (result.s) {
                        if (status === 1) icon.isFree = stt;
                        if (status === 2) icon.isNew = stt;
                        if (status === 3) icon.isFeature = stt;
                        if (status === 4) icon.isTopDownload = stt;
                        if (status === 5) icon.isHide = stt;

                        updateIcon({listIcon:$scope.listIcon, listPrivateIcon:$scope.listPrivateIcon});
                    } else {
                        alert('Failed to change this status');
                    }
                })
                .error(function(){
                    alert("Error From Server");
                });

        };

        $scope.addNew = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/icons/info.html',
                controller: ctrlAdd,
                resolve: {
                    listIcon: function() {
                        return $scope.listIcon;
                    },
                    listPrivateIcon: function(){
                        return $scope.listPrivateIcon;
                    }
                }
            });

            modalInstance.result.then(function(iconCallbackObject){
                newItems ++;
                updateIcon(iconCallbackObject);
                $scope.generate();
            }, function(){});
        };

        var ctrlAdd = function($scope, Page, $modalInstance, listIcon, listPrivateIcon) {
            $scope.errorMsg = null;
            $scope.iconInfo = {
                isFree: false,
                isNew: true,
                isPublic: false,
                isShareOnly: false,
                canShareToBuy: false
            };

            $scope.saveIconPack = function(){
                var self = this;
                var fd = new FormData();
                
                if (self.iconInfo.price_vn && self.iconInfo.price_gl && self.iconInfo.price_share && self.iconInfo.price_credit) {
                    self.iconInfo.price_vn = parseInt(self.iconInfo.price_vn);
                    self.iconInfo.price_gl = parseInt(self.iconInfo.price_gl);
                    self.iconInfo.price_share = parseInt(self.iconInfo.price_share);
                    self.iconInfo.price_credit = parseInt(self.iconInfo.price_credit);
                    if (isNaN(self.iconInfo.price_vn)) return alert("Price VND should be number");
                    if (isNaN(self.iconInfo.price_gl)) return alert("Price USD should be number");
                    if (isNaN(self.iconInfo.price_share)) return alert("Price Share should be number");
                    if (isNaN(self.iconInfo.price_credit)) return alert("Price Credit should be number");
                }
                
                fd.append('preview', this.iconInfo.preview);
                fd.append('thumb', this.iconInfo.thumb);
                fd.append('packages', this.iconInfo.link);
                fd.append('packagename', self.iconInfo.product_id);
                $http.post('/icons/upload-package', fd, {
                    headers: {'Content-Type': undefined},
                    transformRequest: $a.identity
                })
                    .success(function(data){
                        if (data.s) {
                            alert('Success');
                            var urlPackage = (data.t)? 'https://statictest.moneylover.me/icon_pack/' : 'https://static.moneylover.me/icon_pack/';

                            self.iconInfo.thumb = urlPackage + 'thumb/' + data.prefix + self.iconInfo.product_id + '_thumb.png';
                            self.iconInfo.preview = urlPackage + 'thumb/' + data.prefix + self.iconInfo.product_id + '_preview.png';
                            self.iconInfo.link = urlPackage + 'pack/' + data.prefix + self.iconInfo.product_id + '.zip';

                            if (self.iconInfo.isPublic) {
                                listIcon.unshift(self.iconInfo);
                            } else {
                                listPrivateIcon.unshift(self.iconInfo);
                            }

                            pushNewIcon(self.iconInfo, function (error, icon) {
                                if (error) return alert(error);

                                // console.log(icon);
                            });

                            $modalInstance.close({listIcon:listIcon, listPrivateIcon:listPrivateIcon});
                        }
                    })
                    .error(function(){
                        alert('Upload error!');
                    });
            };
            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.publicTurn = function(mode, icon){
            if (mode === "Release" ){
                $http.post('/icons/change-public-status', {id: icon._id, status: true})
                    .success(function(result) {
                        if (result.s) {
                            icon.isPublic = true;

                            $scope.listPrivateIcon.forEach(function (iconInfo, key) {
                                if (iconInfo === icon) {
                                    $scope.listPrivateIcon.splice(key, 1);
                                }
                            });

                            $scope.listIcon.unshift(icon);
                            updateIcon({listIcon:$scope.listIcon, listPrivateIcon:$scope.listPrivateIcon});
                        } else {
                            alert("Failed to change this status");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            } else {
                $http.post('/icons/change-public-status', {id: icon._id, status: false})
                    .success(function(result) {
                        if (result.s) {
                            icon.isPublic = false;

                            $scope.listIcon.forEach(function (iconInfo, key) {
                                if (iconInfo === icon) {
                                    $scope.listIcon.splice(key, 1);
                                }
                            });

                            $scope.listPrivateIcon.unshift(icon);
                            updateIcon({listIcon:$scope.listIcon, listPrivateIcon:$scope.listPrivateIcon});
                        } else {
                            alert("Failed to change this status");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }
        };

        $scope.edit = function(icon){
            var modalInstance = $modal.open({
                templateUrl: '/partials/icons/infoEdit.html',
                controller: ctrlEdit,
                resolve: {
                    listIcon: function() {
                        return $scope.listIcon;
                    },
                    iconInfo: function(){
                        return icon;
                    },
                    listPrivateIcon: function(){
                        return $scope.listPrivateIcon;
                    }
                }
            });

            modalInstance.result.then(function(iconCallbackObj){
                updateIcon(iconCallbackObj);
            }, function(){});
        };

        var ctrlEdit = function($scope, Page, $modalInstance, listIcon, iconInfo, listPrivateIcon){
            $scope.iconInfo = iconInfo;
            $scope.existPackpage = false;
            $scope.checkExistPackage = function(){
                var producId = $scope.iconInfo.product_id;
                var whereData = _.where(listIcon, {product_id: producId});
                $scope.existPackpage = whereData.length > 1;
            };

            //$scope.$watch('iconInfo', function(oldValue, newValue){
            //});

            $scope.save = function(){
                var self = this;

                if (self.iconInfo.price_vn && self.iconInfo.price_gl && self.iconInfo.price_share && self.iconInfo.price_credit) {
                    self.iconInfo.price_vn = parseInt(self.iconInfo.price_vn);
                    self.iconInfo.price_gl = parseInt(self.iconInfo.price_gl);
                    self.iconInfo.price_share = parseInt(self.iconInfo.price_share);
                    self.iconInfo.price_credit = parseInt(self.iconInfo.price_credit);
                    if (isNaN(self.iconInfo.price_vn)) return alert("Price VND should be number");
                    if (isNaN(self.iconInfo.price_gl)) return alert("Price USD should be number");
                    if (isNaN(self.iconInfo.price_share)) return alert("Price Share should be number");
                    if (isNaN(self.iconInfo.price_credit)) return alert("Price Credit should be number");
                }

                $modalInstance.close(self.iconInfo);
            };

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.delete = function(icon,list) {
            var ok = confirm("This icon package will be remove.Are you sure?");
            if (!ok) {
                return;
            }

            //gui thong tin file can xoa len server
            $http.post('/icons/delete-pack', icon)
                .success(function (data) {
                    if (data.s) {
                        if (list == "Released") {
                            $scope.listIcon.forEach(function (iconInfo, key) {
                                if (iconInfo === icon) {
                                    $scope.listIcon.splice(key, 1);
                                }
                            });
                        } else {
                            $scope.listPrivateIcon.forEach(function (iconInfo, key) {
                                if (iconInfo === icon) {
                                    $scope.listPrivateIcon.splice(key, 1);
                                }
                            });
                        }
                        updateIcon({listIcon:$scope.listIcon, listPrivateIcon:$scope.listPrivateIcon});
                        alert('Success');
                        // $scope.generate();
                    } else {
                        alert('Failed to delete this icon package');
                    }
                })
                .error(function () {
                    alert('Deleting icon pack error!');
                });
        };

        $scope.generate = function(){
            $http.post('/icons/build', {})
                .success(function(result){
                    if (result.s) {
                        alert('Done');
                    } else {
                        alert('Build cache due to failed');
                    }
                }).error(function(){
                    alert('Error From Server');
                });
        };
    });
}(angular));
