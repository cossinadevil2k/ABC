(function($a){
    'use strict';

    $a.module('ML').controller('redeem', function($scope, $rootScope, $http, $modal, $routeParams){
        $rootScope.MLPageDetail = "Redeem Details";
        $rootScope.tabSelect = 4;
    })
}(angular));