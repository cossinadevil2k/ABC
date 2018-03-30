(function($a){
    $a.module('ML').controller('Gift', function($scope, $rootScope, $http) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Gift';

        $scope.send = function() {
            if (!this.gift.reason) {
                return alert('Please type your reason');
            }
            
            readFile(function(err, emailList) {
                if (err) return alert(err);
                
                $scope.gift.listEmail = emailList;

                switch ($scope.productType) {
                    case "1":
                        sendIconGift($scope.gift);
                        break;
                    case "2":
                        sendSubscriptionGift($scope.gift, 'premium');
                        break;
                    case "4":
                        sendSubscriptionGift($scope.gift, 'linked_wallet');
                        break;
                    case "3":
                        sendCreditGift($scope.gift);
                        break;
                    case "5":
                        sendPremiumGift($scope.gift);
                        break;
                    default:
                        break;
                }
            });
        };

        function sendSubscriptionGift(gift, type) {
            if (!gift.subscription) {
                alert('Please select subscription package');
            }

            var productInfo = $scope.subscriptionList[gift.subscription];
            var postData = {
                listEmail: gift.listEmail,
                productId: productInfo.product_id,
                unit: productInfo.expire_unit,
                value: productInfo.expire_value,
                type: type
            };

            $http.post('/user/send-subscription', postData)
                .success(function(result) {
                    if (!result.s) {
                        return alert('Send subscription gift due to failed');
                    }
                    
                    alert('Send gift to list of user is processing');
                    init();
                })
                .error(function() {
                    alert('Error from server');
                });
        }

        function sendCreditGift(gift) {
            if (!gift.credit) {
                return alert('Please select credit product');
            }

            gift.credit = JSON.parse(gift.credit);

            var postData = {
                listEmail: gift.listEmail,
                reason: gift.reason,
                product_id: gift.credit.product_id
            };

            $http.post('/user/send-credit', postData)
                .success(function(result){
                    if (!result.s) {
                        return alert('Send credit gift due to failed');
                    }
                    
                    alert('Send gift to list of user is processing')
                    init();
                })
                .error(function(){
                    alert('Error From Server');
                });
        }

        function sendIconGift(gift) {
            if (!gift.icon) {
                return alert('Please select an icon');
            }

            var giftInfo = {
                listEmail: gift.listEmail,
                reason: gift.reason,
                iconName: $scope.iconList[gift.icon].name,
                iconId: $scope.iconList[gift.icon].product_id,
                iconLink: $scope.iconList[gift.icon].link
            };

            $http.post('/user/send-icon-gift', {giftInfo: giftInfo})
                .success(function(data){
                    if (!data.s) {
                        return alert('Send icon gift due to failed');
                    }
                    
                    alert('Send gift to list of user is processing');
                    init();
                })
                .error(function(){
                    alert('Error while send icon gift');
                });
        }

        function sendPremiumGift(gift) {
            if (!gift.premium) {
                return alert('Please select an item');
            }

            gift.premium = JSON.parse(gift.premium);

            var postData = {
                listEmail: gift.listEmail,
                product_id: gift.premium.product_id,
                reason: gift.reason
            };
            $http.post('/user/active-premium', postData)
                .success(function(result){
                    if (!result.s) {
                        return alert('Send premium gift due to failed');
                    }
                    
                    alert('Send gift to list of user is processing')
                    init();
                })
                .error(function(){
                    alert('Error From Server');
                });
        }

        function getIconList(){
            if ($scope.iconList.length > 0) {
                return true;
            }

            $http.post('/icons/get', {})
                .success(function(data){
                    if(!data.error){
                        $scope.iconList = data.data;
                    }
                })
                .error(function(data){
                    alert("Error while get icon list");
                });
        }

        function getCreditList(){
            if ($scope.creditList.length > 0) {
                return true;
            }

            $http.post('/use-credits/list', {})
                .success(function(result){
                    if (result.s) {
                        $scope.creditList = result.d;
                    } else {
                        alert('Get credit list due to failed');
                    }
                })
                .error(function(){
                    alert('Error From Server');
                });
        }

        function getPremiumList(){
            if ($scope.premiumList.length > 0) {
                return true;
            }

            $http.post('/premium-products/list', {})
                .success(function(result){
                    if (!result.s) {
                        return alert('Get premium product due to failed');
                    }

                    $scope.premiumList = result.d;
                })
                .error(function(){
                    alert('Error From Server');
                });
        }

        function getSubscriptionList() {
            if ($scope.subscriptionList.length > 0) {
                return true;
            }

            $http.post('/subscription-products/gift', {})
                .success(function(result) {
                    if (!result.s) {
                        return alert('Get subscription product due to failed');
                    }

                    $scope.subscriptionList = result.d;
                })
                .error(function() {
                    alert('Error from server');
                });
        }

        function readFile(callback){
            var file = document.getElementById("txtFile").files[0];
            if (!file) return callback('Please select email file'); 
            
            var mailListFromFile = [];

            var reader = new FileReader();

            reader.onload = function(e){
                var text = reader.result.toString();
                var a = text.split('\n');
                mailListFromFile = checkNullEmail(a);
                callback(null, mailListFromFile);
            };

            reader.readAsText(file, "utf-8");

            function checkNullEmail(list){
                var new_list = [];
                list.forEach(function(email){
                    if (email != "") {
                        new_list.push(email);
                    }
                });
                return new_list;
            }
        }

        $scope.productTypeSelected = function(){
            var type = this.productType;

            switch(type) {
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
            $scope.productType = "1";
            $scope.creditList = [];
            $scope.premiumList = [];
            $scope.subscriptionList = [];
            $scope.iconList = [];
            $scope.gift = {};
            
            getIconList();
        }

        init();
    });
}(angular));
