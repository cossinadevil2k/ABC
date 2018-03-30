(function($a){
    'use strict';

    $a.module('ML').controller('purchaselog', function($scope, $rootScope, $http, $modal, $routeParams){
        $rootScope.tabSelect = 1;
        $rootScope.MLPageDetail = 'Purchase log';

        var itemCode = {
            "summer_icon_pack":1301,
            "office_icon_pack":1302,
            "icon_daily_care":1303,
            "xmas_icon_pack":1304,
            "worldcup_icon_pack_2014":1305,
            "summer_icon_pack_2014":1306,
            "icon_transport":1307,
            "icon_fastfood":1308,
            "transport_icon_pack":1310,
            "summer_pack":1311,
            "all_feature":1312,
            "no_ads":1313,
            "me.moneylover.ios.MoneyLover.pluss":1314,
            "me.moneylover.removeAd":1315,
            "icon_ml_halloween14":1316,
            "icon_ml_adults":1317,
            "icon_ml_baby":1318,
            "icon_ml_students":1319,
            "test_icon_pack":1399
        };

        var startTime = 0;
        var endtime = new Date().getTime();
        var type = 1;
        var limit = 30;
        $scope.statsData = [];

        function getItemPurchased(){
            $http.post('/purchaselog/get-purchased-items',{})
                .success(function(data){
                    if(data.items !== []) $scope.purchasedItems = data.items;
                })
                .error(function(data){
                    alert('get item list error');
                });
        }

        var formatData = function(data){
            if(data.length > 0){
                data = _(data).sortBy(function(d) {
                    return d.createAt;
                });
                var newData = [];
                data.forEach(function(stat){
                    if(stat && stat.createAt){
                        var newCreateTime = moment(stat.createAt).format('HH:mm DD/MM');
                        newData.push({counter: stat.counter, createAt: newCreateTime}); // moment(stat.createAt).format('DD/MM HH:mm')
                    }
                });
//					newData = _(newData).sortBy(function(data) {
//						return data.createAt;
//					});
                return newData;
            } else {
                return [];
            }
        };

        var mergeData = function(object){
            console.log(object);
            var newData = [];
            var total = object.total.d;
            var totalSize = total.length;
            var objSize = Object.keys(object).length;
            var objKeys = Object.keys(object);
            total.forEach(function(data, index){
                var info = {};
                info.createAt = data.createAt;
                for(var i=0; i < objSize; i++){
                    var counter = object[objKeys[i]].d[index] || 0;
                    if(counter === 0)
                        info[objKeys[i]] = counter;
                    else
                        info[objKeys[i]] = counter.counter;
                }
                newData.push(info);
            });

//                for(var i = totalSize - 1; i>=0; i--){
//                    var info = {};
//                    info.createAt = total[i].createAt;
//                    for(var j = objSize - 1; j>= 0; j--){
//                        var counter = object[objKeys[j]].d[i] || 0;
//                        if(counter === 0){
//                            info[objKeys[j]] = counter;
//                        } else {
//                            info[objKeys[j]] = counter.counter;
//                        }
//                        newData.push(info);
//                    }
//                }

            return newData;
        };

        var getStat = function(table, types, start, end, limit, callback){
            $http.post('/stats', {table: table, types: types, start: start, end: end, limit: limit}).success(function(data){
                callback(false, data);
            }).error(function(data){
                callback(true, data);
            });
        };

        $scope.getPurchaseLog = function(element){
            $http.post('/purchaselog/get-purchased-items',{})
                .success(function(data){
                    if(data.items !== []){
                        var parallel = {};

                        parallel.total = function(cb){
                            getStat(1300, type, startTime, endtime, limit, function(err, data){
                                if(err) cb(null, []);
                                else {
                                    data.d = formatData(data.d);
                                    data.d = data.d.reverse();
                                    cb(null, data);
                                }
                            });
                        };

                        data.items.forEach(function(elm, index){
                            parallel[elm] = function(cb){
                                getStat(itemCode[elm], type, startTime, endtime, limit, function(err, data){
                                    if(err) cb(null,[]);
                                    else {
                                        data.d = formatData(data.d);
                                        data.d = data.d.reverse();
                                        cb(null, data);
                                    }
                                });
                            }
                        });

                        async.parallel(parallel, function(err, result){
                            var newData = mergeData(result);
                            newData = newData.reverse();
                            var ykeys = Object.keys(itemCode);
                            ykeys.push("total");
                            new Morris.Line({
                                element: element,
                                data: newData,
                                grid: true,
                                parseTime: false,
                                xkey: 'createAt',
                                ykeys: ykeys,
                                labels: ykeys
                            });
                        });
                    }
                })
                .error(function(data){
                    alert('get item list error');
                });
        };


    })
}(angular));