(function($a){
    'use strict';
    $a.module('ML').controller('navigation', function($scope,$rootScope, Page, $location, $http) {

        $scope.permission = null;
        $scope.adminSystem = false;
        $scope.roles = [];

        var NAVIGATION_BAR = {
            'DASHBOARD' : 'Dashboard',
            'USERS' : 'Users',
            'PRODUCTS' : 'Products',
            'MARKETING' : 'Marketing',
            'HELPDESK' : 'Helpdesk',
            'SUBSCRIPTION' : 'Subscription',
            'TOOLS' : 'Tools',
            'RECEIPTS' : 'Receipts',
            'SETTINGS' : 'Settings',
            'LANDINGPAGE': 'LandingPage',
        };

        var PERMISSION = {
            'ADMIN' : 'Admin',
            'DEV' : 'Dev',
            'MARKETING' : 'Marketing',
            'SUPPORT' : 'Support',
            'VOLUNTEER' : 'Volunteer'
        };

        function setRole(permission){
                    $scope.roles[NAVIGATION_BAR.DASHBOARD] = true;
                    $scope.roles[NAVIGATION_BAR.USERS] = true;
                    $scope.roles[NAVIGATION_BAR.PRODUCTS] = true;
                    $scope.roles[NAVIGATION_BAR.MARKETING] = true;
                    $scope.roles[NAVIGATION_BAR.HELPDESK] = true;
                    $scope.roles[NAVIGATION_BAR.SUBSCRIPTION] = true;
                    $scope.roles[NAVIGATION_BAR.TOOLS] = true;
                    $scope.roles[NAVIGATION_BAR.RECEIPTS] = true;
                    $scope.roles[NAVIGATION_BAR.SETTINGS] = true;
                    $scope.roles[NAVIGATION_BAR.LANDINGPAGE] = true
            switch (permission) {
                case PERMISSION.ADMIN:
                    break;
                case PERMISSION.DEV:
                    break;
                case PERMISSION.MARKETING:
                    $scope.roles[NAVIGATION_BAR.DASHBOARD] = true;
                    $scope.roles[NAVIGATION_BAR.USERS] = false;
                    $scope.roles[NAVIGATION_BAR.PRODUCTS] = false;
                    $scope.roles[NAVIGATION_BAR.MARKETING] = true;
                    $scope.roles[NAVIGATION_BAR.HELPDESK] = false;
                    $scope.roles[NAVIGATION_BAR.SUBSCRIPTION] = false;
                    $scope.roles[NAVIGATION_BAR.TOOLS] = false;
                    $scope.roles[NAVIGATION_BAR.RECEIPTS] = false;
                    $scope.roles[NAVIGATION_BAR.SETTINGS] = false;
                    $scope.roles[NAVIGATION_BAR.LANDINGPAGE] = true;
                    break;
                case PERMISSION.SUPPORT:
                    $scope.roles[NAVIGATION_BAR.DASHBOARD] = true;
                    $scope.roles[NAVIGATION_BAR.USERS] = true;
                    $scope.roles[NAVIGATION_BAR.PRODUCTS] = false;
                    $scope.roles[NAVIGATION_BAR.MARKETING] = false;
                    $scope.roles[NAVIGATION_BAR.HELPDESK] = true;
                    $scope.roles[NAVIGATION_BAR.SUBSCRIPTION] = false;
                    $scope.roles[NAVIGATION_BAR.TOOLS] = false;
                    $scope.roles[NAVIGATION_BAR.RECEIPTS] = false;
                    $scope.roles[NAVIGATION_BAR.SETTINGS] = false;
                    $scope.roles[NAVIGATION_BAR.LANDINGPAGE] = true;
                    break;
                case PERMISSION.VOLUNTEER:
                    $scope.roles[NAVIGATION_BAR.DASHBOARD] = true;
                    $scope.roles[NAVIGATION_BAR.USERS] = false;
                    $scope.roles[NAVIGATION_BAR.PRODUCTS] = false;
                    $scope.roles[NAVIGATION_BAR.MARKETING] = false;
                    $scope.roles[NAVIGATION_BAR.HELPDESK] = false;
                    $scope.roles[NAVIGATION_BAR.SUBSCRIPTION] = false;
                    $scope.roles[NAVIGATION_BAR.TOOLS] = false;
                    $scope.roles[NAVIGATION_BAR.RECEIPTS] = true;
                    $scope.roles[NAVIGATION_BAR.SETTINGS] = false;
                    $scope.roles[NAVIGATION_BAR.LANDINGPAGE] = true;
                    break;
                default:
                    break;
            }
        }

        $rootScope.$on('adminPermission',function(event,data){
            $scope.permission = data.data.permission;
            $scope.adminSystem = data.data.adminSystem;
            setRole($scope.permission);
        });

        $scope.tab = function(tabs) {
            this.tabSelect = tabs;
        };

        var checkEnv = function(){
            if (env !== 'production') {
                $a.element(document).find('#backend_logo').attr('style','background-color: #d35400;');
            }
        };

        var loadContent = function(){
            $http.get("/changelog.txt")
                .success(function (response){
                    var no = response.trim().split(' ');
                    $scope.currentVersion = no[3];
                }).error(function(){
                alert("Error load changelog");
            });
        };
        checkEnv();
        loadContent();
    })
}(angular));
