(function($a){
    'use strict';
    $a.module('ML').controller('loan', function($scope, $rootScope, $http, $modal){
        $rootScope.MLPageDetail = 'Loan';
        $rootScope.tabSelect = 5;
        $scope.enableEdit = false;
        $scope.tabSelected = 'general';
        $scope.selectTab = selectTab;

        var getInfo = function(){
            $http.post('/loan/getInfo', {})
                .success(function(data){
                    // console.log(data);
                    if (data.s) {
                        if (data.d.length === 0) {
                            $scope.createInfo = true;
                            $scope.editInfo = false;
                        } else {
                            $scope.createInfo = false;
                            $scope.editInfo = true;
                            $scope.haveValue = true;
                            $scope.enableEdit = true;
                        }
                        $scope.loans= data.d;
                        $scope.loan = data.d[0];
                    } else {
                        alert('Cannot get infomation')
                    }
                })
                .error(function (err) {
                    alert("Error from Server");
                })
        };
        getInfo();

        function postData(loan, link, listInfo){
            if (!loan.car.interestRate || !loan.car.adjustableRate ||
                !loan.house.interestRate || !loan.house.adjustableRate || !loan.personal.interestRate ||  !loan.personal.adjustableRate) {
                $scope.missingRate = true;
            } else {
                $scope.enableEdit = true;
                $http.post(link, listInfo)
                    .success(function(data){
                        if (data.s) {
                            getInfo();
                        } else {
                            alert('Error while save data!')
                        }
                    })
                    .error(function(err){
                        alert("Error from Server!");
                    })
            }
        }

        function selectTab(tab) {
            $scope.tabSelected = tab;
            if (tab === undefined) $scope.tabSelected = 'general';
        }

        $scope.create = function(loan){
            var link = '/loan/add';
            var listInfo = {postData: loan};
            postData(loan, link, listInfo);
        };

        $scope.save = function(loan){
            var link = '/loan/edit';
            var listInfo = {postData: loan, id: loan._id};
            postData(loan, link, listInfo);
        };

        $scope.delete = function(){
            var obdel = $scope.loans;
            for (var i = 0; i < obdel.length; i++) {
                $http.post('/loan/delete', {id: obdel[i]._id})
                    .success(function (data) {
                        if (!data.error) {

                        } else {
                            alert(data.msg);
                        }
                    })
                    .error(function () {
                        alert('Error from server :(');
                    });
            }
        };

        $scope.editMode = function(){
            $scope.haveValue = false;
        }
    })
}(angular));
