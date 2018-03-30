(function($a){
    'use strict';

    $a.module('ML').controller('sendpremiumcode', function($scope, $rootScope, $http, $location){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Send Premium Code';

        $scope.userInfo = {
            lang: "vi"
        };

        $scope.mode = 'single';

        $scope.send = function(info){
            if ($scope.mode == 'single') singleModeSend(info);
            else multiModeSend(info);
        };

        var singleModeSend = function(userInfo){
            if(userInfo.email && userInfo.email!==""){
                checkCodeEverSent(userInfo.email, function(result){
                    if(result){
                        if(result.length > 0){
                            var ok = confirm("Email này đã từng được gửi hoặc đã được một admin kích hoạt premium, bạn có chắc muốn gửi lại không?");
                            if(ok){
                                sendMail(userInfo);
                            }
                        } else {
                            sendMail(userInfo);
                        }
                    } else {
                        alert("checking error");
                    }
                });
            } else {
                alert("Please complete this form")
            }
        };

        var multiModeSend = function(userInfo){
            if (!userInfo.list_email) return;

            var list = userInfo.list_email.split(',');

            for (var i = 0; i < list.length; i++){
                if (validateEmail(list[i].trim())) list[i] = list[i].trim();
                else return alert(list[i].trim() + ' is not email');
            }


        };

        var sendMail = function(userInfo){
            $http.post('/user/send-premium-code', userInfo)
                .success(function(data){
                    if(data.s){
                        alert("All Done!")
                    } else {
                        alert(data.msg);
                    }
                })
                .error(function(){
                    alert("Error From Server");
                })
        };

        var checkCodeEverSent = function(email, callback){
            $http.post('/premiumlog/search-email', {keyword: email})
                .success(function(data){
                    if(data.s){
                        callback(data.d);
                    } else {
                        callback(false);
                    }
                })
                .error(function(){
                    alert("Error From Server");
                })
        };

        var validateEmail = function(email){
            var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
            return re.test(email);
        }
    })
}(angular));