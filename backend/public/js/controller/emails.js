(function($a){
    'use strict';
    var initQuest = 'Bạn thực sự muốn thực hiện thao tác này?';

    $a.module('ML').controller('emails', function($scope, $http, $rootScope, $modal){
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Email';
        $scope.addNewMail = true;
        $scope.listMail = [];
        $scope.createMail = 0;
        $scope.emailInfo = {};

        $scope.getList = function(){
            this.searchKeyword = '';
            $scope.createMail = 0;
            $http.post('/emails/list', {})
                .success(function(data){
                    if(data.err) alert(data.msg);
                    else $scope.listMail = data.data;
                })
                .error(function(){
                    alert('Error');
                });
        };

        $scope.openActions = function (mail) {
            var modalInstance = $modal.open({
                templateUrl: 'partials/emails/openActions.html',
                controller: mobileController,
                resolve: {
                    email: function () {
                        return mail;
                    }
                }
            });
        };

        var mobileController = function($scope, $modalInstance, email) {
            $scope.mail = email;
            $scope.send = function (mail) {
                sendMail(mail);
                $modalInstance.dismiss('cancel');
            };
            $scope.editMail = function (mail, createMail) {
                editEmail(mail, createMail);
                $modalInstance.dismiss('cancel');
            };
            $scope.deleteMail = function (mail) {
                deleteEmail(mail);
                $modalInstance.dismiss('cancel');
            }
        };

        $scope.send = sendMail;

        function sendMail(mail) {

            var modalInstance = $modal.open({
                templateUrl: '/partials/emails/send.html',
                controller: ctrlSend,
                resolve: {
                    mailInfo: function() {
                        return mail;
                    }
                }
            });

            modalInstance.result.then(function() {
            }, function() {});
        }

        var ctrlSend = function($scope, Page, $modalInstance, mailInfo) {
            $scope.mailInfo = mailInfo;
            $scope.mailInfo.condition = {};
            $scope.supportSend = [
                {name: 'Tất cả', keyword: ''},
                {name: 'Purchased', keyword: 'purchased'}
            ];
            $scope.isLoading = false;

            var getQueryList = function(){
                $http.post('/search-query/get',{skip: 0, limit: 1000, type: "user"})
                    .success(function(result){
                        if (result.s) $scope.queryList = result.d;
                        else alert("Get query list failed");
                    })
                    .error(function(){
                        alert("Error From Server");
                    })
            };
            getQueryList();

            var sendMail = function(email, list, query){
                $scope.isLoading = true;
                $http.post('/emails/send', {email: email, toList: list, query: query})
                    .success(function (data) {
                        $scope.isLoading = false;
                        $modalInstance.close();
                    });
            };

            var readFile = function(callback){
                var file = document.getElementById("mailList").files[0];
                var mailListFromFile = [];

                var reader = new FileReader();

                reader.onload = function(e){
                    var text = reader.result.toString();
                    var a = text.split('\n');
                    mailListFromFile = a;
                    callback(mailListFromFile);
                };

                reader.readAsText(file, "utf-8");
            };

            $scope.send = function(mail, toList, mode, query){
                var ok = prompt('Type "moneylover" để xác nhận');
                if (ok !=='moneylover') {
                    return;
                }

                if (mode == 'manual'){
                    if (mail && toList){
                        var newToList = toList.split(",");
                        newToList.forEach(function (elm, index) {
                            newToList[index] = elm.trim();
                        });
                        sendMail(mail, newToList, false);
                    }
                } else if (mode == 'file'){
                    if (!mail) return;

                    readFile(function (emailList) {
                        sendMail(mail, emailList, false);
                    });
                } else if (mode == 'search_query') {
                    if (mail && query) {
                        sendMail(mail, false, query);
                    }
                }
            };

            $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.deleteMail = deleteEmail;
        function deleteEmail(mail) {
            var s = confirm(initQuest);
            if(s){
                $http.post('/emails/delete', {mail: mail})
                    .success(function(data){
                        if(data.err) alert(data.msg);
                        else mail.isDelete = true;
                    });
            }
        }

        $scope.writeMail = function(){
            $scope.createMail = 1;
            $scope.addNewMail = true;
            $scope.emailInfo = {};
            $scope.titleFormMail = 'Write mail';
        };

        $scope.editMail = editEmail;
        function editEmail(mail) {
            $scope.createMail = 1;
            $scope.addNewMail = false;
            $scope.emailInfo = mail;
            $scope.titleFormMail = 'Edit mail';
            // this.createMail = 1;
        }

        $scope.submitMail = function(emailInfo){
            if(emailInfo.subject && emailInfo.content && emailInfo.name && emailInfo.from_email && emailInfo.from_name){
                $http.post('/emails/submit', {mail: emailInfo, type: $scope.addNewMail})
                    .success(function(data){
                        if(data.err) alert(data.msg);
                        else $scope.getList();
                    });
            } else alert('Hãy nhập đầy đủ thông tin.');
        };
    })
}(angular));
