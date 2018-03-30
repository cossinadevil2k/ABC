(function($a){
    $a.module('ML').controller('notification-center', function($scope, $http, notificationService){
        $scope.notifications = [];
        var limit = 20;
        
        var tabIsActive = true;
        
        $a.element(window).bind('focus', function(){
            tabIsActive = true;
        }).bind('blur', function(){
            tabIsActive = false;
        });

        function getNotification() {
            $http.post('/partner_notification/get', {skip: 0, limit: limit})
                .success(function (result) {
                    if (result.s) {
                        $scope.notifications = result.d.notification;
                        notificationService.clearNotification();
                        notificationService.updateNotification(result.d.news);
                    }
                })
                .error(function () {
                    alert('Error from Server');
                });
        }

        function notifyMe(message, url){
            if (!tabIsActive) return;
            
            if (!Notification) {
                alert("Your browser is not supported!");
                return;
            }

            if (Notification.permission !== "granted") {
                Notification.requestPermission();
            } else {
                var notification = new Notification("Money Lover NSFW", {
                    icon: '/images/logo2.png',
                    body: message
                });

                notification.onclick = function(){
                    window.open(url);
                }
            }
        }

        var listenSocket = function(){
            var partnerId = document.getElementById("partnerId").value;
            var socket = io('https://socket.moneylover.me/');
            var room = '/partner/notification/' + partnerId;
            socket.on(room, function(message){
                var parsedMessage = JSON.parse(message);
                
                getNotification();
            });
        };

        $scope.deleteNotify = function(index, id){
            $http.post('/partner_notification/delete-one', {nId: id})
                .success(function(result){
                    if(result.s) $scope.notifications.splice(index, 1);
                    else $scope.notifications.splice(index, 1);
                })
                .error(function(){
                    alert('Error From Server');
                });
        };

        $scope.close = function(){
            var notibar = document.getElementById('noticenter');
            notibar.className = 'notification-center';
            $http.post('/partner_notification/mark-all-as-read', {})
                .success(function(result){
                    if(result.s) {
                        notificationService.clearNotification();
                        getNotification();
                    }
                    else notificationService.clearNotification();
                })
                .error(function(){
                    alert('Error From Server');
                });
        };

        $scope.clearAll = function(){
            $http.post('/partner_notification/delete-all', {})
                .success(function(result){
                    if(result.s) $scope.notifications = [];
                    else $scope.notifications = [];
                })
                .error(function(){
                    alert('Error From Server');
                })
        };

        /**
         * runs
         */
        listenSocket();
        getNotification();
    })
}(angular));
