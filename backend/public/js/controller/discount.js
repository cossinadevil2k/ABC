(function ($a) {
    $a.module('ML').controller('discountController', function ($scope, $rootScope, $http) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Discount';

        $scope.send = function () {
            readFile(function (err, emailList) {
                if (err) return alert(err);
                $scope.discount.listEmail = emailList;

                switch ($scope.productType) {
                    case "99":
                        sendAllDiscount($scope.discount);
                        break;
                    case "1":
                        // sendIconDiscount($scope.discount);
                        break;
                    case "2":
                        // sendSubscriptionDiscount($scope.discount, 'premium');
                        break;
                    case "4":
                        // sendSubscriptionDiscount($scope.discount, 'linked_wallet');
                        break;
                    case "3":
                        // sendCreditDiscount($scope.discount);
                        break;
                    case "5":
                        // sendPremiumDiscount($scope.discount);
                        break;
                    default:
                        break;
                }
            });
        };

        function sendAllDiscount(discount) {

            var discountInfo = {
                listEmail: discount.listEmail,
                campaign: discount.campaign,
                userDiscount: discount.userDiscount,
                type: $scope.productType
            };

            $http.post('/user/update-discount-list-email', { discountInfo: discountInfo })
                .success(function (data) {
                    if (!data.status) {
                        return alert('Send discount failed');
                    }

                    alert('Sent discount to list of user');
                    init();
                })
                .error(function () {
                    alert('Error while send icon gift');
                });
        }

        function getIconList() {
            if ($scope.iconList.length > 0) {
                return true;
            }

            $http.post('/icons/get', {})
                .success(function (data) {
                    if (!data.error) {
                        $scope.iconList = data.data;
                    }
                })
                .error(function (data) {
                    alert("Error while get icon list");
                });
        }

        function getCreditList() {
            if ($scope.creditList.length > 0) {
                return true;
            }

            $http.post('/use-credits/list', {})
                .success(function (result) {
                    if (result.s) {
                        $scope.creditList = result.d;
                    } else {
                        alert('Get credit list due to failed');
                    }
                })
                .error(function () {
                    alert('Error From Server');
                });
        }

        function getPremiumList() {
            if ($scope.premiumList.length > 0) {
                return true;
            }

            $http.post('/premium-products/list', {})
                .success(function (result) {
                    if (!result.s) {
                        return alert('Get premium product due to failed');
                    }

                    $scope.premiumList = result.d;
                })
                .error(function () {
                    alert('Error From Server');
                });
        }

        function getSubscriptionList() {
            if ($scope.subscriptionList.length > 0) {
                return true;
            }

            $http.post('/subscription-products/gift', {})
                .success(function (result) {
                    if (!result.s) {
                        return alert('Get subscription product due to failed');
                    }

                    $scope.subscriptionList = result.d;
                })
                .error(function () {
                    alert('Error from server');
                });
        }

        function readFile(callback) {
            var file = document.getElementById("txtFile").files[0];
            if (!file) return callback('Please select email file');

            var mailListFromFile = [];

            var reader = new FileReader();

            reader.onload = function (e) {
                var text = reader.result.toString();
                var a = text.split('\n');
                mailListFromFile = checkNullEmail(a);
                callback(null, mailListFromFile);
            };

            reader.readAsText(file, "utf-8");

            function checkNullEmail(list) {
                var new_list = [];
                list.forEach(function (email) {
                    if (email != "") {
                        new_list.push(email);
                    }
                });
                return new_list;
            }
        }

        $scope.productTypeSelected = function () {
            var type = this.productType;

            switch (type) {
                case '1':
                    getIconList();
                    break;
                case '2':
                    getSubscriptionList();
                    break;
                case '3':
                    getCreditList();
                    break;
                case '4':
                    getSubscriptionList();
                    break;
                case '5':
                    getPremiumList();
                    break;
                default:
                    break;
            }
        };

        function init() {
            $scope.productType = "99";
            $scope.creditList = [];
            $scope.premiumList = [];
            $scope.subscriptionList = [];
            $scope.iconList = [];
            $scope.discount = {};

            // getIconList();
        }

        init();
    });
}(angular));
