(function($a, document){
    'use strict';

    $a.module('ML').controller('serverSetting', function($scope, $rootScope, $http){
        $rootScope.tabSelect = 3;
        $rootScope.MLPageDetail = 'Server Setting';

        $scope.env = env;

        var API_KEY = 'AIzaSyBCZ06wztPJpP8Q2l5m4xW8zm_jB833Pu4';
        var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

        $scope.setting = {};
        $scope.setting.isServerMaintain = 'false';
        $scope.backgroundNotification = false;

        function sendSubscriptionToServer(subscription){
            // TODO: Send the subscription.endpoint
            // to your server and save it to send a
            // push message at a later date
            //
            // For compatibly of Chrome 43, get the endpoint via
            // endpointWorkaround(subscription)

            var mergedEndpoint = endpointWorkaround(subscription);

            // This is just for demo purposes / an easy to test by
            // generating the appropriate cURL command
            updateGcmId(mergedEndpoint);
        }

        function updateGcmId(mergedEndpoint) {
            // The curl command to trigger a push message straight from GCM
            //if (mergedEndpoint.indexOf(GCM_ENDPOINT) !== 0) {
            //    console.log('This browser isn\'t currently ' +
            //        'supported for this demo');
            //    return;
            //}

            var endpointSections = mergedEndpoint.split('/');
            var subscriptionId = endpointSections[endpointSections.length - 1];

            var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
                '" --header Content-Type:"application/json" ' + GCM_ENDPOINT +
                ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

            console.log(curlCommand);

            $http.post('/admin/update-gcm-id', {gcm: subscriptionId})
                .success(function(result){
                    if (!result.s) alert("Update GCM Id Failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        function initialiseState(){
            // Are Notifications supported in the service worker?
            if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
                return;
            }

            // Check the current Notification permission.
            // If its denied, it's a permanent block until the
            // user changes the permission
            if (Notification.permission === 'denied') {
                return;
            }

            // Check if push messaging is supported
            if (!('PushManager' in window)) {
                return;
            }

            // We need the service worker registration to check for a subscription
            navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                // Do we already have a push message subscription?
                serviceWorkerRegistration.pushManager.getSubscription()
                    .then(function(subscription) {
                        if (!subscription) {
                            // We aren't subscribed to push, so set UI
                            // to allow the user to enable push
                            return;
                        }

                        // Keep your server in sync with the latest subscriptionId
                        sendSubscriptionToServer(subscription);
                    })
                    .catch(function(err) {
                        console.warn('Error during getSubscription()', err);
                    });
            });
        }

        function checkServiceWorker(){
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(initialiseState);
            } else {
                console.warn('Service workers aren\'t supported in this browser.');
            }
        }

        function endpointWorkaround(pushSubscription){
            // Make sure we only mess with GCM
            if (pushSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') !== 0) {
                return pushSubscription.endpoint;
            }

            var mergedEndpoint = pushSubscription.endpoint;
            // Chrome 42 + 43 will not have the subscriptionId attached
            // to the endpoint.
            if (pushSubscription.subscriptionId &&
                pushSubscription.endpoint.indexOf(pushSubscription.subscriptionId) === -1) {
                // Handle version 42 where you have separate subId and Endpoint
                mergedEndpoint = pushSubscription.endpoint + '/' +
                    pushSubscription.subscriptionId;
            }
            return mergedEndpoint;
        }

        function subscribe(){
            // Disable the button so it can't be changed while
            // we process the permission request
            //var pushButton = document.querySelector('.js-push-button');
            //pushButton.disabled = true;

            navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                console.log(serviceWorkerRegistration);
                serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
                    .then(function(subscription) {
                        // The subscription was successful
                        //isPushEnabled = true;
                        //pushButton.textContent = 'Disable Push Messages';
                        //pushButton.disabled = false;

                        // TODO: Send the subscription subscription.endpoint
                        // to your server and save it to send a push message
                        // at a later date
                        return sendSubscriptionToServer(subscription);
                    })
                    .catch(function(e) {
                        if (Notification.permission === 'denied') {
                            // The user denied the notification permission which
                            // means we failed to subscribe and the user will need
                            // to manually change the notification permission to
                            // subscribe to push messages
                            console.log('Permission for Notifications was denied');
                            //pushButton.disabled = true;
                        } else {
                            // A problem occurred with the subscription, this can
                            // often be down to an issue or lack of the gcm_sender_id
                            // and / or gcm_user_visible_only
                            console.log('Unable to subscribe to push.', e);
                            //pushButton.disabled = false;
                            //pushButton.textContent = 'Enable Push Messages';
                        }
                    });
            });
        }

        function unsubscribe(){
            navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                // To unsubscribe from push messaging, you need get the
                // subcription object, which you can call unsubscribe() on.
                serviceWorkerRegistration.pushManager.getSubscription().then(
                    function(pushSubscription) {
                        // Check we have a subscription to unsubscribe

                        // TODO: Make a request to your server to remove
                        // the users data from your data store so you
                        // don't attempt to send them push messages anymore

                        // We have a subcription, so call unsubscribe on it
                        pushSubscription.unsubscribe().then(function(successful) {

                        }).catch(function(e) {
                            // We failed to unsubscribe, this can lead to
                            // an unusual state, so may be best to remove
                            // the subscription id from your data store and
                            // inform the user that you disabled push

                            console.log('Unsubscription error: ', e);
                        });
                    }).catch(function(e) {
                        console.log('Error thrown while unsubscribing from push messaging.', e);
                    });
            });
        }

        var getSetting = function(){
            $http.get('/server-setting/get')
                .success(function(data){
                    if(!data.s){
                        alert('error while get settings');
                    } else {
                        $scope.setting = data.data;
                    }
                })
                .error(function(){
                    alert("loi cmnr");
                });

            $http.post('/backend-setting/get-gcm-status', {})
                .success(function(result){
                    if (result.s){
                        $scope.backgroundNotification = (result.data === 'true');
                    } else alert("Get GCM Setting due to error");
                })
                .error(function(){
                    alert("Error From Server");
                });
        };
        getSetting();

        $scope.changeStatus = function(){
            var postData = {sm: $scope.setting.isServerMaintain};

            if ($scope.setting.isServerMaintain === 'true'){
                if ($scope.setting.endMaintainTime) {
                    var m = moment($scope.setting.endMaintainTime, 'DD-MM-YYYY HH:mm');
                    var now = moment();
                    if (m <= now) return alert("Invalid time! The time is should greater than this moment");
                    if (m.isValid()) postData.ft = m.toISOString();
                } else {
                    postData.ft = null;
                }
            } else {
                postData.ft = null;
                $scope.setting.endMaintainTime = null;
            }

            $http.post('/server-setting/maintain-status', postData)
                .success(function(data){
                    if(!data.s){
                        alert(data.e);
                    } else {
                        $scope.timeSetting = false;
                        if ($scope.setting.isServerMaintain === 'true') {
                            document.getElementById("footerMaintainStatus").removeAttribute('hidden');
                        } else {
                            document.getElementById("footerMaintainStatus").setAttribute('hidden', 'true');
                        }
                    }
                })
                .error(function(){
                    alert('Loi cmnr');
                });
        };

        $scope.changeBackgroundNotificationStatus = function(){
            if (!$scope.backgroundNotification) unsubscribe();
            else subscribe();

            checkServiceWorker();

            $http.post('/backend-setting/gcm-status', {gcm: $scope.backgroundNotification})
                .success(function(result){
                    if (!result.s) alert("Save setting due to error");
                })
                .error(function(){
                    alert("Error From Server");
                });
        };

        $scope.editEndMaintainTime = function(){
            $scope.timeSetting = true;
            $scope.setting.endMaintainTime = null;
        }
    });
}(angular, document));