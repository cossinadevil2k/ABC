(function ($a) {
    'use strict';

    $a.module('ML').controller('find', function ($scope, $rootScope, $http) {
        //$rootScope.tabSelect = 2;
        $rootScope.MLPageDetail = 'Find Category, Transaction, Wallet by ID';
        $scope.result = {};

        // function checkItemIdExist(itemId) {
        //     if (!itemId) {
        //         alert('where is id?');
        //         return;
        //     }

        //     return true;
        // }

        // $scope.findNow = function (find) {
        //     if (find) {
        //         if (find.itemType) {
        //             switch (find.itemType) {
                       
        //                 case "transaction":
        //                     checkItemIdExist(find.itemId);
        //                     $http.get('/info/tran-by-id/' + find.itemId)
        //                         .success(function (data) {
        //                             $scope.result = data;
        //                         })
        //                         .error(function (data) {
        //                             alert("Error From Server");
        //                         });
        //                     break;
        //                 case "category":
        //                     checkItemIdExist(find.itemId);
        //                     $http.get('/info/cate-by-id/' + find.itemId)
        //                         .success(function (data) {
        //                             $scope.result = data;
        //                         })
        //                         .error(function (data) {
        //                             alert("Error From Server");
        //                         });
        //                     break;
        //                 case "wallet":
        //                     checkItemIdExist(find.itemId);
        //                     $http.get('/info/wallet-by-id/' + find.itemId)
        //                         .success(function (data) {
        //                             $scope.result = data;
        //                         })
        //                         .error(function (data) {
        //                             alert("Error From Server");
        //                         });
        //                     break;
        //                 case "user":
        //                     checkItemIdExist(find.itemId);
        //                     $http.post('/info/user', { userId: find.itemId })
        //                         .success(function (data) {
                                    
        //                             $scope.result = data;
        //                         })
        //                         .error(function () {
        //                             alert("Error From Server");
        //                         });
        //                     break;
        //                 case "lw_login_id":
        //                     checkItemIdExist(find.itemId);
        //                     $http.post('/info/wallet-by-login-id', { loginId: find.itemId })
        //                         .success(function (data) {
        //                             $scope.result = data;
        //                         })
        //                         .error(function () {
        //                             alert("Error From Server");
        //                         });
        //                     break;
        //                 case "notification_device_id":
        //                     checkItemIdExist(find.itemId);
        //                     $http.post('/info/device', { did: find.itemId })
        //                         .success(function (result) {
        //                             if (result.s) {
        //                                 $scope.result = result.d;
        //                             }
        //                         })
        //                         .error(function () {
        //                             alert("Error From Server");
        //                         });
        //                     break;
        //                 case "raw_user_id":
        //                     readFile(function (err, idList) {
        //                         if (err) return alert(err);
        //                         // $scope.discount.listEmail = emailList;

        //                         // console.log(idList);
        //                         $http.post('/search-query/mongo-export-email-by-list-userid', { ids: idList })
        //                             .success(function (result) {
        //                                 if (result.s) {
        //                                     $scope.result = { m: 'Export successfully. Please reload page and see notification on the right to screen !!. It is magic '};
        //                                 }
        //                             })
        //                             .error(function () {
        //                                 alert("Error From Server");
        //                             });
        //                     });
        //                     break;
        //                 case "find_user_by_BillId":
        //                     checkItemIdExist(find.itemId);
        //                     $http.get('/info/find-user-by-bill/'+ find.itemId)
        //                         .success(function(data){
        //                             $scope.result = data
        //                         })
        //                         .error(function(data){
        //                             alert("Error From Server");
        //                         });
        //                     break;
                           

        //             }
        //         }
        //     }
        // }

        // function readFile(callback) {
        //     var file = document.getElementById("txtFile").files[0];
        //     if (!file) return callback('Please select email file');

        //     var mailListFromFile = [];

        //     var reader = new FileReader();

        //     reader.onload = function (e) {
        //         var text = reader.result.toString();
        //         var a = text.split('\n');
        //         mailListFromFile = checkNullEmail(a);
        //         callback(null, mailListFromFile);
        //     };

        //     reader.readAsText(file, "utf-8");

        //     function checkNullEmail(list) {
        //         var new_list = [];
        //         list.forEach(function (id) {
        //             if (id != "") {
        //                 new_list.push(id);
        //             }
        //         });
        //         return new_list;
        //     }
        // }
    })
}(angular));