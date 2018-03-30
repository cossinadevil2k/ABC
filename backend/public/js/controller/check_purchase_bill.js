(function($a){
    'use strict';

    String.prototype.addString = function(idx, rem, str) {
        return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
    };

    $a.module('ML').controller('checkPurchaseBill', function($scope, $rootScope, $http) {
        $rootScope.tabSelect = 7;
        $rootScope.MLPageDetail = 'Check purchase bill';

        $scope.processing = false;

        function handleSplitedObject(text){
            var ngoacNhonMoIndex = text.indexOf('{');
            var ngoacKepKeyMoIndex = (ngoacNhonMoIndex === 0) ? 1 : 0;
            text = text.addString(ngoacKepKeyMoIndex, 0, '"');

            var haiChamIndex = text.indexOf(':');
            var ngoacKepKeyDongIndex = haiChamIndex;
            text = text.addString(ngoacKepKeyDongIndex, 0, '"');

            var temp = text.split(':');
            if (temp[0].indexOf('purchaseTime') === -1 && temp[0].indexOf('purchaseState') === -1) {
                haiChamIndex = text.indexOf(':');
                var ngoacKepValueMoIndex = haiChamIndex + 1;
                text = text.addString(ngoacKepValueMoIndex, 0, '"');

                var ngoacNhonDongIndex = text.indexOf('}');
                var ngoacKepValueDongIndex = (ngoacNhonDongIndex !== -1) ? ngoacNhonDongIndex : text.length;
                text = text.addString(ngoacKepValueDongIndex, 0, '"');
            }

            return text;
        }

        function makePostData(line) {
            var tmp = line.split(',');
            var tmpPartOne = tmp.slice(0, tmp.length - 2);

            tmpPartOne.forEach(function(str, index){
                tmpPartOne[index] = handleSplitedObject(str);
            });

            tmpPartOne = tmpPartOne.join();

            return {
                receiptData: tmpPartOne,
                signature: tmp[tmp.length - 2],
                email: tmp[tmp.length - 1] || 'Unknown email'
            };
        }

        function checkBill(receiptData, signature, callback) {
            var postData = {
                receipt_data: {
                    data: receiptData,
                    signature: signature
                },
            };

            $http.post('/check-purchase-bill', postData)
                .success(function(result) {
                    if (result.s) return callback(null, result.d);
                    callback(result.e);
                })
                .error(function(){
                    callback('Error from server');
                });
        }

        $scope.check = function() {
            var file = document.getElementById('csv_input').files[0];
            if (!file) return alert('Please select csv file');
            $scope.processing = true;
            var reader = new FileReader();
            $a.element('#result_list li').remove();

            reader.readAsText(file);
            reader.onload = function(event){
                var lines = event.target.result.replace(/"/g,"").replace(/\r/g, "").split('\n');
                var count = 0;

                async.eachSeries(lines, function(line, cb){
                    if (line.indexOf('Signature') !== -1) return cb();
                    var info = makePostData(line);
                    count++;

                    checkBill(info.receiptData, info.signature, function(err, data) {
                        if (data) {
                            $a.element('#result_list').append(
                                '<li>'
                                    + '<span style="text-warning">'
                                        + count + '. '
                                    + '</span>'
                                    + '<span style="font-weight: bold;">'
                                        + info.email + ': '
                                    + '</span>'
                                    + '<span class="text-success">'
                                        +'Success'
                                    + '</span>'
                                + '</li>'
                            );
                        } else {
                            $a.element('#result_list').append(
                                '<li>'
                                    + '<span style="text-warning">'
                                        + count + '. '
                                    + '</span>'
                                    + '<span style="font-weight: bold;">'
                                        + info.email + ': '
                                    + '</span>'
                                    + '<span class="text-error">'
                                        + err
                                    + '</span>'
                                + '</li>'
                            );
                        }

                        cb();
                    });
                }, function(error){
                    $scope.processing = false;
                });
            };
        };

        $scope.checkSingleBill = function(info) {
            checkBill(info.receipt, info.signature, function(result) {
                if (result.s) return alert('Last purchase: ' + result.d);
                alert('false');
            });
        };
    });
}(angular));
