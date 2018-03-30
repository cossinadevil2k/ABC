(function ($a, $async) {

    'use strict';
    var urlIconRoot = '//static.moneylover.me';
    var urlRootDev = '//tapi.moneylover.me';
    var urlRootLocal = '//localhost:8082';
    var urlRoot = '//api.moneylover.me';
    var socketProduction = 'https://socket.moneylover.me/';
    var socketLocal = 'http://localhost:8004';
    var socketUrl = socketProduction;
    var id; // wallet 0fb297a5874546f3bcda933f65d398b3 or event: 68635ba4464e4946853c0679c684054f
    var type; //type: wallet or event

    //var copyClipboardEmbedWebsite = new ZeroClipboard(document.getElementById("copyClipboardWebsite"), { moviePath: 'javascripts/ZeroClipboard.swf' });
    // var copyClipboardEmbedFacebook = new ZeroClipboard(document.getElementById("copyClipboardFacebook"), { moviePath: 'javascripts/ZeroClipboard.swf' });

    var ML = $a.module("ml", ['mb-scrollbar']);

    ML.controller("MLWidget", function ($scope, $http) {
        var config = {};
        var routeQueries = getRouteQueries(window.location.href);

        $scope.transactionLists = [];
        $scope.currencyList = [];
        $scope.currentWidth = window.innerWidth;
        $scope.moreThanOneCurrency = false;


        $scope.scrollbar = function(direction, autoResize, show) {
            config.direction = direction;
            config.autoResize = autoResize;
            config.scrollbar = {
                show: !!show
            };
            return config;
        };

        if (routeQueries.mode) {
            if (routeQueries.mode === 'dev'){
                urlRoot = urlRootDev;
            } else if (routeQueries.mode === 'local') {
                urlRoot = urlRootLocal;
                socketUrl = socketLocal;
            }

        }

        if (routeQueries.wallet) {
            type = 'wallet';
            id = routeQueries.wallet;
        } else if (routeQueries.event) {
            type = 'event';
            id = routeQueries.event;
        }

        var getSymbol = function (callback) {
            $http.get('currency.json')
                .success(function (data, status) {
                    if (status === 200) {

                        $scope.currencyList = [];

                        $a.forEach(data.data, function (value) {
                            $scope.currencyList.push(value);
                        });

                        callback();
                    } else {
                        callback('Get currency symbol failed');
                    }
                })
                .error(function () {
                    callback('Fail on get currency symbol.');
                });
        };

        var getInfo = function (callback) {
            var url = urlRoot + '/' + type + '/' + id + '?callback=JSON_CALLBACK';

            $http.jsonp(url)
                .success(function (data) {
                    if (data.status && data.message !== 'wallet_not_found') {
                        if (!data.data) {
                            return callback('get info failed');
                        }

                        var currId = data.data.currency_id - 1;
                        data.data.currency = $scope.currencyList[currId];

                        $scope.userInfo = data.data;

                        callback();
                    } else {
                        callback('get info failed');
                    }
                })
                .error(function() {
                    callback('get info failed');
                });
        };

        var calBalance = function () {
            if ($scope.userInfo.balance){
                return $scope.walletBalance = $scope.userInfo.balance;
            }

            var totalBalance = 0;
            $a.forEach($scope.transactionLists, function (value) {
                totalBalance += value.totalAmount;
            });

            $scope.walletBalance = totalBalance;
        };

        var getTransactionResult = function (data) {
            var tempDate,
                list = [],
                cList = [],
                indexList = -1;

            $a.forEach(data, function (value) {
                if (!value.category) return;

                var transactionDate = moment(value.displayDate).format('YYYY-MM-DD'),
                    currId = (value.account.currency_id - 1),
                    curr = $scope.currencyList[currId];

                if (!tempDate || transactionDate!==tempDate) {
                    list.push({displayDate: transactionDate, trans: [], totalAmount: 0, currency: curr });
                    cList.push(currId);
                    tempDate = transactionDate;
                    indexList += 1;
                }

                var amount = value.amount;

                if (value.category.type === 2) amount *= -1;
                list[indexList].totalAmount += amount;
                value.currency = $scope.currencyList[currId];
                list[indexList].trans.push(value);
            });

            var temp,
                stopForEach = false;
            $a.forEach(cList, function (value) {
                if (!stopForEach) {
                    if (!temp) {
                        temp = value;
                    } else {
                        if (temp === value) {
                            $scope.moreThanOneCurrency = true;
                            stopForEach = true;
                        }
                    }
                }
            });

            $scope.transactionLists = list;

            calBalance();
        };

        var getSocket = function () {
            var socket = io(socketUrl);
            socket.on('/'+type+'/'+id, function (data) {
                $scope.loadPage();
            });
        };

        var getTransaction = function (callback){
            $http.jsonp(urlRoot + '/' + type + '/' + id + '/transaction/all?callback=JSON_CALLBACK')
                .success( function (data){
                    if (!data.status || data.message === "transaction_not_found") {
                        $scope.transactionLists = [];
                    } else {
                        getTransactionResult(data.data.transactions);
                    }

                    callback(null, 'getTransaction-done');

                    getSocket();

                    $scope.currentTime = moment(new Date()).format("DD/MM/YYYY - hh:mm");
                    $scope.$broadcast('rebuild:me');
                })
                .error(function(data){
                    callback('get transaction failed');
                })
        };

        $scope.createEmbedCode = function() {
            $scope.turnOn = true;
            // $scope.widthEmbed + $scope.heightEmbed
            // id voi type la 2 bien o trong controller
            $scope.embedCode = type + id;
        };

        $scope.loadPage = function () {
            $scope.turnOn = false;
            $scope.pageLoading = true;

            $async.series([
                getSymbol,
                getInfo,
                getTransaction
            ], function (err, results){
                $scope.pageLoading = false;
            });
        };

        $scope.loadPage();
    });

    /**
     * Directives
     */
    ML.directive('errSrc', function () {
        return {
            link: function(scope, element, attrs) {
                element.bind('error', function() {
                    if (attrs.src != attrs.errSrc) {
                        attrs.$set('src', attrs.errSrc);
                    }
                });
            }
        }
    });

    /**
     * Filters
     */
    ML.filter("amountDisplayFilter", function (){
        return function (amount, currency, type) {

            if (!currency || !amount) return;

            var formatCurrency = currency.t === 0 ? '%s %v' : '%v %s';

            return accounting.formatMoney(amount, { symbol: currency.s, format: formatCurrency });
        }
    });

    ML.filter("dateTimeFilter", function () {
        return function (input, patern) {
            return moment(input).format(patern);
        }
    });

    ML.filter("checkNegativeNumber", function() {
        return function (amount) {

            if (amount < 0) {
                return 2;
            } else {
                return 1;
            }
        }
    });

    ML.filter("getIconLinkFilter", function () {
        return function (imgName) {
            if(!imgName) return '';
            imgName = imgName.replace(/.png/i, '').replace(/icon\//i, '');

            if (imgName.indexOf("provider") != -1) {
                var number = imgName.replace(/\/provider\//i, '');
                return ('https://d3938q3vi00zd9.cloudfront.net/provider_'+number+'-logo.png');
            }

            return (urlIconRoot + '/img/icon/' + imgName + '.png');
        }
    });

    ML.filter("noteDisplayFiler", function () {
        return function (transaction) {
            var note = '',
                personSize = transaction.with.length;


            if (transaction.note) {
                note += transaction.note;
            }

            if (note && personSize > 0) {
                note += " ";
            }

            var sWith = makeWith(transaction);

            note += sWith;

            return note;
        }
    });

    var checkTransactionDebtOrLoan = function (category) {
        var metadata = category.metadata;
        return metadata && (metadata == 'IS_DEBT' || metadata == 'IS_LOAN');
    };

    var makeWith = function (transaction) {
        var sWith = '',
            personSize = transaction.with.length;

        if(checkTransactionDebtOrLoan(transaction)){
            var personName = personSize > 0 ? transaction.with[0] : 'someone';
            sWith += "with " + personName;
        } else {
            if (personSize == 1) {
                sWith += "with " + transaction.with[0];
            } else if(personSize ==2){
                sWith += "with " + transaction.with[0] + " ," + transaction.with[1];
            } else if(personSize >2){
                var personLeft = personSize -1;
                sWith += "with " + transaction.with[0] + " & " + personLeft;
            }
        }

        return sWith;
    };

    var getRouteQueries = function(url){
        var output = {};

        url = url.split('?')[1];

        if (!url) {
            return {};
        }

        url = url.split('&');

        url.forEach(function(element){
            var q = element.split('=');
            output[q[0]] = q[1];
        });

        return output;
    };
}(angular, async));