'use strict';

(function ($a) {
    $a.module('ML').controller('info', function ($scope, $rootScope, $http, $modal, $location, $routeParams, $window, $filter) {
        $scope.param = $routeParams;
        $scope.userInfo = null; //thong tin nguoi dung
        $scope.listWallet = []; //danh sach wallet cua userInfo
        $scope.campaign_list = [];
        $scope.walletDetails = null; //thong tin 1 wallet trong listWallet
        $scope.isUserDetailsPage = true;
        $scope.isWalletPage = false;
        $scope.walletDetailsPageNo = null;
        $scope.isFirstPage = false;
        $scope.isLastPage = false;
        var limit = 200;
        $scope.tabSelected = 'working';
        $scope.isLoading = false;
        $scope.walletBalance = {}; //thong tin balance cua cac wallets
        $scope.credits = null;

        var params = $location.search();

        if (params.wallet) {
            getWalletById(params.wallet);
        }

        function getWalletById(id) {
            $scope.isLoading = true;
            $http.get('/info/wallet-by-id/' + id)
                .success(function (result) {
                    $scope.isLoading = false;
                    if (result) {
                        $scope.viewWalletDetails(result);
                    } else {
                        alert("Getting wallet detail failed");
                    }
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error From Server");
                });
        }

        $scope.finsifyDetail = function (userInfo) {
            var url = "https://api.finsify.com/v2/login/private-detail?email=" + userInfo.email + "&19f3fdbce4=19f3fdbce4&pass=7337610&client=Tu5dvG07KVpx6b";
            $window.open(url, '_blank');
        }

        $scope.getWalletDetailsPageNo = function () {
            $scope.walletDetailsPageNo = $scope.listWallet.indexOf($scope.walletDetails);
            if ($scope.walletDetailsPageNo == 0) {
                $scope.isFirstPage = true;
            }
            if ($scope.walletDetailsPageNo == ($scope.listWallet.length - 1)) {
                $scope.isLastPage = true;
            }
        };

        $scope.backToUserDetail = function () {
            $scope.isUserDetailsPage = true;
            $scope.isWalletPage = false;
        };

        var getWalletsInfo = function (userid, callback) {
            $scope.isLoading = true;
            $http.get('/info/acc/' + userid).success(function (data) {
                $scope.isLoading = false;
                callback(data);
            }).error(function () {
                alert('Error');
            });
        };

        var getSkipPassword = function (user) {
            $http.post('/user/get-customer-support', { userId: user._id })
                .success(function (result) {
                    if (result.s) {
                        user.customerSupport = result.d;
                    }
                }).error();
        };

        function getUserInfo() {
            $scope.userInfo = {};
            $http.get('/info/user/' + $scope.param.email).success(function (data) {
                $scope.userInfo = data;
                getSkipPassword($scope.userInfo);
                $scope.getUserWallet();
                getCampaignByUser($scope.userInfo._id);
                getCredit($scope.userInfo._id);
            }).error(function () {
                alert('Error');
            });
        }
        getUserInfo();

        function getBalance(listWallet) {
            var wallet_id_list = [];

            listWallet.forEach(function (wallet) {
                if (!wallet.account_type && !wallet.isDelete) {
                    wallet_id_list.push(wallet._id);
                }
            });

            if (wallet_id_list.length === 0) return 0;

            function formatResult(data) {
                var keys = Object.keys(data);

                var result = {};

                keys.forEach(function (id) {
                    result[id] = [];
                    data[id].forEach(function (balance) {
                        var currency = Object.keys(balance)[0];
                        var amount = $filter('number')(balance[currency], 2);
                        var str;

                        if (keys.length === 1) {
                            str = amount + ' ' + currency;
                        } else {
                            str = amount;
                        }

                        result[id].push(str);
                    });
                });

                return result;
            }

            $http.post('/info/wallet-balance', { wallets: wallet_id_list })
                .success(function (result) {
                    if (result.s) {
                        $scope.walletBalance = formatResult(result.d);
                    } else {
                        alert("Failed to get balances");
                    }
                })
                .error(function () {
                    alert("Error From Server");
                });
        }

        $scope.getUserWallet = function () {
            getWalletsInfo($scope.userInfo._id, function (data) {
                getBalance(data);
                $scope.listWallet = data;
            });
        };

        $scope.nextWallet = function (status) {
            if (!$scope.isFirstPage || !$scope.isLastPage) {
                $scope.walletDetailsPageNo += status;
                $scope.isFirstPage = $scope.walletDetailsPageNo == 0;
                $scope.isLastPage = $scope.walletDetailsPageNo == ($scope.listWallet.length - 1);
            }
            $scope.walletDetails = $scope.listWallet[$scope.walletDetailsPageNo];
        };

        $scope.selectTab = function (tab) {
            if ($scope.tabSelected != tab) $scope.tabSelected = tab;
        };

        $scope.viewWalletDetails = function (walletDetails) {
            $scope.walletDetails = walletDetails;
            $scope.isUserDetailsPage = false;
            $scope.isWalletPage = true;
            //$scope.listWallet = Infomation.listWallet;
        };

        $scope.restoreWallet = function (walletDetails) {
            var ok = confirm('Do you really wanna restore this wallet?');
            if (ok) {
                $http.post('/user/restore-wallet', { walletId: walletDetails._id })
                    .success(function (result) {
                        if (result.s) alert("Done");
                        else alert("Restoring wallet Failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            }
        };

        var directMessageToUser = function (userInfo, message, title) {
            var pushData = {};
            pushData.listUserEmail = [userInfo.email];
            pushData.message = message;
            pushData.name = title;
            $http.post('/helpdesk/issue/add', { pushData: pushData })
                .success(function (data) {

                }).error(function (data) {

                });
        };

        $scope.sendMessage = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/helpdesk/issue/sendMessage.html',
                controller: sendMessageController,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });
        };
        var sendMessageController = function ($modalInstance, $scope, userInfo) {
            $scope.userDetailPage = true;
            $scope.cancel = function (message, title) {
                if (message || title) {
                    var cfmdialog = confirm('Do you really want to cancel?');
                    if (cfmdialog) {
                        $modalInstance.dismiss('cancel');
                    } else {
                        return false;
                    }
                } else {
                    $modalInstance.dismiss('cancel');
                }
            };
            $scope.send = function (message, title) {
                $scope.checkRequired = true;
                if (message && title) {
                    directMessageToUser(userInfo, message, title);
                    $modalInstance.dismiss('cancel');
                }
            };
            $scope.userInfo = userInfo;
        };

        $scope.viewMoreWalletDetails = function (accid, mode) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/morewalletdetails.html',
                controller: ctrlMoreWalletDetails,
                resolve: {
                    accid: function () {
                        return accid;
                    },
                    mode: function () {
                        return mode;
                    }
                }
            });
            modalInstance.result.then(function () { });
        };
        var ctrlMoreWalletDetails = function ($scope, $modalInstance, accid, mode) {
            $scope.env = env;
            $scope.modalPageNo = 0;
            $scope.modalFirstPage = true;
            $scope.modalLastPage = true;
            $scope.arrayInfo = [];
            $scope.info = null;
            $scope.mode = mode;
            $scope.isLoading = false;
            switch (mode) {
                case "Budget":
                    countRecords('budg');
                    getDetail('budg', 1);
                    break;
                case "Category":
                    countRecords('cate');
                    getDetail('cate', 1);
                    break;
                case "Campaign":
                    countRecords('camp');
                    getDetail('camp', 1);
                    break;
                case "Transaction":
                    countRecords('tran');
                    getDetail('tran', 1);
                    break;
                default:
                    break;
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.modalNextPage = function (status) {
                if (status === "first") {
                    $scope.modalPageNo = 0;
                    checkModalPage();
                }
                else if (status === "last") {
                    $scope.modalPageNo = $scope.arrayInfo.length - 1;
                    checkModalPage();
                }
                else {
                    if (!$scope.modalFirstPage || !$scope.modalLastPage) {
                        $scope.modalPageNo += status;
                        checkModalPage();
                    }
                }

                $scope.info = $scope.arrayInfo[$scope.modalPageNo];
            };

            function countRecords(type) {
                var url = '/info/' + type + '/' + accid + '/count';
                $http.get(url)
                    .success(function (data, status) {
                        if (data) {
                            $scope.totalRc = data.totalRc;
                            $scope.isDel = data.deletedRc;

                            var moduled = $scope.totalRc / limit;
                            var totalBigPage = Math.round($scope.totalRc / limit);
                            if (moduled < (limit / 2)) totalBigPage += 1;
                            $scope.totalBigPage = totalBigPage;
                        }
                    })
                    .error(function (data, status) {
                        alert("Counting Errors");
                    });
            }

            function getDetail(type, page) {
                $scope.isLoading = true;
                var url = '/info/' + type + '/' + accid + '?page=' + page;
                $scope.bigPageNo = page;
                $http.get(url).success(function (data, err) {
                    $scope.isLoading = false;
                    $scope.arrayInfo = data;
                    $scope.info = $scope.arrayInfo[0];
                    checkModalPage();
                }).error(function (data, err) {
                    $scope.isLoading = false;
                    alert('error');
                });
            }

            $scope.togglePublic = function (campaign) {
                $http.post('/user/toggle-public-campaign', { id: campaign._id })
                    .success(function (result) {
                        if (!result.s) return alert('Change public state failed');

                        campaign.isPublic = !campaign.isPublic;
                    })
                    .error(function () {
                        alert("Error from server");
                    });
            };

            $scope.nextBigPage = function (mode) {
                var type = "";
                switch ($scope.mode) {
                    case "Transaction":
                        type = 'tran';
                        break;
                    case "Category":
                        type = 'cate';
                        break;
                    case "Campaign":
                        type = 'camp';
                        break;
                    case "Budget":
                        type = 'budg';
                        break;
                }

                if (mode === 'next') {
                    if ($scope.bigPageNo < $scope.totalBigPage) getDetail(type, $scope.bigPageNo + 1);
                } else {
                    if ($scope.bigPageNo > 1) getDetail(type, $scope.bigPageNo - 1);
                }
                $scope.modalPageNo = 0;
            };

            var checkModalPage = function () {
                if ($scope.arrayInfo.length === 0) {
                    $scope.modalFirstPage = true;
                    $scope.modalLastPage = true;
                } else {
                    $scope.modalFirstPage = $scope.modalPageNo === 0;

                    $scope.modalLastPage = $scope.modalPageNo === ($scope.arrayInfo.length - 1);
                }
            };
        };

        $scope.iconGift = function (user) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/users/icon-gift.html',
                controller: ctrlIconGift,
                resolve: {
                    icon_purchased: function () {
                        return user.icon_package;
                    },
                    user_id: function () {
                        return user._id;
                    },
                    user_email: function () {
                        return user.email;
                    }
                }
            });

            modalInstance.result.then(function () {
            }, function () { });
        };

        var ctrlIconGift = function ($scope, $modalInstance, $http, icon_purchased, user_id, user_email) {
            $scope.userInfo = {
                id: user_id,
                email: user_email,
                icon_purchased: icon_purchased
            };

            $scope.productType = "1";
            $scope.creditList = [];
            $scope.premiumList = [];
            $scope.subscriptionList = [];
            $scope.iconList = [];
            $scope.semiPremiumList = [];

            $scope.send = function () {
                if (!this.gift.reason) {
                    return alert('Please type your reason');
                }

                switch (this.productType) {
                    case "1":
                        sendIconGift(this.gift);
                        break;
                    case "2":
                        sendSubscriptionGift(this.gift, 'premium');
                        break;
                    case "4":
                        sendSubscriptionGift(this.gift, 'linked_wallet');
                        break;
                    case "3":
                        sendCreditGift(this.gift);
                        break;
                    case "5":
                        sendPremiumGift(this.gift);
                        break;
                    case "6":
                        sendSemiPremiumGift(this.gift);
                        break;
                    default:
                        break;
                }
            };

            function sendSemiPremiumGift(gift) {
                if (!gift.semi_premium) {
                    alert('Please select semi_premium package');
                }

                var productInfo;

                $scope.semiPremiumList.forEach(function (item) {
                    if (item._id == JSON.parse(gift.semi_premium)._id) {
                        productInfo = item;
                    }
                });

                var platform;
                if (productInfo) {
                    var str = productInfo.metadata.split(",");
                    str.forEach(function (item) {
                        var key = item.split(":")[0];
                        var value = item.split(":")[1];

                        if (key == 'platform') {
                            platform = value;
                        }
                    });
                }
                var postData = {
                    userId: user_id,
                    productId: productInfo.product_id,
                    platform: platform
                };
                // console.log(postData);
                $http.post('/user/send-semi-gift', postData)
                    .success(function (result) {
                        if (!result.status) {
                            return alert('Send semi premium gift due to failed');
                        }
                        // console.log(result.data);
                        $modalInstance.dismiss('cancel');
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }

            function sendSubscriptionGift(gift, type) {
                if (!gift.subscription) {
                    alert('Please select subscription package');
                }

                var productInfo = $scope.subscriptionList[gift.subscription];
                var postData = {
                    userId: user_id,
                    productId: productInfo.product_id,
                    unit: productInfo.expire_unit,
                    value: productInfo.expire_value,
                    type: type
                };

                $http.post('/user/send-subscription', postData)
                    .success(function (result) {
                        if (!result.s) {
                            return alert('Send subscription gift due to failed');
                        }

                        $modalInstance.dismiss('cancel');
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }

            function sendCreditGift(gift) {
                if (!gift.credit) {
                    return alert('Please select credit product');
                }

                gift.credit = JSON.parse(gift.credit);

                var postData = {
                    user_id: user_id,
                    user_email: user_email,
                    reason: gift.reason,
                    product_id: gift.credit.product_id
                };

                $http.post('/user/send-credit', postData)
                    .success(function (result) {
                        if (!result.s) {
                            return alert('Send credit gift due to failed');
                        }

                        $modalInstance.dismiss('cancel');
                    })
                    .error(function () {
                        alert('Error From Server');
                    });
            }

            function sendIconGift(gift) {
                if (!gift.icon) {
                    return alert('Please select an icon');
                }

                var giftInfo = {
                    userId: user_id,
                    userEmail: user_email,
                    reason: gift.reason,
                    iconName: $scope.iconList[gift.icon].name,
                    iconId: $scope.iconList[gift.icon].product_id,
                    iconLink: $scope.iconList[gift.icon].link
                };

                $http.post('/user/send-icon-gift', { giftInfo: giftInfo })
                    .success(function (data) {
                        if (!data.s) {
                            return alert('Send icon gift due to failed');
                        }

                        $modalInstance.dismiss('cancel');
                    })
                    .error(function () {
                        alert('Error while send icon gift');
                    });
            }

            function sendPremiumGift(gift) {
                if (!gift.premium) {
                    return alert('Please select an item');
                }

                gift.premium = JSON.parse(gift.premium);

                var postData = {
                    user_id: user_id,
                    user_email: user_email,
                    product_id: gift.premium.product_id,
                    reason: gift.reason
                };
                $http.post('/user/active-premium', postData)
                    .success(function (result) {
                        if (!result.s) {
                            return alert('Send premium gift due to failed');
                        }

                        $modalInstance.dismiss('cancel');
                    })
                    .error(function () {
                        alert('Error From Server');
                    });
            }

            $scope.checkPurchased = function (item) {
                var purchased = icon_purchased.indexOf(item.product_id);
                return purchased === -1;
            };

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

            function getSemiPremiumList() {
                if ($scope.semiPremiumList.length > 0) {
                    return true;
                }

                $http.post('/premium-products/list', {})
                    .success(function (result) {
                        if (!result.s) {
                            return alert('Get premium product due to failed');
                        }

                        $scope.semiPremiumList = result.d;
                    })
                    .error(function () {
                        alert('Error From Server');
                    });
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

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
                    case '6':
                        getSemiPremiumList();
                        break;
                    default:
                        break;
                }
            };

            function init() {
                getIconList();
            }

            init();
        };

        $scope.showDevice = function (user_id) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/devices.html',
                controller: ctrlListDevices,
                resolve: {
                    user_id: function () {
                        return user_id;
                    }
                }
            });

            modalInstance.result.then(function () {
            }, function () { });
        };
        var ctrlListDevices = function ($scope, Page, $modalInstance, user_id) {
            $scope.listDevices = [];
            //init
            getDeviceList();

            $scope.changeDevMode = function (device) {
                device.isDev = !device.isDev;
                $http.post('/bonus/change-dev-mode-device', { id: device._id, devMode: device.isDev })
                    .success(function (data, err) {
                        alert(data.msg);
                    })
                    .error(function (data, err) {
                        alert("Error from server");
                    });
            };

            function getDeviceList() {
                $http.get('/info/device/' + user_id)
                    .success(function (data, status) {
                        if (data) $scope.listDevices = data;
                    })
                    .error(function (data, status) {
                        alert("Error from server");
                    });
            }

            $scope.copyToken = function (device) {
                return device.tokenDevice;
            };

            $scope.getTokenClicked = function () {
                alert("Token has been copied to clipboard.");
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.changeLimitDevice = function (user) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/users/edit-limit-device.html',
                controller: ctrlLimitDevice,
                resolve: {
                    user: function () {
                        return user;
                    }
                }
            });

            modalInstance.result.then(function () {
            }, function () { });
        };
        var ctrlLimitDevice = function ($scope, $rootScope, $modalInstance, user) {
            $scope.user = user;
            var originalData = {
                limitDevice: $scope.user.limitDevice
            };

            $scope.save = function () {
                var userinfo = {
                    uid: $scope.user._id,
                    limitDevice: $scope.user.limitDevice
                };

                $http.post('/user/changelimitdevice', { userinfo: userinfo })
                    .success(function (data, err) {
                        if (data.err) alert('Error from server');
                        else {
                            $modalInstance.dismiss('cancel');
                        }
                    })
                    .error(function (data, err) {
                        alert("Error from server");
                    });
            };

            $scope.close = function () {
                $scope.user.limitDevice = originalData.limitDevice;
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.addExpire = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/expire-setting.html',
                controller: ctrlAddExpire,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });

            modalInstance.result.then(function () {
                $http.post('/premiumlog/savelog', { email: userInfo.email, action: "Set Expire" })
                    .success(function () { })
                    .error(function () { });
            }, function () { });
        };
        var ctrlAddExpire = function ($scope, $modalInstance, $http, userInfo) {
            $scope.currentExpire = userInfo.expireDate;
            $scope.save = function (data) {
                $http.post('/user/add-expire', { userId: userInfo._id, timeUnit: data.type, timeValue: data.value })
                    .success(function (result) {
                        if (result.s) {
                            getUserInfo();
                            $modalInstance.close();
                        }
                        else alert("Set Expire Date Failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.showNotif = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/messages/sessions.html',
                controller: ctrlShowNotif,
            });
        };
        var ctrlShowNotif = function ($scope, $modalInstance) {
            $scope.userDetailPage = true;
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.showIssues = function (user) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/helpdesk/issue/more_issue.html',
                controller: ctrlIssues,
                resolve: {
                    user: function () {
                        return user;
                    }
                }
            });

            modalInstance.result.then(function () {

            });
        };

        $scope.changeCustomerSupport = function (user) {
            var skiped = user.customerSupport ? false : true;
            var s = confirm("Bạn muốn đổi trạng thái Customer Support của user " + user.email + "?");
            if (s) {
                $http.post('/user/set-customer-support', { userId: user._id, status: skiped })
                    .success(function (result) {
                        if (result.s) {
                            user.customerSupport = skiped;
                        } else alert("Setting customer support failed");
                    }).error(function () {
                        alert('Error From Server');
                    });
            }
        };

        var ctrlIssues = function ($scope, $http, $modalInstance, user) {
            $scope.listIssue = [];
            $scope.user = user;
            $scope.tabSelected = 'open';

            function getList() {
                $http.post('/user/issues', { userId: user._id })
                    .success(function (result) {
                        if (result.s) $scope.listIssue = result.d;
                        else alert("Get Issues Failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            }

            getList();

            $scope.selectTab = function (tab) {
                $scope.tabSelected = tab;
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.manualTag = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/manual-tag.html',
                controller: ctrlManualTag,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });
        };
        var ctrlManualTag = function ($scope, $modalInstance, userInfo) {
            $scope.userInfo = userInfo;
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
            $scope.removeTag = function (item) {
                var cfmdialog = confirm("Do you want remove this tag?");
                if (cfmdialog) {
                    userInfo.tags.splice(item, 1);
                }
            };

            $scope.addTag = function (newTag) {
                if (newTag && newTag.trim().length > 0) {
                    $scope.userInfo.tags.push(newTag);
                    newTag = '';
                    $a.element("#newTag").val('');
                }
            };

            $scope.save = function (newTag) {
                $scope.addTag(newTag);
                $http.post("/user/update-tag", { tags: $scope.userInfo.tags, userId: $scope.userInfo._id })
                    .success(function (result) {
                        if (result.s) {
                            $modalInstance.close();
                        } else {
                            $scope.errorSave = true;
                        }
                    }).error(function () {
                        $scope.errorAdd = true;
                    });
            };
        };

        $scope.showUserInfo = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/user-info.html',
                controller: ctrlUserInfo,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });

            modalInstance.result.then(function () {

            });
        };
        var ctrlUserInfo = function ($scope, $modalInstance, userInfo) {
            $scope.userInfo = userInfo;
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.acceptPurchased = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/users/reason.html',
                controller: ctrlAcceptPurchased,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });

            modalInstance.result.then(function (user) {
                userInfo = user;
            }, function () { });
        };
        var ctrlAcceptPurchased = function ($scope, Page, $modalInstance, userInfo) {
            $scope.userInfo = userInfo;

            $scope.setPurchased = function (userInfo) {
                var purchased = userInfo.purchased ? false : true;
                var s = confirm('Bạn thực sự muốn thực hiện thay đổi này?');
                if (s) {
                    userInfo.purchased = purchased;
                    editUser(userInfo, function (data) {
                        if (data.data) {
                            var action = "";
                            if (data.data.purchased) {
                                action = "free -> premium";
                            } else {
                                action = "premium -> free";
                            }
                            $http.post('/premiumlog/savelog', { email: data.data.email, action: action })
                                .success(function (data) {
                                    if (data.s) {
                                        $modalInstance.close(userInfo);
                                    }
                                })
                                .error(function () {
                                    alert("Error while save admin action");
                                    $modalInstance.close(userInfo);
                                });
                        }
                    });
                }
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        function editUser(userInfo, callback) {
            $http.post('/user/edit', userInfo).success(function (data) {
                callback(data);
            }).error(function (data) {
                callback(data);
            });
        }

        $scope.discountSetting = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/discount.html',
                controller: ctrlDiscount,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });
        };
        var ctrlDiscount = function ($scope, $modalInstance, userInfo) {
            $scope.userInfo = userInfo;

            detectUserDiscount();
            function detectUserDiscount() {
                if (userInfo.tags.length === 0) return 0;

                userInfo.tags.forEach(tag => {
                    if (tag.indexOf('discount:') !== -1) {
                        return $scope.userDiscount = tag.split(':')[1];
                    }
                });
            }

            $scope.submit = function (userDiscount) {
                if (!userDiscount) return 0;

                $scope.isLoading = true;
                $http.post('/user/update-discount', { discount: userDiscount, userId: $scope.userInfo._id })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) $modalInstance.close();
                        else $scope.failMessage = 'Discount setting failed';
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        $scope.failMessage = "Error from server";
                    });
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        function getCampaignByUser(user) {
            $http.post('/info/global-camp', { user: user })
                .success(function (result) {
                    if (result.s) {
                        $scope.campaign_list = result.d;
                    } else {
                        alert('Get campaign due to failed');
                    }
                })
                .error(function () {
                    alert('Error From Server');
                });
        }

        function getCredit(user_id) {
            $http.post('/user/view-credit', { user_id: user_id })
                .success(function (result) {
                    if (result.s) {
                        var credit_type_list = Object.keys(result.d);
                        var output = "";
                        credit_type_list.forEach(function (key, index) {
                            if (index > 0) {
                                output += ', ';
                            }

                            output += key + ' ' + result.d[key];
                        });
                        $scope.credits = output;
                    }
                })
                .error(function () {
                    alert("Error From Server");
                });
        }

        $scope.showReceipt = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/receipt.html',
                controller: ctrlReceipt,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });
        };
        function ctrlReceipt($scope, $modalInstance, userInfo) {
            $scope.receipt_list = [];

            $http.post('/info/receipt', { user: userInfo._id })
                .success(function (result) {
                    if (result.s) {
                        $scope.receipt_list = result.d;
                    } else {
                        alert('Get receipt due to error');
                    }
                })
                .error(function () {
                    alert('Error From Server');
                });

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        $scope.purchase_history = function (userInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/info/purchase_history.html',
                controller: ctrlPurchaseHistory,
                resolve: {
                    userInfo: function () {
                        return userInfo;
                    }
                }
            });
        };
        function ctrlPurchaseHistory($scope, $modalInstance, userInfo) {
            $scope.page = 1;
            $scope.isFirstPage = true;
            $scope.isLastPage = true;
            $scope.isLoading = false;

            $scope.history_list = [];
            var limit = 20;

            getHistory();
            function getHistory() {
                $scope.isLoading = true;
                var skip = limit * ($scope.page - 1);

                $http.post('/user/purchase-history', { user: userInfo._id, skip: skip, limit: limit })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            $scope.history_list = result.d;
                            checkPage();
                        } else {
                            alert('Get purchase history due to failed');
                        }
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }

            function checkPage() {
                $scope.isFirstPage = $scope.page === 1;
                $scope.isLastPage = $scope.history_list.length < limit;
            }

            $scope.nextPage = function (value) {
                $scope.page += value;
                getHistory();
            };

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            };
        }

        $scope.togglePublicWallet = function (wallet) {
            $http.post('/user/toggle-public-wallet', { id: wallet._id })
                .success(function (result) {
                    if (!result.s) return alert('Change public status failed');

                    wallet.isPublic = !wallet.isPublic;

                    if (wallet.isPublic) {
                        var url = 'https://widget.moneylover.me?wallet=' + wallet._id;
                        if (env === 'dev') {
                            url += "?mode=dev";
                        }

                        $modal.open({
                            templateUrl: 'alert.html',
                            controller: ctrlWidgetLinkDialog,
                            resolve: {
                                url: function () {
                                    return url
                                }
                            }
                        });
                    }
                })
                .error(function () {
                    alert('Error From Server');
                });
        };

        function ctrlWidgetLinkDialog($scope, $modalInstance, url) {
            $scope.url = url;

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }

        $scope.changeActivateStatus = function (userInfo) {
            $http.post('/user/change-activate-status', { id: userInfo._id })
                .success(function (result) {
                    userInfo.isDeactivated = !userInfo.isDeactivated;
                })
                .error(function () {
                    alert('Error from server');
                });
        };

        $scope.restoreCredit = function (userInfo) {
            var ok = confirm("User " + userInfo.email + ' will be restore credit default, are you sure?');
            if (ok) {
                $http.post('/receipt/restore-default', { user: userInfo._id })
                    .success(function (result) {
                        alert('success');
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }
        }

        $scope.reactiveFinsifyManual = function (userInfo) {
            var url = "/finsify/reactive-manual";

            $http.post(url, { user: userInfo._id })
                .success(function (result) {
                    alert('success');
                })
                .error(function () {
                    alert('Error from server');
                });
        }

        $scope.fetchTransactionManual = function (wallet) {
            var login_secret;
            var timestamp;

            if (wallet.account_type != 0) {
                if (wallet.rwInfo) {
                    login_secret = wallet.rwInfo.secret;
                } else {
                    var metadata = wallet.metadata;
                    if (typeof wallet.metadata != 'object') {
                        metadata = JSON.parse(wallet.metadata);
                    }

                    login_secret = metadata.secret;
                }

                var url = '/finsify/fetch-transaction-manual';

                $http.post(url, { login_secret: login_secret, timestamp: timestamp })
                    .success(function (result) {
                        alert('Successfully');
                    })
                    .error(function () {
                        alert('Error from server');
                    });

            } else {
                alert('Warning: This is a local wallet');
            }
        };

    });
}(angular));
