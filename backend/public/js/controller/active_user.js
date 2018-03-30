(function($a, moment, async){
    'use strict';

    $a.module('ML').controller('ActiveUsers', function($scope, $rootScope, $http, $modal){
        $rootScope.MLPageDetail = 'Active Users';
        $rootScope.tabSelect = 1;

        $scope.numbers = {};
        $scope.rates = {};
        $scope.isLoading = false;

        var limit = 15;
        $scope.endDate = moment().valueOf();
        $scope.startDate = moment().subtract(limit, 'day').startOf('day').valueOf();
        $scope.days = [1, 7, 30, 100];
        $scope.viewMode = 'Total';
        var chartData = {};

        var charts = [];
        var LoyalUserCode = {
            oneWeek: {
                total: 1810,
                android: 1811,
                ios: 1812,
                windowsdesktop: 1813,
                windowsmobile: 1814,
            },
            oneMonth: {
                total: 1820,
                android: 1821,
                ios: 1822,
                windowsdesktop: 1823,
                windowsmobile: 1824
            },
            threeMonth: {
                total: 1830,
                android: 1831,
                ios: 1832,
                windowsdesktop: 1833,
                windowsmobile: 1834
            },
            sixMonth: {
                total: 1850,
                android: 1851,
                ios: 1852,
                windowsdesktop: 1853,
                windowsmobile: 1854
            },
            oneYear: {
                total: 1860,
                android: 1861,
                ios: 1862,
                windowsdesktop: 1863,
                windowsmobile: 1864
            },
            longTime: {
                total: 1840,
                android: 1841,
                ios: 1842,
                windowsdesktop: 1843,
                windowsmobile: 1844
            }
        };

        var isoCountries = {
            'AF' : 'Afghanistan',
            'AX' : 'Aland Islands',
            'AL' : 'Albania',
            'DZ' : 'Algeria',
            'AS' : 'American Samoa',
            'AD' : 'Andorra',
            'AO' : 'Angola',
            'AI' : 'Anguilla',
            'AQ' : 'Antarctica',
            'AG' : 'Antigua And Barbuda',
            'AR' : 'Argentina',
            'AM' : 'Armenia',
            'AW' : 'Aruba',
            'AU' : 'Australia',
            'AT' : 'Austria',
            'AZ' : 'Azerbaijan',
            'BS' : 'Bahamas',
            'BH' : 'Bahrain',
            'BD' : 'Bangladesh',
            'BB' : 'Barbados',
            'BY' : 'Belarus',
            'BE' : 'Belgium',
            'BZ' : 'Belize',
            'BJ' : 'Benin',
            'BM' : 'Bermuda',
            'BT' : 'Bhutan',
            'BO' : 'Bolivia',
            'BA' : 'Bosnia And Herzegovina',
            'BW' : 'Botswana',
            'BV' : 'Bouvet Island',
            'BR' : 'Brazil',
            'IO' : 'British Indian Ocean Territory',
            'BN' : 'Brunei Darussalam',
            'BG' : 'Bulgaria',
            'BF' : 'Burkina Faso',
            'BI' : 'Burundi',
            'KH' : 'Cambodia',
            'CM' : 'Cameroon',
            'CA' : 'Canada',
            'CV' : 'Cape Verde',
            'KY' : 'Cayman Islands',
            'CF' : 'Central African Republic',
            'TD' : 'Chad',
            'CL' : 'Chile',
            'CN' : 'China',
            'CX' : 'Christmas Island',
            'CC' : 'Cocos (Keeling) Islands',
            'CO' : 'Colombia',
            'KM' : 'Comoros',
            'CG' : 'Congo',
            'CD' : 'Congo, Democratic Republic',
            'CK' : 'Cook Islands',
            'CR' : 'Costa Rica',
            'CI' : 'Cote D\'Ivoire',
            'HR' : 'Croatia',
            'CU' : 'Cuba',
            'CY' : 'Cyprus',
            'CZ' : 'Czech Republic',
            'DK' : 'Denmark',
            'DJ' : 'Djibouti',
            'DM' : 'Dominica',
            'DO' : 'Dominican Republic',
            'EC' : 'Ecuador',
            'EG' : 'Egypt',
            'SV' : 'El Salvador',
            'GQ' : 'Equatorial Guinea',
            'ER' : 'Eritrea',
            'EE' : 'Estonia',
            'ET' : 'Ethiopia',
            'FK' : 'Falkland Islands (Malvinas)',
            'FO' : 'Faroe Islands',
            'FJ' : 'Fiji',
            'FI' : 'Finland',
            'FR' : 'France',
            'GF' : 'French Guiana',
            'PF' : 'French Polynesia',
            'TF' : 'French Southern Territories',
            'GA' : 'Gabon',
            'GM' : 'Gambia',
            'GE' : 'Georgia',
            'DE' : 'Germany',
            'GH' : 'Ghana',
            'GI' : 'Gibraltar',
            'GR' : 'Greece',
            'GL' : 'Greenland',
            'GD' : 'Grenada',
            'GP' : 'Guadeloupe',
            'GU' : 'Guam',
            'GT' : 'Guatemala',
            'GG' : 'Guernsey',
            'GN' : 'Guinea',
            'GW' : 'Guinea-Bissau',
            'GY' : 'Guyana',
            'HT' : 'Haiti',
            'HM' : 'Heard Island & Mcdonald Islands',
            'VA' : 'Holy See (Vatican City State)',
            'HN' : 'Honduras',
            'HK' : 'Hong Kong',
            'HU' : 'Hungary',
            'IS' : 'Iceland',
            'IN' : 'India',
            'ID' : 'Indonesia',
            'IR' : 'Iran, Islamic Republic Of',
            'IQ' : 'Iraq',
            'IE' : 'Ireland',
            'IM' : 'Isle Of Man',
            'IL' : 'Israel',
            'IT' : 'Italy',
            'JM' : 'Jamaica',
            'JP' : 'Japan',
            'JE' : 'Jersey',
            'JO' : 'Jordan',
            'KZ' : 'Kazakhstan',
            'KE' : 'Kenya',
            'KI' : 'Kiribati',
            'KR' : 'Korea',
            'KW' : 'Kuwait',
            'KG' : 'Kyrgyzstan',
            'LA' : 'Lao People\'s Democratic Republic',
            'LV' : 'Latvia',
            'LB' : 'Lebanon',
            'LS' : 'Lesotho',
            'LR' : 'Liberia',
            'LY' : 'Libyan Arab Jamahiriya',
            'LI' : 'Liechtenstein',
            'LT' : 'Lithuania',
            'LU' : 'Luxembourg',
            'MO' : 'Macao',
            'MK' : 'Macedonia',
            'MG' : 'Madagascar',
            'MW' : 'Malawi',
            'MY' : 'Malaysia',
            'MV' : 'Maldives',
            'ML' : 'Mali',
            'MT' : 'Malta',
            'MH' : 'Marshall Islands',
            'MQ' : 'Martinique',
            'MR' : 'Mauritania',
            'MU' : 'Mauritius',
            'YT' : 'Mayotte',
            'MX' : 'Mexico',
            'FM' : 'Micronesia, Federated States Of',
            'MD' : 'Moldova',
            'MC' : 'Monaco',
            'MN' : 'Mongolia',
            'ME' : 'Montenegro',
            'MS' : 'Montserrat',
            'MA' : 'Morocco',
            'MZ' : 'Mozambique',
            'MM' : 'Myanmar',
            'NA' : 'Namibia',
            'NR' : 'Nauru',
            'NP' : 'Nepal',
            'NL' : 'Netherlands',
            'AN' : 'Netherlands Antilles',
            'NC' : 'New Caledonia',
            'NZ' : 'New Zealand',
            'NI' : 'Nicaragua',
            'NE' : 'Niger',
            'NG' : 'Nigeria',
            'NU' : 'Niue',
            'NF' : 'Norfolk Island',
            'MP' : 'Northern Mariana Islands',
            'NO' : 'Norway',
            'OM' : 'Oman',
            'PK' : 'Pakistan',
            'PW' : 'Palau',
            'PS' : 'Palestinian Territory, Occupied',
            'PA' : 'Panama',
            'PG' : 'Papua New Guinea',
            'PY' : 'Paraguay',
            'PE' : 'Peru',
            'PH' : 'Philippines',
            'PN' : 'Pitcairn',
            'PL' : 'Poland',
            'PT' : 'Portugal',
            'PR' : 'Puerto Rico',
            'QA' : 'Qatar',
            'RE' : 'Reunion',
            'RO' : 'Romania',
            'RU' : 'Russian Federation',
            'RW' : 'Rwanda',
            'BL' : 'Saint Barthelemy',
            'SH' : 'Saint Helena',
            'KN' : 'Saint Kitts And Nevis',
            'LC' : 'Saint Lucia',
            'MF' : 'Saint Martin',
            'PM' : 'Saint Pierre And Miquelon',
            'VC' : 'Saint Vincent And Grenadines',
            'WS' : 'Samoa',
            'SM' : 'San Marino',
            'ST' : 'Sao Tome And Principe',
            'SA' : 'Saudi Arabia',
            'SN' : 'Senegal',
            'RS' : 'Serbia',
            'SC' : 'Seychelles',
            'SL' : 'Sierra Leone',
            'SG' : 'Singapore',
            'SK' : 'Slovakia',
            'SI' : 'Slovenia',
            'SB' : 'Solomon Islands',
            'SO' : 'Somalia',
            'ZA' : 'South Africa',
            'GS' : 'South Georgia And Sandwich Isl.',
            'ES' : 'Spain',
            'LK' : 'Sri Lanka',
            'SD' : 'Sudan',
            'SR' : 'Suriname',
            'SJ' : 'Svalbard And Jan Mayen',
            'SZ' : 'Swaziland',
            'SE' : 'Sweden',
            'CH' : 'Switzerland',
            'SY' : 'Syrian Arab Republic',
            'TW' : 'Taiwan',
            'TJ' : 'Tajikistan',
            'TZ' : 'Tanzania',
            'TH' : 'Thailand',
            'TL' : 'Timor-Leste',
            'TG' : 'Togo',
            'TK' : 'Tokelau',
            'TO' : 'Tonga',
            'TT' : 'Trinidad And Tobago',
            'TN' : 'Tunisia',
            'TR' : 'Turkey',
            'TM' : 'Turkmenistan',
            'TC' : 'Turks And Caicos Islands',
            'TV' : 'Tuvalu',
            'UG' : 'Uganda',
            'UA' : 'Ukraine',
            'AE' : 'United Arab Emirates',
            'GB' : 'United Kingdom',
            'US' : 'United States',
            'UM' : 'United States Outlying Islands',
            'UY' : 'Uruguay',
            'UZ' : 'Uzbekistan',
            'VU' : 'Vanuatu',
            'VE' : 'Venezuela',
            'VN' : 'Viet Nam',
            'VG' : 'Virgin Islands, British',
            'VI' : 'Virgin Islands, U.S.',
            'WF' : 'Wallis And Futuna',
            'EH' : 'Western Sahara',
            'YE' : 'Yemen',
            'ZM' : 'Zambia',
            'ZW' : 'Zimbabwe'
        };

        function count(){
            $scope.isLoading = true;

            $http.post('/active/count', {})
                .success(function (result) {
                    if (!result.s) {
                        return alert("Get stats failed");
                    }

                    $scope.numbers = result.d;
                    $scope.rates = percentFilter($scope.numbers);
                })
                .error(function () {
                    alert("Error From Server");
                });
        }
        
        function clearSpaceAndLowerCase(str) {
            var output = str.replace(' ', '');
            output = output.toLowerCase();
            return output;
        }
        
        function clearSpace(str) {
            var output = str.replace(' ', '');
            return output;
        }

        function percentFilter(numbers){
            var result = {};

            var days = Object.keys(numbers);

            days.forEach(function(day){
                if (day != 'total'){
                    result[day] = ((numbers[day] / numbers.total) * 100).toFixed(2);
                }
            });

            return result;
        }

        function getDataChart(table, callback){
            $http.post('/stats', {table: table, types: 1, start: $scope.startDate, end: $scope.endDate, limit: limit})
                .success(function(data){
                    if (!data.s) return callback('Fail');

                    callback(null, data.d);
                }).error(function(){
                    callback('Server Error');
                });
        }

        function formatData(data){
            if (data.length > 0){
                data = _(data).sortBy(function(d) {
                    return d.createAt;
                });

                var newData = [];

                data.forEach(function(stat){
                    if (stat && stat.createAt){
                        var newCreateTime = moment(stat.createAt).subtract(1, 'minutes').subtract(7, 'hours').format('DD/MM');

                        var info = {
                            rate: stat.counter,
                            createAt: newCreateTime
                        };

                        if (stat.metadata) {
                            info.counter = stat.metadata.active || 0;
                            info.total = stat.metadata.total || 0;
                        } else {
                            info.counter = 0;
                            info.total = 0;
                        }

                        newData.push(info);
                    }
                });

                return newData;
            } else {
                return [];
            }
        }

        function formatLoyalData(data) {
            if (!data) return [];
            if (data.length === 0) return [];
            
            data.sort(function(a, b) {
                var timestampA = moment(a.createAt).valueOf();
                var timestampB = moment(b.createAt).valueOf();
                return timestampA - timestampB;
            });

            var newData = [];

            for (var i = 0; i < data.length; i++) {
                var stat = data[i];
                if (stat && stat.createAt){
                    var newCreateTime;
                    newCreateTime = moment(stat.createAt).subtract(8, 'hours').format('DD/MM');
                    newData.push({counter: stat.counter, createAt: newCreateTime}); // moment(stat.createAt).format('DD/MM HH:mm')
                }
            }

            return newData;
        }

        function renderRateChart(element, data){
            return new Morris.Area({
                element: element,
                data: data,
                grid: false,
                lineWidth: 4,
                parseTime: false,
                pointSize: 3,
                behaveLikeLine: true,
                fillOpacity: 0.7,
                smooth: false,
                xkey: 'createAt',
                ykeys: ['rate'],
                labels: ['Active rate'],
                lineColors: ['#379ca8']
            });
        }

        function renderCountChart(element, data){
            return new Morris.Area({
                element: element,
                data: data,
                grid: false,
                lineWidth: 4,
                parseTime: false,
                pointSize: 3,
                behaveLikeLine: true,
                fillOpacity: 0.7,
                smooth: false,
                xkey: 'createAt',
                ykeys: ['counter'],
                labels: ['Active count'],
                lineColors: ['#379ac8']
            });
        }
        
        function renderCombineChart(element, data) {
            charts[element] = null;
            
            if (!charts[element]) {
                return new Morris.Bar({
                    element: element,
                    data: data,
                    parseTime: false,
                    fillOpacity: 0.7,
                    xkey: 'createAt',
                    ykeys: ['oneWeek', 'oneMonth', 'threeMonth', 'sixMonth', 'oneYear', 'longTime'],
                    labels: ['< 1 week', '>= 1 week and < 1 month', ' >= 1 month and < 3 months', '>= 3 months and < 6 months', '>= 6 months and < 1 year', '>= 1 year']
                });
            }

            // charts[element].setData(data);
        }

        function renderChart(tableCode, data, mode){
            var element = tableCode + mode;

            if (!charts[element]) {
                switch (mode) {
                    case 'count':
                        charts[element] = renderCountChart(element, data);
                        break;
                    case 'rate':
                        charts[element] = renderRateChart(element, data);
                        break;
                    default:
                        break;
                }
            } else {
                charts[element].setData(data);
            }
        }

        function getStatByTableCode(table, callback){
            var tableCode = parseInt(table, 10);

            getDataChart(tableCode, function(err, data){
                if (err) return callback(err);

                var newData = formatData(data);

                renderChart(tableCode, newData, 'rate');
                renderChart(tableCode, newData, 'count');

                callback();
            });
        }
        
        function getLoyalDataByUserType(type, days, callback) {
            var keyTasks = Object.keys(LoyalUserCode);
            var tasks = {};
            var mode;
            
            switch (days) {
                case 7:
                    mode = 1;
                    break;
                case 30:
                    mode = 2;
                    break;
                case 100:
                    mode = 3;
                    break;
                case 1:
                    mode = 4;
                    break;
                default:
                    break;
            }
            
            keyTasks.forEach(function(keyTask) {
                var tableCode = (LoyalUserCode[keyTask][type] * 10) + mode;
                
                tasks[keyTask] = function(cb) {
                    getDataChart(tableCode, cb);
                }
            });
            
            async.series(tasks, function(err, results) {
                if (err) return callback(err);
                
                results = formatLoyalDataSet(results);
                results = mergeLoyalData(results);
                
                callback(null, results);
            });
        }
        
        function formatLoyalDataSet(data) {
            var keys = Object.keys(data);
            var newSet = {};
            
            keys.forEach(function(key) {
                var recordList = formatLoyalData(data[key]);
                newSet[key] = recordList;
            });
            
            return newSet;
        }
        
        function mergeLoyalData(data) {
            var newSet = [];
            var keys = Object.keys(data);
            var maxArray = getMaxArray(data);

            for (var i = 0; i < maxArray.length; i++) {
                var item = {
                    createAt: data[maxArray.key][i].createAt
                };

                item[maxArray.key] = data[maxArray.key][i].counter;

                keys.forEach(function(key) {
                    if (key !== maxArray.key) {
                        var counter = 0;

                        data[key].forEach(function(record) {
                            if (record.createAt === item.createAt) {
                                counter = record.counter;
                            }
                        });
                        
                        item[key] = counter;
                    }
                });

                newSet.push(item);
            }

            return newSet;
        }

        function getMaxArray(data) {
            var maxLength = 0;
            var maxKey;
            var keys = Object.keys(data);

            keys.forEach(function(key) {
                if (data[key].length > maxLength) {
                    maxLength = data[key].length;
                    maxKey = key;
                }
            });

            return {length: maxLength, key: maxKey};
        }

        function mergeData(object) {
            var newData = [];
            var total = object.total.d;
            var objSize = Object.keys(object).length;
            var objKeys = Object.keys(object);
            total.forEach(function(data, index) {
                var info = {
                    createAt: data.createAt
                };
                
                for(var i = 0; i < objSize; i++){
                    var counter = object[objKeys[i]].d[index] || 0;
                    
                    if (counter === 0) {
                        info[objKeys[i]] = counter;
                    } else {
                        info[objKeys[i]] = counter.counter;
                    }
                }
                
                newData.push(info);
            });
            
            return newData;
        }
        
        function getStats() {
            $scope.isLoading = true;
            
            async.eachSeries($scope.days, function(day, cb) {
                var key = clearSpace($scope.viewMode) + day.toString();
                var chartId = 'loyal' + clearSpace($scope.viewMode) + day.toString();
                
                if (chartData[key]) {
                    renderCombineChart(chartId, chartData[key]);
                    return cb();
                }
                
                getLoyalDataByUserType(clearSpaceAndLowerCase($scope.viewMode), day, function(err, result) {
                    if (err) return cb(err);
                    
                    chartData[key] = result;
                    renderCombineChart(chartId, chartData[key]);
                    cb();
                });
            }, function(err) {
                $scope.isLoading = false;
                
                if (err) {
                    alert('Get chart data due to error');
                }
            });
        }

        function sortDataDesc(data){
            //array

            for (var i = 0; i < data.length - 1; i++) {
                var max = data[i].value;

                for (var j = i + 1; j < data.length; j++) {
                    if (data[j].value > max) {
                        max = data[j].value;
                        //swap
                        var temp = data[i];
                        data[i] = data[j];
                        data[j] = temp;
                    }
                }
            }

            return data;
        }

        function groupOtherData(data){
            var other = {label: 'Others', value: 0};

            for (var i = 10; i < data.length; i++) {
                other.value += data[i].value;
            }

            var result = data.slice(0, 10);

            result.push(other);

            return result;
        }

        function countryParser(data){
            for (var i = 0; i< data.length -1; i++) {
                data[i].label = isoCountries[data[i].label.split(':')[1].toUpperCase()] || 'Unknown';
            }

            return data;
        }

        function handleReportData(raw_data){
            if (!raw_data) return [];

            if (!raw_data.metadata) return [];

            var data = [];

            var keys = Object.keys(raw_data.metadata);

            keys.forEach(function(key){
                data.push({label: key, value: raw_data.metadata[key]});
            });

            data = sortDataDesc(data);

            data = groupOtherData(data);

            return countryParser(data);
        }

        function getReport(day){
            var modalInstance = $modal.open({
                templateUrl: '/partials/active/modal_detail.html',
                controller: ctrlReport,
                resolve: {
                    day: function () {
                        return day;
                    }
                }
            });
        }

        function ctrlReport($scope, $modalInstance, day){
            var donutChart;

            function renderDonutChart(data){
                if (donutChart) {
                    return donutChart.setData(data);
                }

                donutChart = new Morris.Donut({
                    element: 'donut-chart',
                    data: data
                });
            }

            function GetReportData(){
                $http.post('/active/user-by-country', {day: day})
                    .success(function(result){
                        if (result.s) {
                            $scope.dataResult = result.d;
                            renderDonutChart(handleReportData(result.d));
                        } else {
                            alert("Failed to get report data");
                        }
                    })
                    .error(function(){
                        alert("Error From Server");
                    });
            }

            GetReportData();

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }
        
        /**
         *
         */
        
        getStats();
        $scope.selectView = function(viewMode) {
            if ($scope.viewMode === viewMode) {
                return 0;
            }
            
            
            $scope.viewMode = viewMode;
            
            setTimeout(function() {
                getStats();
            }, 500);
            
        }
    });
}(angular, moment, async));
