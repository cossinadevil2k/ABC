(function($a){
    $a.module('ML').controller('notification-center', function($scope, $http, notificationService){
        $scope.notifications = [];
        var limit = 20;

        var MESSAGE_TEMPLATE = {
            ISSUE_ASSIGNED: "Bạn vừa được Assign vào một Issue",
            ISSUE_REPLY: "User vừa trả lời vào Issue bạn đang hỗ trợ",
            CSV_DOWNLOAD: "CSV File đã sẵn sàng để download",
            PUSH_NOTIFICATION_COMPLETE: "Push Notification đã hoàn thành"
        };
        
        var tabIsActive = true;
        
        $a.element(window).bind('focus', function(){
            tabIsActive = true;
        }).bind('blur', function(){
            tabIsActive = false;
        });

        function getNotification() {
            $http.post('/notification/get', {skip: 0, limit: limit})
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
                    icon: '/images/logo2.png?v=1',
                    body: message
                });

                notification.onclick = function(){
                    window.open(url);
                }
            }
        }

        var listenSocket = function(){
            var adminId = document.getElementById("adminId").value;
            var socket = io('https://socket.moneylover.me/');
            var room = '/backend/notification/admin/' + adminId;
            socket.on(room, function(message){
                var parsedMessage = JSON.parse(message);
                if (parsedMessage.type === 'helpdesk_issue') {
                    notifyMe(MESSAGE_TEMPLATE.ISSUE_ASSIGNED, parsedMessage.url);
                } else if (parsedMessage.type === 'helpdesk_issue_reply') {
                    notifyMe(MESSAGE_TEMPLATE.ISSUE_REPLY, parsedMessage.url);
                } else if (parsedMessage.type === 'csv_export') {
                    notifyMe(MESSAGE_TEMPLATE.CSV_DOWNLOAD, parsedMessage.url);
                } else if (parsedMessage.type === 'backend_push') {
                    notifyMe(parsedMessage.content, parsedMessage.url);
                }                
                getNotification();
            });
        };

        $scope.deleteNotify = function(index, id){
            $http.post('/notification/delete-one', {nId: id})
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
            $http.post('/notification/mark-all-as-read', {})
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
            $http.post('/notification/delete-all', {})
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
