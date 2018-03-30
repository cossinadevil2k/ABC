(function($a){
    'use strict';
    $a.module('ML').controller('navigation', function($scope, $http) {
        $scope.imgRootUrl = (env === 'production') ? 'https://static.moneylover.me/img/icon/provider/' : 'https://statictest.moneylover.me/img/icon/provider/';

        $scope.tab = function(tabs) {
            this.tabSelect = tabs;
        };

        var checkEnv = function(){
            if (env !== 'production') {
                $a.element(document).find('#backend_logo').attr('style','background-color: #454d54;');
            }
        };

        checkEnv();
    })
}(angular));
