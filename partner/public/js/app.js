/*
	Money Lover
	Application
*/
var ML = null;

(function($a) {
	'use strict';

	ML = $a.module('ML', [
		'ngRoute',
		'ngAnimate',
		'ngSanitize',
		'ngCkeditor',
		'ui.bootstrap',
		'LocalStorageModule',
		'ML.filters',
		'ML.services',
		'ML.directives',
		'ML.controllers',
		'markdown',
		'ngClipboard',
		'ngPrettyJson',
		'cfp.hotkeys',
		'colorpicker.module'
	]);

	ML.config(function($routeProvider, $locationProvider, $compileProvider, $tooltipProvider, localStorageServiceProvider) {
		$routeProvider
			.when('/users', {
				templateUrl: '/partials/user/index.html',
				controller: 'users'
			})
			.when('/promotion', {
				templateUrl: '/partials/promotion/list.html',
				controller: 'promotion'
			})
			.when('/loan', {
				templateUrl: '/partials/bank_item/loan/index.html',
				controller: 'loan'
			})
			.when('/linked-wallet-actions', {
				templateUrl: '/partials/action/index.html',
				controller: 'actions'
			})
			.when('/', {
				templateUrl: '/partials/dashboard/index.html',
				controller: 'dashboard'
			})
			.otherwise({
				redirectTo: '/'
			});
		localStorageServiceProvider.setPrefix('ML.Backend');
		$locationProvider.html5Mode(true);
		$tooltipProvider.options({appendToBody: true});
	});

	ML.run(['$rootScope', '$templateCache', 'Page',  'MoneyLover', 'notificationService',
		function($rootScope, $templateCache, Page, MoneyLover, notificationService) {
			$rootScope.MLTitle			= ((env !== 'production')? '[' + env.toUpperCase() + ']': '') + 'Money Lover Partner';
			$rootScope.$watch(function(){ return notificationService.getNotification(); }, function(newValue){
				$rootScope.MLTitle = ((env !== 'production')? '[' + env.toUpperCase() + ']': '')       + ((newValue)? "(" + newValue + ")" : "") + " Money Lover Partner";
			});
			$rootScope.MLPageDetail		= 'Dashboard';
			$rootScope.MLAuthor			= Page.author;
			$rootScope.MLDescription	= Page.description;
			$rootScope.MLKeyword		= Page.keyword;
			$rootScope.tabSelect		= 1;
			$rootScope.editorOptions = {
				language: 'vi',
				height: 230,
				forcePasteAsPlainText: true,
				toolbar: [
					{ name: 'document', groups: [ 'mode', 'document', 'doctools' ], items: [ 'Source', '-', 'Save', 'NewPage', 'Preview', 'Print', '-', 'Templates' ] },
					{ name: 'clipboard', groups: [ 'clipboard', 'undo' ], items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
					{ name: 'editing', groups: [ 'find', 'selection', 'spellchecker' ], items: [ 'Find', 'Replace', '-', 'SelectAll', '-', 'Scayt' ] },
					{ name: 'forms', items: [ 'Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField' ] },
					'/',
					{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] },
					{ name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ], items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', '-', 'BidiLtr', 'BidiRtl', 'Language' ] },
					{ name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
					{ name: 'insert', items: [ 'Image', 'Flash', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe' ] },
					'/',
					{ name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
					{ name: 'colors', items: [ 'TextColor', 'BGColor' ] },
					{ name: 'tools', items: [ 'Maximize', 'ShowBlocks' ] },
					{ name: 'others', items: [ '-' ] }
				],
				toolbarGroups: [
					{ name: 'document', groups: [ 'mode', 'document', 'doctools' ] },
					{ name: 'clipboard', groups: [ 'clipboard', 'undo' ] },
					{ name: 'editing', groups: [ 'find', 'selection', 'spellchecker' ] },
					{ name: 'forms' },
					'/',
					{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
					{ name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
					{ name: 'links' },
					{ name: 'insert' },
					'/',
					{ name: 'styles' },
					{ name: 'colors' },
					{ name: 'tools' },
					{ name: 'others' }
				]
			};
		}
	]);
}(angular));
