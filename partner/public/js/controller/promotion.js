(function($a){
    'use strict';
    $a.module('ML').controller('promotion', function($scope, $rootScope, $http, $modal) {
        $rootScope.MLPageDetail = 'Promotions';
        $rootScope.tabSelect = 3;
        var limit = 10;
        var skip = 0;
        var options = {};
        $scope.partnerName = partnerName;
        $scope.page = 1;
        $scope.isFirstPage = true;
        $scope.isLoading = true;

        //get list on load
        var getList = function(skip){
            $scope.createPromote = false;

            options.skip = skip;
            options.limit = limit;

            $http.post('/promotion/list', {options: options})
                .success(function (data) {
                    $scope.isLoading = false;
                    if (data.s) {
                        //disable notice no promotion
                        if (data.d.length === 0) {
                            $scope.noPromotions = true;
                        } else {
                            $scope.noPromotions = false;
                        }

                        $scope.listPromote = data.d;

                        //if last page disable button next
                        $scope.isLastPage = data.d.length < limit;
                    } else {
                        alert('Get List fails!')
                    }
                })
                .error(function () {
                    $scope.isLoading = false;
                    alert("Error from Server");
                })
        };
        // getList();
        $scope.getList = getList();

        //list categories
        var getListCategories = function(){
            $http.post('/promotion/listCategory', {skip: skip, limit: 50})
                .success(function (data) {
                    if (data.s) {
                        $scope.categories = data.d;
                    } else {
                        alert('Get list categories fails!')
                    }
                })
                .error(function () {
                    alert("Error from Server");
                })
        };
        $scope.categories = getListCategories();

        //Open form create
        $scope.addPromote = function(){
            $scope.isPublic = true; //display button Post instead of Save Draft
            $scope.createButton = true; //display button create for form create
            $scope.createPromote = true;
            $scope.promoteInfo = {};
            $scope.promoteInfo.category = $scope.categories[0];
            $scope.titleFormPromote = 'New promotion';
        };

        function postMethod(data, link, listInfo){
            if (!data) {
                $scope.alertContentPromote = true;
                $scope.alertTitlePromote = true;
            } else {
                if (data.title && data.content) {
                    $http.post(link, listInfo)
                        .success(function (data) {
                            if (data.s) {
                                keepPageInAction();
                            } else {
                                alert(data.m)
                            }
                        })
                        .error(function () {
                            alert("Error from Server");
                        })
                }
            }
        }

        //action create
        $scope.create = function(promoteInfo){
            $scope.isLoading = true;
            promoteInfo.status = 'Public';
            var link = '/promotion/add';
            var listInfo = {info: promoteInfo};
            postMethod(promoteInfo, link, listInfo);
        };
        $scope.draft = function(promoteInfo){
            $scope.isLoading = true;
            promoteInfo.status = 'Draft';
            var link = '/promotion/add';
            var listInfo = {info: promoteInfo};
            postMethod(promoteInfo, link, listInfo);
        };

        //Open form edit
        $scope.editPromote = function(promote){
            $scope.createButton = false; //hidden button create for form Edit
            $scope.createPromote = true;
            $scope.promoteInfo = promote;
            $scope.titleFormPromote = 'Edit promotion';
        };

        //action save form edit
        $scope.save = function(promoteInfo){
            $scope.isLoading = true;
            var link = '/promotion/edit';
            var listInfo = {id: promoteInfo._id, info: promoteInfo};
            postMethod(promoteInfo, link, listInfo);
        };


        //Delete Promotion
        $scope.deletePromote = function(promote){
            var s = confirm('"' +promote.title+'"' + "\n\nThis promotion will not recovery, wanna delete?");
            if(s) {
                $http.post('/promotion/delete', {promote: promote})
                .success(function (data) {
                    if (!data.error) {
                        getList();
                    } else {
                        alert(data.msg);
                    }
                })
                .error(function () {
                    alert('Error from server :(');
                });
            }
        };

        //action cancel
        $scope.returnList = function(){
            $scope.createPromote = false;
            $scope.alertContentPromote = false;
            $scope.alertTitlePromote = false;
        };

        //Open modal categories
        $scope.listCategory = function(){
            var categories = $scope.categories;
            var modalInstance = $modal.open({
                templateUrl: '/partials/promotion/modalCategory.html',
                controller: listCategoriesCtrl,
                resolve: {
                    categories: function() {
                        return categories;
                    }
                }
            });
        };

        //Actions for category
        var listCategoriesCtrl = function($scope, $modalInstance, categories){
            $scope.categories = categories;
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };

            $scope.removeCategory = function(category){
                var i = categories.indexOf(category);
                var cfm = confirm('All posts of "'+category.name+'" has been deleted.  \nDo you want remove this category?');

                if (cfm) {
                    $http.post('/promotion/deleteCategory', {category: category})
                    .success(function (data) {
                        if (!data.error) {
                            categories.splice(i, 1);
                            getListCategories();
                            getList();
                        } else {
                            alert(data.msg);
                        }
                    })
                    .error(function () {
                        alert('Error from server :(');
                    });
                }
            };

            $scope.addCate = function(newCategory){

                if (newCategory.length >=3 && newCategory.length <= 20) {
                    var info = {};
                    info.category = newCategory;
                    $http.post("/promotion/addCategory", {info: info})
                        .success(function(data){
                            if(data.s) {
                                $scope.categories.unshift(data.d);
                                newCategory = '';
                                $a.element("#newCategory").val('');
                                getListCategories();
                            } else {
                                alert('Cannot add categories')
                            }
                        }).error(function(){
                            alert('Error from server')
                        });
                }

            };
        };

        function keepPageInAction(){
            skip = ($scope.page-1)*limit;
            $scope.isLoading = true;
            getList(skip);
        }

        //Change status for promotion
        function postDataStatus(promote){
            $http.post('/promotion/changeStatus', {id: promote._id, info: promote.status})
                .success(function (data) {
                    if (data.s) {
                        keepPageInAction();
                    } else {
                        alert(data.m)
                    }
                })
                .error(function () {
                    alert("Error from Server");
                })
        }

        $scope.changeStatus = function(promote){

            // only confirm if change from Draft to Public
            if (promote.status === 'Draft') {
                var iWantChange = confirm('Do you wanna public "' + promote.title + '"');
                if (iWantChange) {
                    postDataStatus(promote);
                }
            } else {
                postDataStatus(promote);
            }

        };

        //Open modal review
        $scope.review = function(promote){
            var modalInstance = $modal.open({
                templateUrl: '/partials/promotion/modalReview.html',
                controller: reviewCtrl,
                windowClass: 'mobileMockupModal',
                resolve: {
                    promote: function() {
                        return promote;
                    }
                }
            });
        };

        var reviewCtrl = function($scope, $modalInstance, promote){
            $scope.partnerName = partnerName;
            $scope.openInModal = true; //Only display close button in modal
            $scope.detailPage = false; //Display page title first
            $scope.promote = promote;
            $scope.cancel = function(){
                $modalInstance.dismiss('cancel');
            };
        };

        $scope.nextPage = function(status) {
            $scope.page += status;
            keepPageInAction();
            $scope.isFirstPage = $scope.page === 1; //if first page disable button previous
        };



    })
}(angular));
