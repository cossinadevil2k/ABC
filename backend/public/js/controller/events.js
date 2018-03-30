(function ($a) {
    'use strict';

    $a.module('ML').controller('events', function ($scope, $rootScope, $http, $modal, $routeParams, localStorageService, $location) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Events';
        $scope.listEvent = [];
        $scope.predicate = 'createAt';
        $scope.reverse = true;

        $scope.sortBy = function (field) {
            if ($scope.predicate == field) $scope.reverse = !$scope.reverse;
            else {
                $scope.predicate = field;
                $scope.reverse = true;
            }
        };

        var lang = [
            { name: 'English (EN-US)', key: 'en' },
            { name: 'French (FR)', key: 'fr' },
            { name: 'Spanish (ES)', key: 'es' },
            { name: 'Japan (JP)', key: 'ja' },
            { name: 'Italian (IT)', key: 'it' },
            { name: 'Portuguese (PT)', key: 'pt' },
            { name: 'German (DE)', key: 'de' },
            { name: 'Tiếng Việt (VI)', key: 'vi' }
        ];

        $scope.listLanguage = lang;

        function update(eventInfo, status, callback) {
            $http.post('/events/update', {
                event: eventInfo,
                type: status
            }).success(function (data, err) {
                callback(data);
            }).error(function (data, err) {
                alert('Error');
            });
        }

        $scope.getList = function () {
            $http.post('/events/list').success(function (data, err) {
                if (data.error) alert('Error');
                else $scope.listEvent = data.data;
            }).error(function (data, err) {
                alert('Error');
            });
        };

        $scope.delete = function (event) {
            var s = confirm('Bạn thực sự chắc chắn với hành động này?');
            if (s) {
                $http.post('/events/delete', { event: event }).success(function (data, err) {
                    $scope.listEvent.forEach(function (eventItem, index) {
                        if (eventItem._id == event._id) $scope.listEvent.splice(index, 1);
                    });
                }).error(function (data, err) {
                    alert('Error');
                });
            }
        };

        $scope.addLang = function (eventInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/events/lang.html',
                controller: ctrlAddLang,
                resolve: {
                    eventInfo: function () {
                        return eventInfo;
                    },
                    lang: function () {
                        return lang;
                    }
                }
            });

            modalInstance.result.then(function () {
            }, function () { });
        };

        var ctrlAddLang = function ($scope, Page, $modalInstance, eventInfo, lang) {
            $scope.listLanguage = lang;
            $scope.listLangActive = [];
            $scope.dataLangs = eventInfo.addLang || [];
            $scope.langContent = {};
            $scope.isViewLang = false;

            $scope.dataLangs.forEach(function (dataLang) {
                if (dataLang.lang) $scope.listLangActive.push(dataLang.lang);
            });


            $scope.generateLang = function () {
                $http.post('/events/updatelang', { event: eventInfo._id, language: $scope.dataLangs })
                    .success(function (data, err) {
                        eventInfo.addLang = $scope.dataLangs;
                        alert('Generate thành công!');
                    })
                    .error(function (data, err) {
                        alert('Error');
                    });
            };

            function changeDataLangs(langContent, status) {
                var id = -1;
                if (status) {
                    if ($scope.dataLangs.length > 0) {
                        $scope.dataLangs.forEach(function (dataLang, index) {
                            if (dataLang.lang === langContent.lang) id = index;
                        });
                    }
                    $scope.dataLangs.push(langContent);
                    if (id > -1) $scope.dataLangs.splice(id, 1);
                } else {
                    $scope.dataLangs.forEach(function (dataLang, index) {
                        if (dataLang.lang === langContent.lang) id = index;
                    });
                    if (id > -1) $scope.dataLangs.splice(id, 1);
                }
            }

            $scope.toggleSelection = function (lang) {
                var idx = $scope.listLangActive.indexOf(lang.key);
                if (idx > -1) {
                    var s = true; //confirm(initQuest);
                    if (s) {
                        $scope.listLangActive.splice(idx, 1);
                        if (lang.name == $scope.viewLanguage) $scope.isViewLang = false;
                        changeDataLangs({ lang: lang.key }, false);
                    }
                } else {
                    $scope.viewLang(lang);
                    $scope.listLangActive.push(lang.key);
                }
            };


            $scope.viewLang = function (language) {
                $scope.langContent = {};
                if (language.name == $scope.viewLanguage) $scope.isViewLang = !$scope.isViewLang;
                else $scope.isViewLang = true;
                $scope.viewLanguage = language.name;
                $scope.langContent.lang = language.key;
                $scope.dataLangs.forEach(function (langContent) {
                    if (langContent.lang === language.key) $scope.langContent = langContent;
                });
            };

            $scope.save = function (langContent) {
                if (langContent.lang && langContent.title && langContent.description && langContent.link_icon
                    && langContent.link) {
                    changeDataLangs(langContent, true);
                } else alert('Hãy nhập đầy đủ thông tin.');
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.genCodeModal = function (event) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/events/gencode.html',
                controller: ctrlGenCode,
                resolve: {
                    event: function () {
                        return event;
                    },
                    codeInfo: function () {
                        return {
                            l: 10,
                            n: 20
                        }
                    }
                }
            });

            modalInstance.result.then(function () { }, function () { });
        };

        var ctrlGenCode = function ($scope, $modalInstance, event, codeInfo) {
            $scope.event = event;
            $scope.codeInfo = codeInfo;
            $scope.genCodeResult = "";
            $scope.hasNoDash = false;

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.generate = function () {
                $scope.codeInfo.eventid = event._id;
                var postData = { codeInfo: $scope.codeInfo, hasNoDash: this.hasNoDash };
                postData.codeInfo.product = event.product;
                $http.post('/events/gencode', postData).success(function (data, err) {
                    $scope.genCodeResult = data.codes;
                }).error(function (data, err) {
                    alert('Gencode error');
                });
            }
        };

        $scope.showCode = function (event) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/events/codelist.html',
                controller: ctrlCode,
                resolve: {
                    event: function () {
                        return event;
                    }
                }
            });

            modalInstance.result.then(function () { }, function () { });
        };

        var ctrlCode = function ($scope, $modalInstance, event) {
            $scope.event = event;
            $scope.codeList = [];
            $scope.unusedCodes = false;
            $scope.total = 0;
            $scope.usedCodeAmount = 0;

            var limit = 20;
            var offset = 0;
            $scope.pageNo = 1;
            $scope.totalPage = 1;
            $scope.isFirstPage = true;
            $scope.isLastPage = true;

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            function getCodeList() {
                var conditions = {
                    eventid: $scope.event._id,
                    limit: limit,
                    offset: offset
                };

                $http.post('/events/codelist', { conditions: conditions }).success(function (data, err) {
                    if (data.err) {
                        alert('Error');
                    } else {
                        $scope.codeList = data.data;
                    }
                })
                    .error(function () {
                        alert("Lỗi trong khi get code list từ server");
                    });
            }

            getListCodeInfo();
            getCodeList();

            $scope.switchPage = function (status) {
                if (status === 'next') {
                    $scope.pageNo++;
                    offset += limit;
                } else {
                    $scope.pageNo--;
                    offset -= limit;
                }
                checkPage();
                getCodeList();
            };

            function getListCodeInfo() {
                $http.post('/events/getCodeListInfo', { eventid: $scope.event._id })
                    .success(function (data, err) {
                        if (data.err) {
                            alert('Server: ' + data.msg);
                        } else {
                            $scope.total = data.totalCode;
                            $scope.usedCodeAmount = data.usedCodeAmount;

                            if (($scope.total % limit) < (limit / 2) && ($scope.total % limit) > 0) {
                                $scope.totalPage = Math.round($scope.total / limit) + 1;
                            } else $scope.totalPage = Math.round($scope.total / limit);

                            checkPage();
                        }
                    })
                    .error(function (err, data) {
                        alert("Error");
                    });
            }

            function checkPage() {
                if ($scope.pageNo == 1) $scope.isFirstPage = true;
                else $scope.isFirstPage = false;

                if ($scope.pageNo == $scope.totalPage) $scope.isLastPage = true;
                else $scope.isLastPage = false;
            }

            $scope.exportCode = function () {
                var ename = $scope.event.name,
                    eid = $scope.event._id,
                    isAll = !$scope.unusedCodes;

                location.href = '/events/codeexport?ename=' + ename + '&eid=' + eid + '&isAll=' + isAll;
            };

            $scope.checkUnusedCodes = function () {
                if ($scope.unusedCodes === false) $scope.unusedCodes = true;
                else $scope.unusedCodes = false;
            };

            $scope.changeCodeStt = function (code) {
                if (code.status === false) code.status = true;
                else code.status = false;
                $http.post('/events/codeupdate', { code: code }).success(function (data, err) {
                    console.log(err);
                    if (data.err) {
                        alert(data.msg);
                    } else {

                    }
                }).error(function (data, err) {
                    alert('Code updating failed');
                })
            }
        };

        $scope.addNew = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/events/info.html',
                controller: ctrlAdd,
                resolve: {
                    eventInfo: function () {
                        return {
                            link: "https://moneylover.me",
                            link_icon: "https://scontent-a-sjc.xx.fbcdn.net/hphotos-xfa1/v/t1.0-9/10152419_286769251478858_504375317_n.png?oh=ee1ea9ee2b5e83ba461acf654099c788&oe=545A7F4E",
                            type: 1
                        };
                    },
                    listEvent: function () {
                        return $scope.listEvent;
                    },
                    lang: function () {
                        return lang;
                    }
                }
            });

            modalInstance.result.then(function () { }, function () { });
        };
        var ctrlAdd = function ($scope, Page, $modalInstance, eventInfo, listEvent, lang) {
            $scope.eventInfo = eventInfo;
            $scope.listEvent = listEvent;
            $scope.errorMsg = null;
            $scope.language = lang;
            $scope.eventInfo.isUnlimited = false;
            $scope.productType = ['premium', 'subscription', 'credit', 'icon'];
            // $scope.productType = ['premium', 'subscription'];
            $scope.selectedProductType = $scope.productType[0];
            $scope.eventInfo.selectedProductType = $scope.productType.indexOf($scope.selectedProductType);

            $scope.productList = {};

            getProduct($scope.selectedProductType);

            $scope.getProduct = function () {
                getProduct(this.selectedProductType);
                $scope.selectedProductType = this.selectedProductType;
                $scope.eventInfo.selectedProductType = $scope.productType.indexOf($scope.selectedProductType);
            };

            function getProduct(productType) {
                var url;

                switch (productType) {
                    case $scope.productType[0]:
                        url = '/premium-products/list';
                        break;
                    case $scope.productType[1]:
                        url = '/subscription-products/gift';
                        break;
                    case $scope.productType[2]:
                        url = '/use-credits/list';
                        break;
                    case $scope.productType[3]:
                        url = '/icons/get';
                        break;
                    default:
                        break;
                }

                if (!url) return 0;
                if ($scope.productList[productType]) return 0;

                $http.post(url, { skip: 0, limit: 50 })
                    .success(function (result) {
                        if (!result.s) {
                            if (result.error === undefined) return alert("Can not get product list");
                            if (result.error) return alert("Can not get product list");
                        }
                        $scope.productList[productType] = result.d || result.data;
                    })
                    .error(function () {
                        alert('Error from server');
                    });
            }

            $scope.save = function () {
                if (this.eventInfo.codeRemain) {
                    this.eventInfo.codeRemain = parseInt(eventInfo.codeRemain);

                    if (isNaN(this.eventInfo.codeRemain)) return alert('Amount must be number');
                    if (this.eventInfo.codeRemain === 0) return alert('Amount = 0? Are you kidding?');
                }

                update(this.eventInfo, 1, function (data) {
                    if (data.error) return $scope.errorMsg = 'Error';

                    $scope.listEvent.push(data.data);
                    $modalInstance.close();
                });
            };
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.dateOptions = {
                'starting-day': 1
            };

            $scope.datePicker1 = function () {
                this.showWeeks = false;
                this.minDate = (this.minDate) ? null : new Date();
            };
            $scope.datePicker2 = function () {
                this.showWeeks = false;
                this.minDate = (this.minDate) ? null : new Date();
            };
        };

        $scope.edit = function (eventInfo) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/events/info.html',
                controller: ctrlEdit,
                resolve: {
                    eventInfo: function () {
                        return eventInfo;
                    },
                    lang: function () {
                        return lang;
                    }
                }
            });

            modalInstance.result.then(function (lstCurrency) {
                updateCurrency(lstCurrency);
            }, function () { });
        };
        var ctrlEdit = function ($scope, Page, $modalInstance, eventInfo, lang) {
            var tmpEventInfo = eventInfo;
            $scope.eventInfo = eventInfo;
            $scope.language = lang;
            $scope.selectedLang = eventInfo.lang;

            function validateEventInfo(eventInfo, callback) {
                if (eventInfo.codeRemain) {
                    var number = parseInt(eventInfo.codeRemain);
                    if (isNaN(number)) callback({ s: false, e: 'Amount must be number' });
                    else {
                        if (number == 0) callback({ s: false, e: 'Amount = 0? Are you kidding?' });
                        else callback({ s: true });
                    }
                } else callback({ s: true });
            }

            $scope.save = function () {
                validateEventInfo($scope.eventInfo, function (result) {
                    if (!result.s) alert(result.e);
                    else {
                        update($scope.eventInfo, 0, function (data) {
                            if (data.error) $scope.errorMsg = 'Error';
                            else $modalInstance.close();
                        });
                    }
                });
            };
            $scope.cancel = function () {
                $scope.eventInfo = tmpEventInfo;
                $modalInstance.dismiss('cancel');
            };
            $scope.dateOptions = {
                'starting-day': 1
            };

            $scope.datePicker1 = function () {
                this.showWeeks = false;
                this.minDate = (this.minDate) ? null : new Date();
            };
            $scope.datePicker2 = function () {
                this.showWeeks = false;
                this.minDate = (this.minDate) ? null : new Date();
            };
        };

        $scope.showRedeemInfo = function (e) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/events/redeem-info.html',
                controller: ctrlRedeem,
                resolve: {
                    event: function () {
                        return e;
                    }
                }
            });

            modalInstance.result.then(function () {
            }, function () { });
        };

        var ctrlRedeem = function ($scope, $modalInstance, event) {
            var limit = 4,
                offset = 0;
            $scope.isFirstPage = true;
            $scope.isLastPage = true;
            $scope.pageNo = 1;
            $scope.totalPage = 1;

            $scope.eventInfo = event;
            $scope.redeemEmailList = [];
            $scope.totalEmail = 0;
            $scope.registedEmail = 0;

            getEmailList();
            getRedeemInfo();

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            function getEmailList() {
                var conditions = {
                    eventid: $scope.eventInfo._id,
                    limit: limit,
                    offset: offset
                };

                $http.post('/redeem/getemaillist', { conditions: conditions })
                    .success(function (data, err) {
                        if (!data.err) {
                            $scope.redeemEmailList = data.emailList;
                        } else {
                            alert(data.msg);
                        }
                    })
                    .error(function (data, status) {
                        alert('Error');
                    });
            }

            function checkPage() {
                if ($scope.pageNo == 1) {
                    $scope.isFirstPage = true;
                } else {
                    $scope.isFirstPage = false;
                }

                if ($scope.pageNo < $scope.totalPage) {
                    $scope.isLastPage = false;
                } else {
                    $scope.isLastPage = true;
                }
            }

            function getRedeemInfo() {
                $http.post('/redeem/getredeeminfo', { eventid: $scope.eventInfo._id })
                    .success(function (data, err) {
                        if (data.err) {
                            alert('Server: ' + data.msg);
                        } else {
                            $scope.totalEmail = data.totalEmail;
                            $scope.registedEmail = data.registedEmail;
                            if (($scope.totalEmail % limit) < (limit / 2) && ($scope.totalEmail % limit) > 0) {
                                $scope.totalPage = Math.round($scope.totalEmail / limit) + 1;
                            } else {
                                $scope.totalPage = Math.round($scope.totalEmail / limit);
                            }
                            checkPage();
                        }
                    })
                    .error(function (data, errr) {
                        alert("Counting Error");
                    });
            }

            $scope.switchPage = function (status) {
                if (status === "next") {
                    $scope.pageNo++;
                    offset += limit;
                    getEmailList();
                } else {
                    $scope.pageNo--;
                    offset -= limit;
                    getEmailList();
                }
                checkPage();
            };

            $scope.exportEmailList = function () {
                var eventid = $scope.eventInfo._id;
                var eventname = $scope.eventInfo.name;
                location.href = '/redeem/emaillistexport?eventid=' + eventid + '&eventname=' + eventname;
            }

        }
    })
}(angular));
