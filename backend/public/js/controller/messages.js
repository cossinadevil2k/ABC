(function ($a) {
    'use strict';

    $a.module('ML').controller('messages', function ($scope, $rootScope, $location, Page, $http, $modal) {
        $rootScope.tabSelect = 4;
        $rootScope.MLPageDetail = 'Push Notifications';
        $scope.listMsg = [];
        var REGEX = /^[^ -]+$/g;

        function validateCa(campaign) {
            return campaign.match(REGEX);
        }

        function randomString(len) {
            function getRandomInt(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            var buf = [],
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                charlen = chars.length;

            for (var i = 0; i < len; ++i) {
                buf.push(chars[getRandomInt(0, charlen - 1)]);
            }

            return buf.join('');
        }

        $scope.optionMsg = [
            {
                id: 'dId_1',
                name: 'Android',
                device: [
                    {
                        name: 'Kitkat',
                        version: '4.4 - 4.4.2',
                        api: 19
                    },
                    {
                        name: 'Jelly Bean',
                        version: '4.3.x',
                        api: 18
                    },
                    {
                        name: 'Jelly Bean',
                        version: '4.2.x',
                        api: 17
                    },
                    {
                        name: 'Jelly Bean',
                        version: '4.1.x',
                        api: 16
                    },
                    {
                        name: 'Ice Cream Sandwich',
                        version: '4.0.3 - 4.0.4',
                        api: 15
                    },
                    {
                        name: 'Ice Cream Sandwich',
                        version: '4.0.1 - 4.0.2',
                        api: 14
                    },
                    {
                        name: 'Honeycomb',
                        version: '3.2.x',
                        api: 13
                    },
                    {
                        name: 'Honeycomb',
                        version: '3.1',
                        api: 12
                    },
                    {
                        name: 'Honeycomb',
                        version: '3.0',
                        api: 11
                    }
                ]
            },
            {
                id: 'dId_2',
                name: 'iOS'
            },
            {
                id: 'dId_3',
                name: 'Winphone/Windows'
            }
        ];

        $scope.getList = function () {
            this.searchKeyword = '';
            $http.post('/message/get', {})
                .success(function (data) {
                    if (data.err) alert(data.msg);
                    else $scope.listMsg = data.data;
                })
                .error(function () {
                    alert('Error');
                });
        };

        $scope.deleteMessage = function (mess, index) {
            var yn = confirm("Are you sure?");
            if (yn) {
                $http.post('/message/delete', { messid: mess._id }).success(function (data) {
                    if (data) $scope.listMsg.splice(index, 1);
                    else alert("Delete message error");
                }).error(function () {
                    alert('Error');
                });
            }
        };

        $scope.editMessage = function (mess) {
            var oldMsg = mess;
            if (oldMsg && oldMsg.option && oldMsg.option.ca) {
                oldMsg.campaign = oldMsg.option.ca;
            }
            if (oldMsg && oldMsg.option && oldMsg.option.group) {
                oldMsg.group = oldMsg.option.group;
            }
            var modalInstance = $modal.open({
                templateUrl: '/partials/messages/message.html',
                controller: createNew,
                resolve: {
                    msgInfo: function () {
                        return oldMsg;
                    },
                    listMsg: function () {
                        return $scope.listMsg;
                    },
                    optionMsg: function () {
                        return $scope.optionMsg;
                    },
                    mode: function () {
                        return "Edit";
                    }
                }
            });

            modalInstance.result.then(function () {
                $scope.getList();
            }, function () { });
        };

        //			$scope.sendMessage = function(mess,mode) {
        //                var confirm = prompt("Enter power password :)");
        //                if (confirm === "!@#$%^") {
        //                    mess.platform = [];
        //                    mess.device.forEach(function (element, index) {
        //                        if (element === 'dId_1') {
        //                            mess.platform.push(1);
        //                        }
        //                        if (element === 'dId_2') {
        //                            mess.platform.push(2);
        //                        }
        //                        if (element === 'dId_3') {
        //                            mess.platform.push(3);
        //                        }
        //                    });
        //
        //                    $http.post('/message/send', {mess: mess, mode: mode}).success(function (data, status, header, config) {
        //                        alert(data.message);
        //                    }).error(function (data, status, header, config) {
        //                        alert("Error");
        //                        console.log(data);
        //                    });
        //
        //                }
        //            };

        $scope.sendMessage = function (mess, mode) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/messages/send.html',
                controller: ctrlSend,
                resolve: {
                    message: function () {
                        return mess;
                    },
                    mode: function () {
                        return mode;
                    }
                }
            });
        };

        $scope.createNew = function () {
            var modalInstance = $modal.open({
                templateUrl: '/partials/messages/message.html',
                controller: createNew,
                resolve: {
                    msgInfo: function () {
                        return {};
                    },
                    listMsg: function () {
                        return $scope.listMsg;
                    },
                    optionMsg: function () {
                        return $scope.optionMsg;
                    },
                    mode: function () {
                        return "Add";
                    }
                }
            });

            modalInstance.result.then(function () {
                $scope.getList();
            }, function () { });
        };
        var createNew = function ($scope, Page, $modalInstance, msgInfo, listMsg, optionMsg, mode) {
            $scope.mode = mode;
            $scope.msgInfo = msgInfo;
            $scope.optionMsg = optionMsg;
            $scope.optionAction = [
                { data: 28, name: 'View message' },
                { data: 1, name: 'Open PlayStore' },
                { data: 2, name: 'Login' },
                { data: 3, name: 'Open Icon Store' },
                { data: 4, name: 'Open Web' },
                { data: 29, name: 'Open Store' }
            ];

            if (!msgInfo.device) {
                $scope.msgInfo.device = [];
            }

            $scope.platformPicked = function (deviceID) {
                var exist = $scope.msgInfo.device.indexOf(deviceID);
                if (exist > -1) {
                    $scope.msgInfo.device.splice(exist, 1);
                } else {
                    $scope.msgInfo.device.push(deviceID);
                }
            };

            $scope.datePicker1 = function () {
                this.showWeeks = false;
                this.minDate = (this.minDate) ? null : new Date();
            };

            $scope.preview = function () {

            };
            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.save = function () {
                if (this.msgInfo.campaign) {
                    if (!validateCa(this.msgInfo.campaign)) {
                        alert('Campaign invaild');
                        return;
                    }
                }
                if (this.msgInfo.device.length > 0) {
                    if ($scope.mode == "Add") {
                        var msgInfo = this.msgInfo;
                        var condition = {};
                        $http.post('/message/save', { msgInfo: msgInfo, condition: condition }).success(function (data) {
                            $modalInstance.close();
                        }).error(function () {
                            alert('Error');
                        });
                    }

                    if ($scope.mode == "Edit") {
                        var msgInfo = this.msgInfo;
                        $http.post('/message/update', { msgInfo: msgInfo }).success(function (data) {
                            $modalInstance.close();
                        }).error(function () {
                            alert('Error');
                        });
                    }
                } else {
                    $scope.error = "Please select platforms";
                }
            };
        };

        var ctrlSend = function ($scope, $modalInstance, $http, message, mode) {
            //$scope.searchQuery = "";
            $scope.scheduled = 'no';
            $scope.sendMode = 'manual';

            $scope.pressEnter = function (event, sendMode, toList, userOption) {
                var keyCode = window.event ? event.keyCode : event.which;
                if (keyCode === 13) $scope.send(sendMode, toList, userOption);
            };

            var getQueryList = function () {
                $http.post('/search-query/get', { skip: 0, limit: 1000 })
                    .success(function (result) {
                        if (result.s) $scope.queryList = result.d;
                        else alert("Get query list failed");
                    })
                    .error(function () {
                        alert("Error From Server");
                    });
            };
            getQueryList();

            $scope.send = function (sendMode) {
                var postData = {
                    mess: message,
                    mode: mode
                };

                var that = this;

                var str = randomString(7);

                var ok = prompt('Are you sure? Type "' + str + '" to confirm!');

                if (ok != str) {
                    return;
                }

                if (this.scheduled === 'yes') {
                    if (!this.schedule || !this.schedule.date || !this.schedule.time) {
                        return alert('Please pick your schedule date and time!');
                    }

                    postData.schedule_time = scheduleTimeParser(this.schedule.date, this.schedule.time);
                }

                prepareData(function (err) {
                    if (err) {
                        return alert(err);
                    }

                    $http.post('/message/send', postData)
                        .success(function (data) {
                            if (data.s) {
                                $scope.cancel();
                            }

                            if (data.msg) {
                                alert(data.msg);
                            }
                        })
                        .error(function () {
                            alert("Error");
                        });
                });

                function prepareData(callback) {
                    if (sendMode === 'manual') {
                        if (that.emailList) {
                            var newToList = that.emailList.split(",");
                            newToList.forEach(function (elm, index) {
                                newToList[index] = elm.trim();
                            });

                            postData.send_mode = sendMode;
                            postData.toList = newToList;

                            callback();
                        }
                    } else if (sendMode === 'search_query') {
                        if (that.searchQuery) {
                            postData.send_mode = sendMode;
                            postData.query = JSON.parse(that.searchQuery);

                            callback();
                        }
                    } else if (sendMode === 'csv_file') {
                        var file = document.getElementById("csv_file").files[0];

                        if (!file) {
                            return callback('Please select a csv file');
                        }

                        readFile(function (err, mail_list) {
                            if (err) {
                                return callback(err);
                            }

                            postData.send_mode = sendMode;
                            postData.toList = mail_list;

                            callback();
                        });
                    }
                }
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            function readFile(callback) {
                var file = document.getElementById("csv_file").files[0];
                var mailListFromFile = [];

                var reader = new FileReader();

                reader.onload = function (e) {
                    var text = reader.result.toString();
                    var a = text.split('\n');
                    mailListFromFile = checkNullEmail(a);
                    callback(null, mailListFromFile);
                };

                reader.readAsText(file, "utf-8");
            }
        };

        $scope.sessionList = function (message) {
            var modalInstance = $modal.open({
                templateUrl: '/partials/messages/sessions.html',
                controller: ctrlSession,
                resolve: {
                    messageId: function () {
                        return message._id;
                    }
                }
            });

            modalInstance.result.then(function () {

            });
        };

        var ctrlSession = function ($scope, $modalInstance, messageId) {
            $scope.pushPushNotifPage = true;
            $scope.sessionList = [];
            $scope.isLoading = false;
            var limit = 10;
            $scope.page = 1;
            $scope.isFirstPage = true;
            $scope.isLastPage = true;

            getSession(messageId, 0, limit);

            function getSession(id, skip, limit) {
                $scope.isLoading = true;
                $http.post('/message/get-push-session', { messageId: id, skip: skip, limit: limit })
                    .success(function (result) {
                        $scope.isLoading = false;
                        if (result.s) {
                            $scope.sessionList = result.d;
                            checkPage();
                        }
                        else alert("Get session list failed");
                    })
                    .error(function () {
                        $scope.isLoading = false;
                        alert("Error From Server");
                    });
            }

            function checkPage() {
                $scope.isFirstPage = $scope.page === 1;
                $scope.isLastPage = $scope.sessionList.length < limit;
            }

            $scope.nextPage = function (value) {
                $scope.page += value;
                var skip = limit * ($scope.page - 1);
                getSession(messageId, skip, limit);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss();
            };
        };

        function checkNullEmail(list) {
            var new_list = [];
            list.forEach(function (email) {
                if (email != "") {
                    new_list.push(email);
                }
            });
            return new_list;
        }

        function scheduleTimeParser(date, time) {
            var day = date.getDate();
            var month = date.getMonth() + 1;
            var year = date.getFullYear();

            return day + '/' + month + '/' + year + ' ' + time;
        }
    });
}(angular));
