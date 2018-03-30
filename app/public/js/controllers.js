(function($a) {
	'use strict';

	var MLcontrollers = $a.module('ML.controllers', []);

	MLcontrollers.controller('homePage', function($scope, $rootScope, $http, $location, Page) {
		Page.resetTitle();
		Page.menuSelect(1);
		$rootScope.lockScreen = true;
		if($location.path() === '/'){
			if($rootScope.wallet.id) {
				$location.path('/wallet/' + $rootScope.wallet.id);
				$rootScope.lockScreen = false;
			} else {
				if($rootScope.userLogin) $rootScope.popWallet = true;
			}
		}
	});

	MLcontrollers.controller('userAction', ['$scope', '$rootScope', '$http', 'Page', '$translate', '$location',
		function($scope, $rootScope, $http, Page, $translate, $location) {
			$scope.displayLogin = true;
			$scope.displayRegister = false;
			$scope.displayForgotPassword = false;
			$scope.status_forgotpassword = '';
			$scope.formStatus = '';
			$scope.userInfo = {};
			var urlPage = $location.path();
			var urlPageQuery = $location.search();
			$scope.userPageTitle = 'Money Lover';

			$scope.showBox = function(box) {
				if (box === 'login') {
					this.displayLogin = false;
					this.displayRegister = false;
					this.displayForgotPassword = false;
					this.displayConfirmResetPassword = false;
					this.displayResetPassword = false;
					this.formStatus = '';
					this.userPageTitle = $translate('login_money_lover');
				} else if (box === 'register') {
					this.displayLogin = false;
					this.displayRegister = true;
					this.displayForgotPassword = false;
					this.displayConfirmResetPassword = false;
					this.displayResetPassword = false;
					this.formStatus = '';
					this.userPageTitle = $translate('register_title');
				} else if (box === 'comfirmReset') {
					this.displayLogin = false;
					this.displayRegister = false;
					this.displayForgotPassword = false;
					this.displayConfirmResetPassword = true;
					this.displayResetPassword = false;
					this.formStatus = '';
					this.userPageTitle = $translate('login_forgot_password');
				}  else if (box === 'resetPassword') {
					this.displayLogin = false;
					this.displayRegister = false;
					this.displayForgotPassword = false;
					this.displayConfirmResetPassword = false;
					this.displayResetPassword = true;
					this.formStatus = '';
					this.userPageTitle = $translate('login_forgot_password');
				} else {
					this.displayLogin = false;
					this.displayRegister = false;
					this.displayForgotPassword = true;
					this.displayConfirmResetPassword = false;
					this.displayResetPassword = false;
					this.formStatus = '';
					this.userPageTitle = $translate('login_forgot_password');
				}
			};

			if(urlPage === '/reset-password'){
				$scope.showBox('resetPassword');
				$scope.userPageTitle = $translate('login_forgot_password');
			}

			if(urlPageQuery.status === 'forgot_password_error_wrong_email_or_code'){
				$scope.formStatus = $translate('forgot_password_error_wrong_email_or_code');
			}

			$scope.initLogin = function(){
				// this.userPageTitle = $translate('login_money_lover');
			};

			//$scope.submitLogin = function() {
			//	var that = this;
			//	var dataSend = {
			//		user: this.userInfo
			//	};
			//	$http.post('/login', dataSend).success(function(data, status) {
			//		if (data.error) {
			//			$rootScope.userLogin = 0;
			//			that.formStatus = $translate(data.msg);
			//		} else {
			//			Page.saveUserLogged(data.data);
			//			$rootScope.initWallet = true;
			//			Page.initWallet(function(data){
			//				if(data.length > 0) {
			//					Page.checkAndRedirectToWalletDefault();
			//				} else {
			//					$rootScope.userLogin = 1;
			//					$rootScope.popWallet = true;
			//				}
			//			});
			//		}
			//	}).error(function(data, status) {
			//		alert('Error');
			//	});
			//};

			$scope.submitRegister = function() {
				var that = this;
				if (this.userInfo.password != this.userInfo.repassword) {
					this.errorPassword = true;
					this.formStatus = $translate('login_hint_warning_password2');
				} else {
					var dataSend = {
						user: this.userInfo
					};
					$http.post('/register', dataSend).success(function(data, status) {
						that.formStatus = $translate(data.msg);
					}).error(function(data, status) {
						that.formStatus = $translate(data.msg);
					});
				}
			};

			//$scope.logoutUser = function() {
			//	$http.post('/logout', {}).success(function(data, status) {
			//		if (data.error === 0) {
			//			Page.clearLogged();
			//			$location.path('/');
			//		} else {
			//			alert(data.msg);
			//		}
			//	}).error(function(data, status) {
			//		$rootScope.userLogin = 0;
			//		alert('Error');
			//	});
			//};

			$scope.submitForgot = function() {
				var forgotData = this.userInfo;
				var that = this;
				$http.post('/forgot-password', {email: forgotData.email.toLowerCase()}).success(function(data, status){
					if(data.error){
						that.formStatus = $translate(data.msg);
					} else {
						that.showBox('comfirmReset');
					}
				}).error(function(data, status){
					alert('Error');
				});
			};

			$scope.submitConfirm = function(){
				var confirmData = this.userInfo;
				var that = this;
				$http.post('/confirm-forgot-password', {email: confirmData.email, confirm: confirmData.confirmCode}).success(function(data, stats){
					if(data.error) that.formStatus = $translate(data.msg);
					else that.showBox('resetPassword');
				}).error(function(data, status){
					alert('Error');
				});
			};

			$scope.submitResetpassword = function(){
				var that = this;
				if (this.userInfo.password != this.userInfo.repassword) {
					this.errorPassword = true;
					this.formStatus = $translate('login_hint_warning_password2');
				} else {
					var dataSend = {
						user: this.userInfo
					};
					$http.post('/reset-password', dataSend).success(function(data, status) {
						that.showBox('login');
						that.formStatus = $translate(data.msg);
					}).error(function(data, status) {
						alert('Error');
					});
				}
			};

			$scope.switchLanguage = function(langKey) {
				$translate.uses(langKey);
			};
		}
	]);
}(angular));