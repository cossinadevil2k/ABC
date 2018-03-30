(function($a){
    'use strict';
    $a.module('ML').controller('helpdeskFaqDetail', function($scope, $http, $routeParams, $rootScope){
        $rootScope.tabSelect = 5;
        $rootScope.MLPageDetail = 'FaQ Details';

        $scope.isLoading = true;

        $scope.isWarning = false;
        $scope.isError = false;
        $scope.isSuccess = false;
        $scope.links = [];
        var mode = "create";

        $scope.languages = [
            {
                _id: 'vi',
                name: 'Vietnamese'
            },
            {
                _id: 'en',
                name: 'English'
            }
        ];

        $scope.platforms = [
            {
                _id: 'android',
                name: 'Android'
            },
            {
                _id: 'ios',
                name: 'iOS'
            },
            {
                _id: 'wp',
                name: 'Windows Phone'
            },
            {
                _id: 'win',
                name: 'Windows'
            },
            {
                _id: 'mac',
                name: 'Mac OS X'
            },
            {
                _id: 'web',
                name: 'Web'
            }
        ];
        $scope.allPlatformChecked = false;

        $scope.checkAllPlatform = function(){
            $scope.allPlatformChecked = !$scope.allPlatformChecked;
            if($scope.allPlatformChecked) {
                $scope.item.platform = ['android','ios','wp','win','mac','web'];
            } else {
                $scope.item.platform = [];
            }
        };

        var getMultiFaq = function(list){
            $scope.isLoading = true;
            $http.post('/helpdesk/faq/get-multi', {listId: list})
                .success(function(data){
                    $scope.isLoading = false;
                    $scope.links = data;
                }).error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        };

        var bindData = function(){
            if($routeParams.faq_id){
                mode = "edit";
                $scope.isLoading = true;
                $http.post('/helpdesk/faq/get-one', {faqId: $routeParams.faq_id})
                    .success(function(data){
                        $scope.isLoading = false;
                        if(data.s) {
                            $scope.item = data.d;
                            if($scope.item.platform && $scope.item.platform.length===6 ) $scope.allPlatformChecked = true;
                            if($scope.item.links && $scope.item.links.length > 0){
                                getMultiFaq($scope.item.links);
                            }
                        }
                        else alert("Get Item Failed");
                    })
                    .error(function(){
                        $scope.isLoading = false;
                        alert("Error From Server");
                    })
            } else mode = "create";
        };
        bindData();

        var getSection = function(){
            $scope.isLoading = true;
            $http.post('/helpdesk/section/get', {})
                .success(function(data){
                    $scope.isLoading = false;
                    if(data.s){
                        $scope.sections = data.d;
                    } else alert("Get Section Failed");
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        };
        getSection();

        $scope.platformChanged = function(platform_id){
            if($scope.item.platform){
                if(platform_id === 'all'){
                    $scope.item.platform = [platform_id];
                } else {
                    var exist = $scope.item.platform.indexOf(platform_id);
                    if (exist === -1) $scope.item.platform.push(platform_id);
                    else $scope.item.platform.splice(exist, 1);
                }
            } else {
                $scope.item.platform = [platform_id];
            }
        };

        $scope.submitForm = function(){

            if(!$scope.item.language || !$scope.item.section || !$scope.item.platform || $scope.item.platform.length === 0){
                $scope.isWarning = true;
            } else {
                var url = '';
                if(mode === "create") url = '/helpdesk/faq/add';
                else url = '/helpdesk/faq/edit';

                var btnSubmit = document.getElementById('btnSubmit');
                btnSubmit.value = "I doing... :v";
                btnSubmit.setAttribute('disabled','true');

                $http.post(url, $scope.item)
                    .success(function(data){
                        btnSubmit.value = "Submit";
                        btnSubmit.removeAttribute('disabled');
                        if(data.s){
                            $scope.isSuccess = true;
                        } else $scope.isError = true;
                    })
                    .error(function(){
                        btnSubmit.value = "Submit";
                        btnSubmit.removeAttribute('disabled');
                        $scope.isError = true;
                    });
            }
        };

        $scope.addLink = function($item, $model, $label){
            if($scope.links.indexOf($item) === -1){
                $scope.links.push($item);
                if(!$scope.item.links) {
                    $scope.item.links = [];
                }
                $scope.item.links.push($item._id);
                if(!$scope.item.otherLanguage) $scope.item.otherLanguage = [];
                $scope.item.otherLanguage.push($item.language);
            }
        };

        $scope.removeLink = function(index){
            $scope.links.splice(index, 1);
            $scope.item.links.splice(index, 1);
            $scope.item.otherLanguage.splice(index, 1);
        };

        $scope.filterFaq = function(term){
            var postData = {
                term: term,
                sectionId: $scope.item.section,
                linkedList: $scope.item.links || [],
                otherLanguage: $scope.item.otherLanguage || []
            };
            if($scope.item.section._id) postData.sectionId = $scope.item.section._id;
            else postData.sectionId = $scope.item.section;

            return $http.post('/helpdesk/faq/filter', postData)
                .then(function(response){
                    return response.data;
                });
        };
    });
}(angular));