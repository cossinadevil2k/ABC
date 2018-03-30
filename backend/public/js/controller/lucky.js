(function($a){
    'use strict';
    $a.module('ML').controller('lucky', function($scope, $rootScope, $http, $modal){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Lucky Item Manager';
        
        $scope.itemList = [];
        getAll();
        function getAll(){
            $http.post('/lucky/get-item', {})
                .success(function(data){
                    if(data.s) $scope.itemList = data.d;
                    else alert("Get Item Failed");
                })
                .error(function(){
                    alert('Error From Server');
                });
        }
        
        $scope.getAll = getAll;
        
        $scope.addNew = function(){
            var modalInstance = $modal.open({
                templateUrl: '/partials/lucky/add.html',
                controller: ctrlAdd,
                resolve: {
                    
                }
            });
            
            modalInstance.result.then(function(newItem){
                $scope.itemList.push(newItem);
            }, function(){});
        };
        
        var ctrlAdd = function($scope, $modalInstance){
            $scope.error = {
                show: false,
                message: ''
            };
            
            getProductId();
            function getProductId(){
                $http.post('/lucky/get-product', {})
                    .success(function(data){
                        if(data.s) $scope.products = data.d;
                    })
                    .error(function(){
                        alert("Error from Server");
                    });
            }
            
            function validateItem(item){
                if(isNaN(item.remain)){
                    // console.log("fuck this shit!");
                    return false;
                } else {
                    if(item.remain < 0) {
                        // console.log('too small');
                        return false;
                    }
                }

                if(isNaN(item.drop)){
                    // console.log('shit again');
                    return false;
                } else {
                    if(item.drop < 0 || item.drop > 10000) {
                        // console.log('read the placeholder now!');
                        return false;
                    }
                }
                
                return true;
            }
            
            $scope.save = function(item){
                item.remain = parseInt(item.remain);
                item.drop = parseInt(item.drop);
                if (item.startDate) item.startDate = moment(item.startDate);
                if (item.expireDate) item.expireDate = moment(item.expireDate);
                
                if(validateItem(item)) {
                    $http.post('/lucky/add-new', item)
                        .success(function(data){
                            if(data.s){
                                getAll();
                            } else {
                                $scope.error.show = true;
                                $scope.error.message = 'Add new item failed';
                            }
                        })
                        .error(function(){
                            $scope.error.show = true;
                            $scope.error.message = 'Error From Server';
                        });
                } else {
                    $scope.error.show = true;
                    $scope.error.message = 'Please type exactly the item info!';
                }
            };
            
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            }
        }
    });
}(angular));
