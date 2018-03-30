(function($a){
    'use strict';
    $a.module('ML').controller('helpdeskFaq', function($scope, $rootScope, $routeParams, $http, $modal){
        $rootScope.tabSelect = 5;
        $rootScope.MLPageDetail = 'Faq Management';

        $scope.languages = [
            {
                _id: 'all',
                name: 'All'
            },
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
                _id: 'all',
                name: 'All'
            },
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

        $scope.option = {};

        $scope.faqs = [];

        $scope.isLoading = true;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = false;
        var limit = 50;

        var checkPage = function(){
            if($scope.page === 1) $scope.isFirstPage = true;
            else $scope.isFirstPage = false;
            if($scope.faqs.length < 50) {
                $scope.isLastPage = true;
            }
            else $scope.isLastPage = false;
        };

        var getSection = function(callback){
            $http.post('/helpdesk/section/get', {})
                .success(function(data){
                    if(data.s) {
                        $scope.sections = data.d;
                        $scope.sections.unshift({_id:"all", name: "All"});
                        callback(true);
                    } else {
                        callback(false);
                        alert("Get Section Failed");
                    }
                })
                .error(function(){
                    callback(false);
                    alert("Error From Server");
                })
        };

        getSection(function(status){
            if(status) $scope.selectedSection = $scope.sections[0];
        });

        $scope.selectedLanguage = $scope.languages[0];
        $scope.selectedPlatform = $scope.platforms[0];
        $scope.faqs = [];


        $scope.selectLanguage = function(index){
            $scope.selectedLanguage = $scope.languages[index];
        };

        $scope.selectPlatform = function(index){
            $scope.selectedPlatform = $scope.platforms[index];
        };

        $scope.selectSection = function(index){
            $scope.selectedSection = $scope.sections[index];
        };

        $scope.$watch('selectedLanguage', function(newvalue, oldvalue){
            if(oldvalue && newvalue !== oldvalue){
                $scope.page = 1;
                getFaq();
            }
        });

        $scope.$watch('selectedPlatform', function(newvalue, oldvalue){
            if(oldvalue && newvalue !== oldvalue){
                $scope.page = 1;
                getFaq();
            }
        });

        $scope.$watch('selectedSection', function(newvalue, oldvalue){
            if(oldvalue && newvalue !== oldvalue){
                $scope.page = 1;
                getFaq();
            }
        });

        var getFaq = function(){
            var query = $scope.option;
            query.limit = limit;
            query.skip = limit * ($scope.page - 1);

            if($scope.selectedSection && $scope.selectedSection._id !== 'all') query.section = $scope.selectedSection._id;
            else query.section = null;
            if($scope.selectedLanguage._id !== 'all') query.language = $scope.selectedLanguage._id;
            else query.language = null;
            if($scope.selectedPlatform._id !== 'all') query.platform = $scope.selectedPlatform._id;
            else query.platform = null;

            $scope.isLoading = true;
            $http.post('/helpdesk/faq/get', query)
                .success(function(data){
                    $scope.isLoading = false;
                    if(data.s) {
                        $scope.faqs = data.d;
                        checkPage();
                    }
                    else alert("Get Faq Failed");
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        };

        getFaq();

        $scope.getFaq = getFaq;

        $scope.changeGlobal = function(index, status){
            $scope.faqs[index].global = status;
            $http.post('/helpdesk/faq/edit', $scope.faqs[index])
                .success(function(data){

                })
                .error(function(){
                    alert("Can't change global status!");
                });

        };

        $scope.changePublish = function(index, status){
            $scope.faqs[index].published = status;
            $http.post('/helpdesk/faq/edit', $scope.faqs[index])
                .success(function(data){

                })
                .error(function(){
                    alert("Can't change publish status!");
                });
        };

        $scope.delete = function(index, faq){
            var s = confirm("Are you sure?");
            if(s){
                $http.post('/helpdesk/faq/delete', {faqId: faq._id})
                    .success(function(data){
                        if(data.s){
                            $scope.faqs.splice(index, 1);
                        } else alert("Can't delete this item :(");
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            checkPage();
            getFaq();
        };


    });
}(angular));
