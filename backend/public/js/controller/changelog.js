(function($a){
  'use strict';
  $a.module('ML').controller('changelog', function($scope, $rootScope, $http) {
      $rootScope.MLPageDetail = 'Changelogs';
      $rootScope.tabSelect = 3;
      $rootScope.currentVersion = "2.0.0";

      var loadContent = function(){
        $http.get("/changelog.txt")
        .success(function (response){
          $scope.contentLoaded = response;
        }).error(function(){
          alert("Error load changelog");
        });
      };
      loadContent();

  });
}(angular));
