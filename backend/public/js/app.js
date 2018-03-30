/*
 Money Lover
 Application
 */
var ML = null;

(function ($a) {
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

    ML.config(function ($routeProvider, $locationProvider, $compileProvider, $tooltipProvider, localStorageServiceProvider) {
        $routeProvider

            .when('/landing', {
                templateUrl: '/partials/landing_page/index.html',
                controller: 'landingpage'
            })
            .when('/emails', {
                templateUrl: '/partials/emails/index.html',
                controller: 'emails'
            })
            .when('/users/info', {
                templateUrl: '/partials/info/index.html',
                controller: 'info'
            })
            .when('/messages', {
                templateUrl: '/partials/messages/index.html',
                controller: 'messages'
            })
            .when('/messages/report', {
                templateUrl: '/partials/messages/report.html',
                controller: 'pushMessageReport'
            })
            .when('/clientkey', {
                templateUrl: '/partials/client_key/index.html',
                controller: 'clientKey'
            })
            .when('/events', {
                templateUrl: '/partials/events/index.html',
                controller: 'events'
            })
            .when('/currency', {
                templateUrl: '/partials/currency/index.html',
                controller: 'currency'
            })
            .when('/icons', {
                templateUrl: '/partials/icons/index.html',
                controller: 'icons'
            })
            .when('/icons/info-maker', {
                templateUrl: '/partials/icons/info_maker.html',
                controller: 'iconsInfoMaker'
            })
            .when('/bank', {
                templateUrl: '/partials/bank/index.html',
                controller: 'bank'
            })
            .when('/users', {
                templateUrl: '/partials/users/index.html',
                controller: 'users'
            })
            .when('/stats/:status', {
                templateUrl: '/partials/stats/index.html',
                controller: 'Stats'
            })
            .when('/userbankmsg', {
                templateUrl: '/partials/userbankmsg/index.html',
                controller: 'userbankmsg'
            })
            .when('/bonus', {
                templateUrl: '/partials/bonus/index.html',
                controller: 'bonus'
            })
            .when('/find', {
                templateUrl: '/partials/find/index.html',
                controller: 'find'
            })
            .when('/admin', {
                templateUrl: '/partials/admin/index.html',
                controller: 'admin'
            })
            .when('/purchaselog', {
                templateUrl: '/partials/purchaselog/index.html',
                controller: 'purchaselog'
            })
            .when('/premiumlog', {
                templateUrl: '/partials/premiumlog/index.html',
                controller: 'premiumlog'
            })
            .when('/wallet-stats', {
                templateUrl: '/partials/walletstats/index.html',
                controller: 'walletstats'
            })
            .when('/send-premium-code', {
                templateUrl: '/partials/users/send-code-active-email.html',
                controller: 'sendpremiumcode'
            })
            .when('/user-tag-manager', {
                templateUrl: '/partials/tags/index.html',
                controller: 'userTagManager'
            })
            .when('/server-setting', {
                templateUrl: '/partials/setting/index.html',
                controller: 'serverSetting'
            })
            .when('/helpdesk/issue', {
                templateUrl: '/partials/helpdesk/issue/index.html',
                controller: 'helpdeskIssue'
            })
            .when('/helpdesk/issue_details/:issue_id', {
                templateUrl: '/partials/helpdesk/issue/issue_details.html',
                controller: 'helpdeskIssueDetails'
            })
            .when('/helpdesk/section', {
                templateUrl: '/partials/helpdesk/section/index.html',
                controller: 'helpDeskFaqSection'
            })
            .when('/helpdesk/faq', {
                templateUrl: '/partials/helpdesk/faq/index.html',
                controller: 'helpdeskFaq'
            })
            .when('/helpdesk/faq/create', {
                templateUrl: '/partials/helpdesk/faq/faq_details.html',
                controller: 'helpdeskFaqDetail'
            })
            .when('/helpdesk/faq/edit/:faq_id', {
                templateUrl: '/partials/helpdesk/faq/faq_details.html',
                controller: 'helpdeskFaqDetail'
            })
            .when('/helpdesk/stats', {
                templateUrl: '/partials/helpdesk/stats/index.html',
                controller: 'helpdeskStats'
            })
            .when('/helpdesk/edit-auto-reply-messages', {
                templateUrl: '/partials/helpdesk/setting/edit-auto-reply-messages.html',
                controller: 'helpdeskEditAutoReplyMessages'
            })
            .when('/sync-fail-log', {
                templateUrl: '/partials/sync_fail_log/index.html',
                controller: 'SyncFailLog'
            })
            .when('/sync-fail-log/:id', {
                templateUrl: '/partials/sync_fail_log/detail.html',
                controller: 'SyncFailDetail'
            })
            .when('/lucky', {
                templateUrl: '/partials/lucky/index.html',
                controller: 'lucky'
            })
            .when('/mac-beta', {
                templateUrl: '/partials/mac-beta/index.html',
                controller: 'macBeta'
            })
            .when('/subscription-products', {
                templateUrl: '/partials/subscription-product/index.html',
                controller: 'subscriptionProduct'
            })
            .when('/subscription-log', {
                templateUrl: '/partials/subscription-log/index.html',
                controller: 'subscriptionLog'
            })
            .when('/subscription-stats', {
                templateUrl: '/partials/subscription-stats/index.html',
                controller: 'subscriptionStats'
            })
            .when('/subscription-code', {
                templateUrl: '/partials/subscription-code/index.html',
                controller: 'subscriptionCode'
            })
            .when('/logsync', {
                templateUrl: '/partials/log_sync/index.html',
                controller: 'LogSync'
            })
            .when('/logsync/:id', {
                templateUrl: '/partials/log_sync/detail.html',
                controller: 'LogSyncDetail'
            })
            .when('/coupon', {
                templateUrl: '/partials/coupon/index.html',
                controller: 'coupon'
            })
            .when('/remote-wallet/service', {
                templateUrl: '/partials/rw-provider/index.html',
                controller: 'rwProvider'
            })
            .when('/remote-wallet/request', {
                templateUrl: '/partials/rw-provider/request.html',
                controller: 'rwRequest'
            })
            .when('/remote-wallet/list', {
                templateUrl: '/partials/info/remote-wallet-list.html',
                controller: 'rwList'
            })
            .when('/test-shoeboxed', {
                templateUrl: '/partials/shoeboxed/index.html',
                controller: 'shoeboxed'
            })
            .when('/systems-info', {
                templateUrl: '/partials/setting/systems-info.html',
                controller: 'systemsinfo'
            })
            .when('/wallet-diagnosis', {
                templateUrl: '/partials/info/wallet_diagnosis.html',
                controller: 'walletDiagnosis'
            })
            .when('/devices', {
                templateUrl: '/partials/device/devices.html',
                controller: 'user_devices'
            })
            .when('/changelog', {
                templateUrl: '/partials/setting/changelog.html',
                controller: 'changelog'
            })
            .when('/change-email', {
                templateUrl: '/partials/change_email/index.html',
                controller: 'change_email'
            })
            .when('/search-query', {
                templateUrl: '/partials/search_query/index.html',
                controller: 'searchQuery'
            })
            .when('/search-query/details', {
                templateUrl: '/partials/search_query/details.html',
                controller: 'searchQueryDetails'
            })
            .when('/image-manager', {
                templateUrl: '/partials/images/index.html',
                controller: 'images'
            })
            .when('/push-notification-request', {
                templateUrl: '/partials/push_notification_request/index.html',
                controller: 'pnRequest'
            })
            .when('/milestone', {
                templateUrl: '/partials/setting/milestone.html',
                controller: 'mileStone'
            })
            .when('/query-compare', {
                templateUrl: '/partials/query_compare/index.html',
                controller: 'queryCompare'
            })
            .when('/notification-fail', {
                templateUrl: '/partials/dashboard/notification_log.html',
                controller: 'NotificationFail'
            })
            .when('/partners', {
                templateUrl: '/partials/partners/index.html',
                controller: 'Partners'
            })
            .when('/active', {
                templateUrl: '/partials/active/index.html',
                controller: 'ActiveUsers'
            })
            .when('/receipt', {
                templateUrl: '/partials/receipt/receipt-list.html',
                controller: 'receiptList'
            })
            .when('/receipt/ranking', {
                templateUrl: '/partials/receipt/ranking.html',
                controller: 'receiptRanking'
            })
            .when('/classification-log', {
                templateUrl: '/partials/classification_logs/list.html',
                controller: 'classification_logs'
            })
            .when('/receipt/details/:id', {
                templateUrl: '/partials/receipt/receipt-detail.html',
                controller: 'receiptDetails'
            })
            .when('/use-credits', {
                templateUrl: '/partials/use_credit/index.html',
                controller: 'UseCredit'
            })
            .when('/uncategorized-transaction', {
                templateUrl: '/partials/uncategorized_transaction/index.html',
                controller: 'UncategorizedTransaction'
            })
            .when('/premium-products', {
                templateUrl: '/partials/premium_products/index.html',
                controller: 'PremiumProducts'
            })
            .when('/item-log', {
                templateUrl: '/partials/item_log/index.html',
                controller: 'ItemLog'
            })
            .when('/item-chart', {
                templateUrl: '/partials/item_chart/index.html',
                controller: 'ItemChart'
            })
            .when('/transaction', {
                templateUrl: '/partials/transaction/index.html',
                controller: 'Transaction'
            })
            .when('/check-purchase-bill', {
                templateUrl: '/partials/check_purchase_bill/index.html',
                controller: 'checkPurchaseBill'
            })
            .when('/dashboard/users', {
                templateUrl: '/partials/dashboard/user_detail.html',
                controller: 'dashboardUser'
            })
            .when('/dashboard/linked-wallet', {
                templateUrl: '/partials/dashboard/linked_wallet_detail.html',
                controller: 'dashboardLinkedWallet'
            })
            .when('/dashboard/premium', {
                templateUrl: '/partials/dashboard/premium_detail.html',
                controller: 'dashboardPremium'
            })
            .when('/dashboard/platform', {
                templateUrl: '/partials/dashboard/platform_detail.html',
                controller: 'dashboardPlatform'
            })
            .when('/dashboard/transaction', {
                templateUrl: '/partials/dashboard/transaction_detail.html',
                controller: 'dashboardTransaction'
            })
            .when('/dashboard/wallet', {
                templateUrl: '/partials/dashboard/wallet_detail.html',
                controller: 'dashboardWallet'
            })
            .when('/tags', {
                templateUrl: '/partials/tags/index.html',
                controller: 'tags'
            })
            .when('/provider-country-code', {
                templateUrl: '/partials/file_provider/index.html',
                controller: 'provider'
            })
            .when('/provider-country-code/category/:provider', {
                templateUrl: '/partials/file_provider/pick_category.html',
                controller: 'providerCategory'
            })
            .when('/provider-country-code/provider/:categoryId/:country', {
                templateUrl: '/partials/file_provider/provider_list.html',
                controller: 'providerData'
            })
            .when('/gift', {
                templateUrl: '/partials/gift/index.html',
                controller: 'Gift'
            })
            .when('/exception', {
                templateUrl: '/partials/exception/index.html',
                controller: 'exception'
            })
            .when('/email_push_automation', {
                templateUrl: '/partials/email_push_automation/index_new.html',
                controller: 'email_push_automation'
            })
            .when('/register_dev_ml', {
                templateUrl: '/partials/open_api/register_partner.html',
                controller: 'register_dev_ml'
            })
            .when('/automation_log', {
                templateUrl: '/partials/email_push_automation/log.html',
                controller: 'automation_log'
            })
            .when('/discount', {
                templateUrl: '/partials/discount/index.html',
                controller: 'discountController'
            })
            .when('/subscription_renew_log', {
                templateUrl: '/partials/renewable_log/index.html',
                controller: 'subscriptionRenewLogController'
            })
            .when('/campaign', {
                templateUrl: '/partials/campaign/index.html',
                controller: 'campaignMarketingCtrl'
            })
            .when('/group', {
                templateUrl: '/partials/group/index.html',
                controller: 'groupMarketingCtrl'
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
        $tooltipProvider.options({ appendToBody: true });
    });

    ML.run(['$rootScope', '$templateCache', 'Page', 'MoneyLover', 'notificationService', '$http',
        function ($rootScope, $templateCache, Page, MoneyLover, notificationService, $http) {
            $rootScope.MLTitle = ((env !== 'production') ? '[' + env.toUpperCase() + ']' : '') + 'Money Lover Headquarter';
            $rootScope.$watch(function () {
                return notificationService.getNotification();
            }, function (newValue) {
                $rootScope.MLTitle = ((env !== 'production') ? '[' + env.toUpperCase() + ']' : '') + ((newValue) ? "(" + newValue + ")" : "") + " Money Lover Headquarter";
            });
            $rootScope.MLPageDetail = 'Dashboard';
            $rootScope.MLAuthor = Page.author;
            $rootScope.MLDescription = Page.description;
            $rootScope.MLKeyword = Page.keyword;
            $rootScope.tabSelect = 1;

            $rootScope.$on('$viewContentLoaded', function () {
                loadPermission();
            });

            function loadPermission() {
                $http.post('/permission/load').success(function (data) {
                    $rootScope.$broadcast('adminPermission', data);
                })
                    .error(function () {
                        alert("Error From Server");
                    });
            };

            $rootScope.editorOptions = {
                language: 'vi',
                height: 230,
                forcePasteAsPlainText: true,
                toolbar: [{
                    name: 'document',
                    groups: ['mode', 'document', 'doctools'],
                    items: ['Source', '-', 'Save', 'NewPage', 'Preview', 'Print', '-', 'Templates']
                }, {
                    name: 'clipboard',
                    groups: ['clipboard', 'undo'],
                    items: ['Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo']
                }, {
                    name: 'editing',
                    groups: ['find', 'selection', 'spellchecker'],
                    items: ['Find', 'Replace', '-', 'SelectAll', '-', 'Scayt']
                }, {
                    name: 'forms',
                    items: ['Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField']
                },
                    '/', {
                    name: 'basicstyles',
                    groups: ['basicstyles', 'cleanup'],
                    items: ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat']
                }, {
                    name: 'paragraph',
                    groups: ['list', 'indent', 'blocks', 'align', 'bidi'],
                    items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', '-', 'BidiLtr', 'BidiRtl', 'Language']
                }, {
                    name: 'links',
                    items: ['Link', 'Unlink', 'Anchor']
                }, {
                    name: 'insert',
                    items: ['Image', 'Flash', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe']
                },
                    '/', {
                    name: 'styles',
                    items: ['Styles', 'Format', 'Font', 'FontSize']
                }, {
                    name: 'colors',
                    items: ['TextColor', 'BGColor']
                }, {
                    name: 'tools',
                    items: ['Maximize', 'ShowBlocks']
                }, {
                    name: 'others',
                    items: ['-']
                }
                ],
                toolbarGroups: [{
                    name: 'document',
                    groups: ['mode', 'document', 'doctools']
                }, {
                    name: 'clipboard',
                    groups: ['clipboard', 'undo']
                }, {
                    name: 'editing',
                    groups: ['find', 'selection', 'spellchecker']
                }, {
                    name: 'forms'
                },
                    '/', {
                    name: 'basicstyles',
                    groups: ['basicstyles', 'cleanup']
                }, {
                    name: 'paragraph',
                    groups: ['list', 'indent', 'blocks', 'align', 'bidi']
                }, {
                    name: 'links'
                }, {
                    name: 'insert'
                },
                    '/', {
                    name: 'styles'
                }, {
                    name: 'colors'
                }, {
                    name: 'tools'
                }, {
                    name: 'others'
                }
                ]
            };
        }
    ]);
}(angular));
