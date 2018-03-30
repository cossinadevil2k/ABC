(function($a){
    $a.module('ML').controller('subscriptionLog', function($scope, $rootScope, $http, $routeParams, $location){
        $rootScope.tabSelect = 6;
        $rootScope.MLPageDetail = 'Subscription Log';

        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLastPage = true;
        $scope.logs = [];
        var filter = {};

        //get filter
        getFilter();
        function getFilter(){
            filter = $location.search();
            $scope.selectedPlatform = filter.platform || null;
            $scope.selectedProduct = filter.product || null;
            $scope.selectedMarket = filter.market || null;
        }

        var limit = 50;

        function checkPage(){
            $scope.isFirstPage = ($scope.page === 1);
            $scope.isLastPage = ($scope.logs.length < limit);
        }

        function getAll(){
            $scope.isLoading = true;
            var skip = limit * ($scope.page - 1);
            $http.post('/subscription-log/get-all', {skip: skip, limit: limit})
                .success(function(response){
                    if(response.s) {
                        $scope.logs = response.d;
                        $scope.isLoading = false;
                        checkPage();
                    } else {
                        $scope.isLoading = false;
                        alert("Get Log Failed");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        }

        function getByEmail(email){
            $scope.page = 1;

            $http.post('/subscription-log/get-by-user-email', {skip: 0, limit: 0, email: email})
                .success(function(response){
                    if(response.s){
                        $scope.isLoading = false;
                        $scope.logs = response.d;
                        checkPage();
                    } else {
                        $scope.isLoading = false;
                        alert("Get Log Failed or Email not exists");
                    }
                })
                .error(function(){
                    $scope.isLoading = false;
                    alert("Error From Server");
                })
        }

        $scope.getAll = getAll;
        $scope.search = getByEmail;

        $scope.searchKey = function (event, keyword) {
            var keyCode = window.event ? event.keyCode : event.which;
            if(keyCode === 13) getByEmail(keyword);
        };

        $scope.selectQuery = function(category,value){
            if(value === 'all') {
                if (filter[category]) delete filter[category];
            }
            else filter[category] = value;
            $location.path('/subscription-log').search(filter);
        };

        $scope.nextPage = function(value){
            $scope.page += value;
            getAll();
        };
    });
}(angular));