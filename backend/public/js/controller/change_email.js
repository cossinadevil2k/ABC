(function($a){
    'use strict';
    $a.module('ML').controller('change_email', function($scope, $rootScope, $http) {
        $rootScope.MLPageDetail = 'Change Email';
        $rootScope.tabSelect = 7;
        $scope.changeLoad = false;

        $scope.acceptChange = function(){
            var confirmAccept = confirm("Are you really want to change?");
            if(confirmAccept) {
                var self = this;
                this.errorMessage = "";
                this.successMessage = "";
                $scope.changeLoad = true;
                $http.post('/change-email', {old: this.email.old, new: this.email.new})
                    .success(function(result){
                        $scope.changeLoad = false;
                        if (result.s) self.successMessage = "Success";
                        else self.errorMessage = result.m;
                    })
                    .error(function(){
                        $scope.changeLoad = false;
                        self.errorMessage = "Error from server";
                    });
            }
        };
    });
}(angular));
