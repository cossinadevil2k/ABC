(function($a){
    'use strict';
    $a.module('ML').controller('helpdeskEditAutoReplyMessages', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 5;
        $rootScope.MLPageDetail = 'Helpdesk Settings';

        getMessages();

        function getMessages(){
            $http.post('/helpdesk/settings/get-auto-reply-messages', {})
                .success(function(result){
                    if(result.s) {
                        if (result.d) $scope.autoMessages = result.d;
                    } else alert("Getting messages failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        $scope.saveAutoMessages = function(messages){
            if (!messages || !messages.VI || !messages.EN) {
                $scope.errorMessage = 'Messages must not null';
                return 0;
            }

            $scope.errorMessage = '';
            $scope.successMessage = '';

            $http.post('/helpdesk/settings/update-auto-reply-messages', {messages: messages})
                .success(function(result){
                    if (result.s) $scope.successMessage = "Saved!";
                    else $scope.errorMessage = 'Saving messages failed';
                })
                .error(function(){
                    $scope.errorMessage = "Error From Server";
                });
        }
    });
}(angular));