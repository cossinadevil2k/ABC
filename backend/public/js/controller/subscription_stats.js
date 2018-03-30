(function($a){
    $a.module('ML').controller('subscriptionStats', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Subscription Stats';
    });
}(angular));