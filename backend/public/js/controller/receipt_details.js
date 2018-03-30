var opened_list = [];

(function ($a, AWS, moment, Viewer) {
    'use strict';
    $a.module('ML').controller('receiptDetails', function ($scope, $rootScope, $http, $routeParams, $modal, localStorageService) {
        $rootScope.tabSelect = 9;
        $rootScope.MLPageDetail = 'Receipt Manager';

        $scope.receipt = {};
        $scope.categories = [];
        $scope.wallets = [];
        $scope.hasWallet = true;
        $scope.adminName = ADMIN_NAME;

        $scope.btnDoneLabel = 'Create transaction';
        var urlRootImage = (env === 'production') ? 'https://s3-img.moneylover.me' : 'https://s3-img-dev.moneylover.me';
        var imageElement = document.getElementById('myimg');
        $scope.imageReceipt = '';

        var id = $routeParams.id;

        /**
         * setup s3
         */

        // var s3 = new AWS.S3({
        //     accessKeyId: 'AKIAJ7AO6PQZS7S3V2KQ',
        //     secretAccessKey: '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',
        //     region: 'ap-southeast-1'
        // });
        //
        // var bucket = 'test-up-anh';

        var s3 = new AWS.S3({
            accessKeyId: 'AKIAJB6JUVNE22EIBMXA',
            secretAccessKey: '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',
            region: 'ap-southeast-1'
        });

        var bucket = (env === 'production') ? 'money-lover-images' : 'money-lover-images-test';

        init();

        function init() {
            $scope.isLoading = true;
            var opened_list = localStorageService.get('openedReceipt') || [];
            opened_list.push(id);
            opened_list = _.unique(opened_list);
            localStorageService.add('openedReceipt', opened_list);

            getReceiptInfo(id, function (err, receipt) {
                $scope.isLoading = false;

                if (err) {
                    return showErrorMain(err);
                }

                $scope.receipt = receipt;

                if ($scope.receipt.data && $scope.receipt.data.amount) {
                    $scope.receipt.data.amount = parseInt($scope.receipt.data.amount);
                }

                setDefaultDisplayDate();

                getWallet(receipt.user._id, function (err, data) {
                    $scope.wallets = data;

                    $scope.hasWallet = checkWallet();

                    if ($scope.hasWallet) {
                        getCategory(receipt.wallet._id, function (err, categories) {
                            if (err) {
                                return showErrorMain(err);
                            }

                            $scope.categories = categories;
                        });
                    }
                });

                $scope.imageReceipt = urlRootImage + '/' + receipt.image_id;
                //nếu không load được ảnh, thay bằng ảnh mặc định
                imageElement.onerror = function () {
                    imageElement.setAttribute('src', '/partials/receipt/receipt_default.png');
                    showErrorImage();
                };
            });
        }

        function checkWallet() {
            if (!$scope.receipt.wallet) {
                return false;
            }

            if (!$scope.receipt.wallet._id) {
                return false;
            }

            var hw = false;

            $scope.wallets.forEach(function (wallet) {
                if (wallet._id === $scope.receipt.wallet._id) {
                    hw = true;
                }
            });

            return hw;
        }

        function setDefaultDisplayDate() {
            if (!$scope.receipt.data) {
                $scope.receipt.data = {};
            }

            $scope.receipt.data.displayDate = moment($scope.receipt.created_at).format('YYYY-MM-DD');
        }

        function removeImage(id) {
            s3.deleteObject({ Bucket: bucket, Key: id }, function (err) {
                if (err) {
                    console.log(err.stack);
                }
            });
        }

        function encode(data) {
            var str = data.reduce(function (a, b) { return a + String.fromCharCode(b); }, '');
            return btoa(str).replace(/.{76}(?=.)/g, '$&\n');
        }

        function getReceiptInfo(id, callback) {
            $http.post('/receipt/find-one', { id: id })
                .success(function (result) {
                    if (result.s) {
                        callback(null, result.d);
                    } else {
                        callback('Get Receipt due to failed');
                    }
                })
                .error(function () {
                    callback("Error From Server");
                });
        }

        function reject(receipt, reason, callback) {
            $http.post('/receipt/save/reject', { receipt: receipt, reason: reason })
                .success(function (result) {
                    if (result.s) {
                        callback();
                    } else {
                        callback('Reject due to failed');
                    }
                })
                .error(function () {
                    callback('Error From Server');
                });
        }

        function draft(receipt, callback) {
            $http.post('/receipt/save/draft', { receipt: receipt })
                .success(function (result) {
                    if (result.s) {
                        callback();
                    } else {
                        callback('Save draft due to failed');
                    }
                })
                .error(function () {
                    callback('Error From Server');
                });
        }

        function done(receipt, callback) {
            $http.post('/receipt/save/done', { receipt: receipt })
                .success(function (result) {
                    if (result.s) {
                        callback();
                    } else {
                        callback('Set done due to failed');
                    }
                })
                .error(function () {
                    showErrorMain('Error From Server');
                });
        }

        function showErrorImage() {
            document.getElementById('errorImage').removeAttribute('hidden');
        }

        function showErrorMain(message) {
            document.getElementById('errorMain').removeAttribute('hidden');
            document.getElementById('errorMainMessage').innerHTML = message;
        }

        function showSuccessMain(message) {
            document.getElementById('successMain').removeAttribute('hidden');
            document.getElementById('successMainMessage').innerHTML = message;
        }

        function getCategory(wallet_id, callback) {
            $http.post('/receipt/get-category', { wallet: wallet_id })
                .success(function (result) {
                    if (result.s) {
                        return callback(null, result.d);
                    }

                    callback('Get category list due to failed');
                })
                .error(function () {
                    callback('Error From Server');
                });
        }

        function getWallet(user_id, callback) {
            $http.post('/receipt/get-wallet', { user_id: user_id })
                .success(function (result) {
                    if (!result.s) {
                        return callback('Get wallet list due to failed');
                    }

                    callback(null, result.d);
                })
                .error(function () {
                    callback('Error From Server');
                });
        }

        function selfAssign(receipt) {
            $http.post('/receipt/save/self-assign', { id: receipt._id })
                .success(function (result) {
                    if (result.s) {
                        receipt.admin = result.d;
                    } else {
                        showErrorMain("Assign due to failed");
                    }
                })
                .error(function () {
                    showErrorMain("Error From Server");
                });
        }

        var ctrlReason = function ($scope, $modalInstance) {

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.ok = function () {
                var myReason = document.getElementsByName('reject_reason');

                if (!this.myReason) {
                    return showErrorMain("Please select a reason!");
                }

                $modalInstance.close(JSON.parse(this.myReason));
            };
        };

        //get currency
        $http.post('/currency/get')
            .success(function (data) {
                $scope.listCurrency = data.data;
            })
            .error(function () {
                showErrorMain("Get currency error!");
            });

        //set Latitude, Longtitude
        $scope.setLongLat = function (address) {
            var url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + address + "&sensor=false";
            url = encodeURI(url);

            $http.get(url)
                .success(function (res) {
                    $scope.receipt.data.latitude = res.results[0].geometry.location.lat;
                    $scope.receipt.data.longtitude = res.results[0].geometry.location.lng;
                })
                .error(function () {
                    showErrorMain("Get long/lat error!");
                });

        };

        $scope.selectWallet = function () {
            $scope.receipt.wallet = $scope.wallets[parseInt($scope.selectedWalletIndex)];

            getCategory($scope.wallets[parseInt($scope.selectedWalletIndex)], function (err, data) {
                $scope.categories = data;
            });
        };

        $scope.selfAssign = function (receipt) {
            selfAssign(receipt);
        };

        $scope.draft = function (receipt) {
            var ok = confirm("Are you sure?");
            if (!ok) return;

            $scope.isLoading = true;

            draft(receipt, function (err) {
                $scope.isLoading = false;

                if (err) {
                    showErrorMain(err);
                }
            });
        };

        $scope.reject = function (receipt) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/receipt/reason.html',
                controller: ctrlReason,
                resolve: {

                }
            });

            modalInstance.result.then(function (reason) {
                reject(receipt, reason, function (err) {
                    if (err) {
                        return showErrorMain(err);
                    }

                    removeImage(receipt.image_id);

                    receipt.status = 'rejected';
                    showSuccessMain('Receipt has been rejected');

                    if (!receipt.metadata) {
                        receipt.metadata = {};
                    }
                    receipt.metadata.reject_reason = reason;
                });
            });
        };

        $scope.done = function () {
            var receipt = this.receipt;

            if (!receipt.data) {
                return alert('Data is empty!');
            }

            if (!receipt.data.amount) {
                return alert('Amount is empty!');
            }

            if (!receipt.data.displayDate) {
                var inputDisplayDate = document.getElementById('inputDisplayDate').value;

                if (!inputDisplayDate) {
                    return alert('Display date is empty!');
                }

                receipt.data.displayDate = moment(inputDisplayDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
            }

            var ok = confirm('Are you sure?');
            if (!ok) {
                return;
            }

            if (this.selectedCategoryIndex) {
                receipt.category = this.categories[parseInt(this.selectedCategoryIndex)];
            }

            $scope.isLoading = true;

            done(receipt, function (err) {
                $scope.isLoading = false;
                if (err) {
                    showErrorMain(err);
                } else {
                    showSuccessMain('Transaction from this receipt has been created successfully');
                    receipt.status = 'done';
                    $scope.btnDoneLabel = 'Transaction created';
                }
            });
        };

        $scope.hideErrorImage = function () {
            document.getElementById('errorImage').setAttribute('hidden', 'true');
        };

        $scope.hideErrorMain = function () {
            document.getElementById('errorMain').setAttribute('hidden', 'true');
        };

        $scope.hideSuccessMain = function () {
            document.getElementById('successMain').setAttribute('hidden', 'true');
        };

        $scope.imageDetail = function () {
            var viewer = new Viewer(imageElement);
        };

        $scope.unassign = function (receipt) {
            $http.post('/receipt/save/unassign', { id: receipt._id })
                .success(function (result) {
                    if (!result.s) {
                        return alert('Unassign admin due to error');
                    }

                    receipt.admin = null;
                })
                .error(function () {
                    alert('Error From Server');
                });
        };

        $scope.nextReceipt = function () {
            $http.post('/receipt/get-next-open', { opened: localStorageService.get('openedReceipt') })
                .success(function (result) {
                    if (!result.s) {
                        return alert('Get next receipt due to failed');
                    }

                    if (!result.d) {
                        return alert('No open receipt found');
                    }

                    if (result.d === id) {
                        return alert('No open receipt found');
                    }

                    location.replace(result.d);
                })
                .error(function () {
                    alert('Error From Server');
                });
        };
    });
}(angular, AWS, moment, Viewer, _));
