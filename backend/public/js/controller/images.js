(function($a, AWS){
    'use strict';
    $a.module('ML').controller('images', function($scope, $rootScope, $modal, $http){
        $rootScope.tabSelect = 7;
        $rootScope.MLPageDetail = 'Image Manager';
        $scope.page = 1;
        $scope.isLastPage = true;
        $scope.isFirstPage = true;
        $scope.isLoading = false;
        $scope.transactions = [];
        var limit = 20;
        var bucket;

        var s3Options = {
            accessKeyId: 'AKIAJB6JUVNE22EIBMXA',
            secretAccessKey: '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',
            region: 'ap-southeast-1'
        };

        //config AWS
        connectS3();
        function connectS3(){
            var bucketName = (env === 'production') ? 'money-lover-images' : 'money-lover-images-test';
            AWS.config.update({
                accessKeyId: s3Options.accessKeyId,
                secretAccessKey: s3Options.secretAccessKey
            });
            AWS.config.region = s3Options.region;

            bucket = new AWS.S3({params: {Bucket: bucketName}});
        }

        function encode(data) {
            var str = data.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
            return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
        }

        init();

        function init(){
            var skip = limit * ($scope.page - 1);
            getImageList(skip, limit);
        }

        function getImageList(skip, limit){
            $http.post('/image-manager/get', {skip: skip, limit: limit})
                .success(function(result){
                    if (result.s) {
                        $scope.transactions = result.d;
                        checkPage();
                    }
                    else alert("Get transaction images failed");
                })
                .error(function(){
                    alert("Error From Server");
                });
        }

        $scope.view = function(imageId){
            var modalInstance = $modal.open({
                templateUrl: '/partials/images/view.html',
                controller: viewController,
                resolve: {
                    imageId: function(){
                        return imageId;
                    }
                }
            });
        };

        var viewController = function($scope, $modalInstance, imageId) {
            getImage(imageId);

            function getImage(id){
                if (bucket) {
                    bucket.getObject({Key: id}, function(err, file){
                        var imageUrl = "data:image/jpeg;base64," + encode(file.Body);
                        document.getElementById('transaction_image').setAttribute('src', imageUrl);
                    });
                }
            }

            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };

        function checkPage(){
            $scope.isFirstPage = $scope.page === 1;
            $scope.isLastPage = $scope.transactions.length < limit;
        }

        $scope.nextPage = function(value){
            $scope.page += value;
            var skip = limit * ($scope.page - 1);
            getImageList(skip, limit);
        };
    })
}(angular, AWS));
