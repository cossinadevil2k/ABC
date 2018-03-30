(function($a){
    'use strict';
    var app = $a.module('ML',[]);
    app.controller('resetPassword', function($scope, $http){
        $scope.passwordError = false;
        $scope.passwordErrorMessage = 'Password is too short';
        $scope.retypePasswordError = false;
        $scope.retypePasswordMessage = 'Retype password and password are not match';
        $scope.message = 'Enter your new password';
        $scope.submitError = false;
        $scope.submitSuccess = false;
        $scope.isSuccess = false;

        function init(){
            $scope.passwordError = false;
            $scope.passwordErrorMessage = 'Password is too short';
            $scope.retypePasswordError = false;
            $scope.retypePasswordMessage = 'Retype password and password are not match';
            $scope.message = 'Enter your new password';
            $scope.submitError = false;
            $scope.submitSuccess = false;
        }

        $scope.submitForm = function(userInfo){
            init();
            if (userInfo.password.length < 6) {
                $scope.passwordError = true;
                $scope.passwordErrorMessage = 'Password is too short';
                return;
            }

            if (userInfo.password != userInfo.repassword) {
                $scope.retypePasswordError = true;
                $scope.retypePasswordMessage = 'Retype password and password are not match';
                return;
            }

            $http.post('/reset-password', {user: userInfo}).success(function(data) {
                // console.log(data);
                if (data.error) {
                    $scope.submitError = true;
                    $scope.message = 'Change password failed';
                } else {
                    $scope.submitSuccess = true;
                    $scope.message = 'Congrats! Your password has been changed successfully. Now you can open Money Lover app and login with new password.'
                }
            }).error(function() {
                $scope.submitError = true;
                $scope.message = 'Error from server, please try again later';
            });
        };
    });
}(angular));