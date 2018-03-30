(function ($a) {
    'use strict';
    $a.module('ML').controller('landingpage', function ($scope, $rootScope, $modal, $routeParams, $http, $q){
        $rootScope.tabSelect = 11;
        $rootScope.MLPageDetail = 'Landing Page Manager';        
        $scope.landing ={};
        $rootScope.enable = false;
        $rootScope.item ={};
        $scope.$on('$viewContentLoaded', function(){
            //console.log('ban da vao dsay')
            $q.all([
                loadContent(),
            ]).then(function (response){
                let loadContentResolve = response[0];

                $scope.landing = loadContentResolve;
            })
        })

        function loadContent(){
            let url = '/api/landing_page/loadbrowse';
            let deferred = $q.defer();
            
            $http({
                method: 'POST',
                url: url
            }).then(function successCallback(response){
                if(response.status ==200){
                    if(response.data.status){
                        //console.log('gia tri tra ve kkhi laod trang:',response.data.data)
                        $scope.landing = response.data.data;
                        deferred.resolve(response.data.data)
                    } else {
                        deferred.reject();
                        alert('Get list url error!')
                    }
                }
            }, function errorCallback(response){
                deferred.reject();
                alert(response.status);
            });

            return deferred.promise;
        }

        $scope.send = function(item){
            console.log('gia tri rootscope:', $rootScope)
                             
        }
        $scope.create = function(){
            var modalInstance = $modal.open({
                templateUrl : '/partials/landing_page/create.html',
                controller: ctrlCreate,               
                resolve: {
                    landing: function(){
                        return $scope.landing;
                    }
                }
            });
            modalInstance.result.then(function (data) {

            });
        };

        function ctrlCreate($scope, $modalInstance, landing){
            $scope.init = function(){
                $scope.Lists = [
                    {name: "finsify.com", status: 1 },
                    {name: "moneylover.me", status: 1},
                    {name: "moneylover.vn", status: 1}
                ];
                $scope.landing = landing;
            }();            

            $scope.save = function(landing){
                let url = '/api/landing_page/create';
                let params = {
                    subdomain: landing.subdomain,
                    domain: landing.domain,
                    url: landing.url,
                    folder: landing.folder,
                    status: 'Pending',

                }

                $http({
                    method: 'POST',
                    url: url,
                    data: params
                }).then( function successCallback(response){
                    if(response.status ==200){
                        if(response.data.status){
                            $modalInstance.close(response.data.data); 
                        loadContent()                       
                    }
                    }
                }, function errorCallback(response){
                    alert(response.status)
                })
            }
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };     
        }
    })
}(angular));