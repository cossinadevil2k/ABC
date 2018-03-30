/*
 Stat
 */

'use strict';

let mongoose = require('mongoose');
let Stats = mongoose.model('statsDaily');
let ErrorLog = mongoose.model('errorLog');
let moment = require('moment');
let _ = require('underscore');
let User = mongoose.model('User');
let Transaction = mongoose.model('Transaction');
let Account = mongoose.model('Account');
let Device = mongoose.model('Device');
let Purchased = mongoose.model('PurchasedStat');
let async = require('async');
let Turnover = require('../../helper/turnover');
const utils = require('../../helper/utils');
const isoCountries = {
    'AF': 'Afghanistan',
    'AX': 'Aland Islands',
    'AL': 'Albania',
    'DZ': 'Algeria',
    'AS': 'American Samoa',
    'AD': 'Andorra',
    'AO': 'Angola',
    'AI': 'Anguilla',
    'AQ': 'Antarctica',
    'AG': 'Antigua And Barbuda',
    'AR': 'Argentina',
    'AM': 'Armenia',
    'AW': 'Aruba',
    'AU': 'Australia',
    'AT': 'Austria',
    'AZ': 'Azerbaijan',
    'BS': 'Bahamas',
    'BH': 'Bahrain',
    'BD': 'Bangladesh',
    'BB': 'Barbados',
    'BY': 'Belarus',
    'BE': 'Belgium',
    'BZ': 'Belize',
    'BJ': 'Benin',
    'BM': 'Bermuda',
    'BT': 'Bhutan',
    'BO': 'Bolivia',
    'BA': 'Bosnia And Herzegovina',
    'BW': 'Botswana',
    'BV': 'Bouvet Island',
    'BR': 'Brazil',
    'IO': 'British Indian Ocean Territory',
    'BN': 'Brunei Darussalam',
    'BG': 'Bulgaria',
    'BF': 'Burkina Faso',
    'BI': 'Burundi',
    'KH': 'Cambodia',
    'CM': 'Cameroon',
    'CA': 'Canada',
    'CV': 'Cape Verde',
    'KY': 'Cayman Islands',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'CL': 'Chile',
    'CN': 'China',
    'CX': 'Christmas Island',
    'CC': 'Cocos (Keeling) Islands',
    'CO': 'Colombia',
    'KM': 'Comoros',
    'CG': 'Congo',
    'CD': 'Congo, Democratic Republic',
    'CK': 'Cook Islands',
    'CR': 'Costa Rica',
    'CI': 'Cote D\'Ivoire',
    'HR': 'Croatia',
    'CU': 'Cuba',
    'CY': 'Cyprus',
    'CZ': 'Czech Republic',
    'DK': 'Denmark',
    'DJ': 'Djibouti',
    'DM': 'Dominica',
    'DO': 'Dominican Republic',
    'EC': 'Ecuador',
    'EG': 'Egypt',
    'SV': 'El Salvador',
    'GQ': 'Equatorial Guinea',
    'ER': 'Eritrea',
    'EE': 'Estonia',
    'ET': 'Ethiopia',
    'FK': 'Falkland Islands (Malvinas)',
    'FO': 'Faroe Islands',
    'FJ': 'Fiji',
    'FI': 'Finland',
    'FR': 'France',
    'GF': 'French Guiana',
    'PF': 'French Polynesia',
    'TF': 'French Southern Territories',
    'GA': 'Gabon',
    'GM': 'Gambia',
    'GE': 'Georgia',
    'DE': 'Germany',
    'GH': 'Ghana',
    'GI': 'Gibraltar',
    'GR': 'Greece',
    'GL': 'Greenland',
    'GD': 'Grenada',
    'GP': 'Guadeloupe',
    'GU': 'Guam',
    'GT': 'Guatemala',
    'GG': 'Guernsey',
    'GN': 'Guinea',
    'GW': 'Guinea-Bissau',
    'GY': 'Guyana',
    'HT': 'Haiti',
    'HM': 'Heard Island & Mcdonald Islands',
    'VA': 'Holy See (Vatican City State)',
    'HN': 'Honduras',
    'HK': 'Hong Kong',
    'HU': 'Hungary',
    'IS': 'Iceland',
    'IN': 'India',
    'ID': 'Indonesia',
    'IR': 'Iran, Islamic Republic Of',
    'IQ': 'Iraq',
    'IE': 'Ireland',
    'IM': 'Isle Of Man',
    'IL': 'Israel',
    'IT': 'Italy',
    'JM': 'Jamaica',
    'JP': 'Japan',
    'JE': 'Jersey',
    'JO': 'Jordan',
    'KZ': 'Kazakhstan',
    'KE': 'Kenya',
    'KI': 'Kiribati',
    'KR': 'Korea',
    'KW': 'Kuwait',
    'KG': 'Kyrgyzstan',
    'LA': 'Lao People\'s Democratic Republic',
    'LV': 'Latvia',
    'LB': 'Lebanon',
    'LS': 'Lesotho',
    'LR': 'Liberia',
    'LY': 'Libyan Arab Jamahiriya',
    'LI': 'Liechtenstein',
    'LT': 'Lithuania',
    'LU': 'Luxembourg',
    'MO': 'Macao',
    'MK': 'Macedonia',
    'MG': 'Madagascar',
    'MW': 'Malawi',
    'MY': 'Malaysia',
    'MV': 'Maldives',
    'ML': 'Mali',
    'MT': 'Malta',
    'MH': 'Marshall Islands',
    'MQ': 'Martinique',
    'MR': 'Mauritania',
    'MU': 'Mauritius',
    'YT': 'Mayotte',
    'MX': 'Mexico',
    'FM': 'Micronesia, Federated States Of',
    'MD': 'Moldova',
    'MC': 'Monaco',
    'MN': 'Mongolia',
    'ME': 'Montenegro',
    'MS': 'Montserrat',
    'MA': 'Morocco',
    'MZ': 'Mozambique',
    'MM': 'Myanmar',
    'NA': 'Namibia',
    'NR': 'Nauru',
    'NP': 'Nepal',
    'NL': 'Netherlands',
    'AN': 'Netherlands Antilles',
    'NC': 'New Caledonia',
    'NZ': 'New Zealand',
    'NI': 'Nicaragua',
    'NE': 'Niger',
    'NG': 'Nigeria',
    'NU': 'Niue',
    'NF': 'Norfolk Island',
    'MP': 'Northern Mariana Islands',
    'NO': 'Norway',
    'OM': 'Oman',
    'PK': 'Pakistan',
    'PW': 'Palau',
    'PS': 'Palestinian Territory, Occupied',
    'PA': 'Panama',
    'PG': 'Papua New Guinea',
    'PY': 'Paraguay',
    'PE': 'Peru',
    'PH': 'Philippines',
    'PN': 'Pitcairn',
    'PL': 'Poland',
    'PT': 'Portugal',
    'PR': 'Puerto Rico',
    'QA': 'Qatar',
    'RE': 'Reunion',
    'RO': 'Romania',
    'RU': 'Russian Federation',
    'RW': 'Rwanda',
    'BL': 'Saint Barthelemy',
    'SH': 'Saint Helena',
    'KN': 'Saint Kitts And Nevis',
    'LC': 'Saint Lucia',
    'MF': 'Saint Martin',
    'PM': 'Saint Pierre And Miquelon',
    'VC': 'Saint Vincent And Grenadines',
    'WS': 'Samoa',
    'SM': 'San Marino',
    'ST': 'Sao Tome And Principe',
    'SA': 'Saudi Arabia',
    'SN': 'Senegal',
    'RS': 'Serbia',
    'SC': 'Seychelles',
    'SL': 'Sierra Leone',
    'SG': 'Singapore',
    'SK': 'Slovakia',
    'SI': 'Slovenia',
    'SB': 'Solomon Islands',
    'SO': 'Somalia',
    'ZA': 'South Africa',
    'GS': 'South Georgia And Sandwich Isl.',
    'ES': 'Spain',
    'LK': 'Sri Lanka',
    'SD': 'Sudan',
    'SR': 'Suriname',
    'SJ': 'Svalbard And Jan Mayen',
    'SZ': 'Swaziland',
    'SE': 'Sweden',
    'CH': 'Switzerland',
    'SY': 'Syrian Arab Republic',
    'TW': 'Taiwan',
    'TJ': 'Tajikistan',
    'TZ': 'Tanzania',
    'TH': 'Thailand',
    'TL': 'Timor-Leste',
    'TG': 'Togo',
    'TK': 'Tokelau',
    'TO': 'Tonga',
    'TT': 'Trinidad And Tobago',
    'TN': 'Tunisia',
    'TR': 'Turkey',
    'TM': 'Turkmenistan',
    'TC': 'Turks And Caicos Islands',
    'TV': 'Tuvalu',
    'UG': 'Uganda',
    'UA': 'Ukraine',
    'AE': 'United Arab Emirates',
    'GB': 'United Kingdom',
    'US': 'United States',
    'UM': 'United States Outlying Islands',
    'UY': 'Uruguay',
    'UZ': 'Uzbekistan',
    'VU': 'Vanuatu',
    'VE': 'Venezuela',
    'VN': 'Viet Nam',
    'VG': 'Virgin Islands, British',
    'VI': 'Virgin Islands, U.S.',
    'WF': 'Wallis And Futuna',
    'EH': 'Western Sahara',
    'YE': 'Yemen',
    'ZM': 'Zambia',
    'ZW': 'Zimbabwe'
};

function handleAggregationCountryData(aggregation_data, outputFormat = 'array') {
    let countryList = Object.keys(aggregation_data);

    if (outputFormat === 'array') {
        if (countryList.length === 0) return [];

        return countryList.map(key => {
            let out = {};

            if (key === 'Unknown') {
                out['label'] = key;
            } else if (key === 'Other') {
                out['label'] = 'Unknown';
            } else {
                let country_tag = key.split(':');
                out['label'] = isoCountries[country_tag[1].toUpperCase()];
            }

            out['value'] = aggregation_data[key];
            return out;
        });
    } else {
        let result = {};
        if (countryList.length === 0) return result;

        countryList.forEach(key => {
            if (key === 'Unknown') {
                result[key] = aggregation_data[key];
            } else {
                let country_tag = key.split(':');
                result[isoCountries[country_tag[1].toUpperCase()]] = aggregation_data[key];
            }
        });
    }
}

function handleDateRangedCountryData(aggregation_data) {
    let countryList = Object.keys(aggregation_data);

    if (countryList.length === 0) return [];

    return countryList.map(key => {
        let out = {};

        if (key === 'Unknown') {
            out['label'] = key;
        } else {
            let country_tag = key.split(':');
            out['label'] = isoCountries[country_tag[1].toUpperCase()];
            out['country_code'] = country_tag[1];
        }

        out['value'] = aggregation_data[key];
        return out;
    });
}

function parseCronjobCountryData(data, outputFormat = 'array') {
    if (outputFormat === 'array') {
        let out = [];
        for (let key in data) {
            let country_tag = key.split(':');
            let obj = {};
            obj['label'] = (country_tag[1]) ? isoCountries[country_tag[1].toUpperCase()] : country_tag[0];
            obj['value'] = data[key];
            out.push(obj);
        }

        return out;
    } else {
        let out = {};

        for (let key in data) {
            let country_tag = key.split(':');
            let label = (country_tag[1]) ? isoCountries[country_tag[1].toUpperCase()] : country_tag[0];

            out[label] = data[key];
        }
    }
}

function mergeTwoUserCountryData(data1, data2) {
    let cloneData1 = _.clone(data1);
    let cloneData2 = _.clone(data2);
    let tempMergedData = Object.assign(cloneData1, cloneData2);

    let keys = Object.keys(tempMergedData);

    keys.forEach(country => {
        if (data1[country] && !data2[country]) {
            tempMergedData[country] = data1[country];
        } else if (data2[country] && !data1[country]) {
            tempMergedData[country] = data2[country];
        } else if (!data1[country] && !data2[country]) {
            tempMergedData[country] = 0;
        } else {
            tempMergedData[country] = data1[country] + data2[country];
        }
    });

    return tempMergedData;
}

let statsContent = function (req, res) {
    let params = req.body;
    let startTime = params.start;
    let endTime = params.end;
    let limit = params.limit || 0;
    let table = params.table;
    let types = params.types;

    if (startTime >= 0 && endTime && table) {
        startTime = moment(startTime).format();
        endTime = moment(endTime).add(1, 'days').format();
        Stats.find({ table: table, types: types, createAt: { $lte: endTime, $gte: startTime } })
            .sort({ createAt: -1 })
            .skip(0)
            .limit(limit)
            .exec(function (err, data) {
                if (err) {
                    res.send({ s: false, m: 'Error' });
                } else {
                    res.send({ s: true, d: data });
                }
            });

    } else {
        res.send({ s: false, d: [] });
    }
};

let removeErrorStats = function (table, callback) {
    Stats.remove({ table: table }, function (err, result) {
        if (!err) {
            callback(true);
        } else callback(false);
    });
};

let clearErrorLog = function (req, res) {
    async.series([
        function (callback) {
            getErrorCodeList('errorCode', function (data) {
                let err = 0;

                data.forEach(function (elm) {
                    removeErrorStats(elm.table, function (result) {
                        if (!result) err++;
                    });
                });

                if (err > 0) callback(null, false);
                else callback(null, true);
            });
        },

        function (callback) {
            getErrorCodeList('tableCode', function (data) {
                let err = 0;
                data.forEach(function (elm) {
                    removeErrorStats(elm.table, function (result) {
                        if (!result) err++;
                    });
                });

                if (err > 0) callback(null, false);
                else callback(null, true);
            });
        }
    ], function (err, result) {
        if (result) {
            ErrorLog.remove(function (err) {
                if (!err) res.send({ error: 0 });
                else res.send({ error: 1, msg: "Error stats removed, ErrorLog database cannot remove" });
            });
        } else {
            res.send({ error: 1, msg: "Error while clear ErrorStats" });
        }
    });
};

let getErrorCodeList = function (type, callback) {
    ErrorLog.distinct(type, {}, function (err, result) {
        if (!err) {
            let data = [];
            result.forEach(function (elm) {
                let item = {};
                item.code = elm;
                item.table = parseInt(('1200' + elm.toString()), 10);
                data.push(item);
            });
            callback(data);
        } else callback(false);
    });
};

let getErrorTableCode = function (req, res) {
    getErrorCodeList('tableCode', function (data) {
        if (data) res.send({ data: data });
        else res.send({ data: [] });
    });


};

let getErrorCode = function (req, res) {
    getErrorCodeList('errorCode', function (data) {
        if (data) res.send({ data: data });
        else res.send({ data: [] });
    });
};

function counts(cb) {
    async.parallel({
        users: function (callback) {
            User.count(callback);
        },
        premium: function (callback) {
            User.count({ purchased: true }, callback);
        },
        transactions: function (callback) {
            Transaction.count(callback);
        },
        devices: function (callback) {
            Device.count(callback);
        },
        wallets: function (callback) {
            Account.count(callback);
        },
        linkedWallets: function (callback) {
            let query = {
                isDelete: false,
                account_type: {
                    //$exists: true,
                    $gt: 0
                }
            };

            Account.count(query, callback);
        }
    }, cb);
}

let countUserTransaction = function (req, res) {
    counts(function (err, results) {
        if (err) {
            res.send({ "error": true });
        } else {
            res.send({ "error": false, data: results });
        }
    });
};

let jsonpCountUserTransaction = function (req, res) {
    counts(function (err, result) {
        let response = {};
        if (err) {
            response = { "status": false };
        } else {
            response = { "status": true, data: result };
        }

        //res.send(padding + '(' + JSON.stringify(response) + ')');
        res.jsonp(response);
    });
};

let count = function (req, res) {
    let padding = req.query.abc;

    async.parallel({
        users: function (callback) {
            User.count(function (err, result) {
                if (err || !result)
                    callback(true, null);
                else
                    callback(null, result);
            });
        },
        transactions: function (callback) {
            Transaction.count(function (err, result) {
                if (err || !result)
                    callback(true, null);
                else
                    callback(null, result);
            });
        }
    },
        function (err, results) {
            //results = {users: x, transactions: y}
            if (err || !results) {
                let r = padding + '(' + JSON.stringify({ "error": true }) + ')';
                res.send(r);
            } else {
                let obj = { "error": false, data: results };
                let r = padding + '(' + JSON.stringify(obj) + ')';
                res.send(r);
            }
        });
};

let getPurchasedItems = function (req, res) {
    Purchased.distinct('item', {}, function (err, result) {
        if (!err || result) {
            res.send({ items: result });
        }
    });
};

let getWalletStats = function (req, res) {
    let agg = [
        {
            $group: {
                _id: "$account",
                total: { $sum: 1 },
                ok: { $sum: 0 }
            }
        },
        {
            $sort: { total: 1 }
        },
        {
            $group: {
                _id: "$total",
                amount: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ];

    Transaction.aggregate(agg, function (err, logs) {
        if (err) res.send({ s: false });
        else {
            let filter = [
                { y: "gt0", value: 0 },
                { y: "gt50", value: 0 },
                { y: "gt100", value: 0 },
                { y: "gt500", value: 0 },
                { y: "gt1000", value: 0 }
            ];

            logs.forEach(function (elm) {
                if (elm._id <= 50) {
                    filter[0].value += elm.amount;
                } else if ((elm._id > 50) && (elm._id <= 100)) {
                    filter[1].value += elm.amount;
                } else if ((elm._id > 100) && (elm._id <= 500)) {
                    filter[2].value += elm.amount;
                } else if ((elm._id > 500) && (elm._id <= 1000)) {
                    filter[3].value += elm.amount;
                } else if (elm._id > 1000) {
                    filter[4].value += elm.amount;
                }
            });
            res.send({ s: true, d: filter });
        }
    });
};

let jsonpCountTransaction = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;

    if (!startDate && !endDate) {
        return Transaction.count(callback);
    }

    let query = {
        createdAt: {}
    };

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
        query.createdAt['$gte'] = startDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day').add(1, 'day');
        query.createdAt['$lt'] = endDate;
    }

    Transaction.count(query, callback);

    function callback(err, data) {
        let result = {};

        if (err) {
            result.status = false;
        } else {
            result.status = true;
            result.data = {
                transactions: data
            };
        }

        res.jsonp(result);
    }
};

let jsonpCountUser = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;

    if (!startDate && !endDate) {
        return User.count(callback);
    }

    let query = {
        createdDate: {}
    };

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
        query.createdDate['$gte'] = startDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day').add(1, 'day');
        query.createdDate['$lt'] = endDate;
    }

    User.count(query, callback);

    function callback(err, data) {
        let result = {};

        if (err) {
            result.status = false;
        } else {
            result.status = true;
            result.data = {
                users: data
            };
        }

        res.jsonp(result);
    }
};

let jsonpCountPremium = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;
    let query = { purchased: true };

    if (!startDate && !endDate) {
        return User.count(query, callback);
    }

    query.premium_at = {};

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
        query.premium_at['$gte'] = startDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day').add(1, 'day');
        query.premium_at['$lt'] = endDate;
    }

    User.count(query, callback);

    function callback(err, data) {
        let result = {};

        if (err) {
            result.status = false;
        } else {
            result.status = true;
            result.data = {
                premium: data
            };
        }

        res.jsonp(result);
    }
};

let jsonpCountWallet = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;

    if (!startDate && !endDate) {
        return Account.count(callback);
    }

    let query = {
        createdAt: {}
    };

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
        query.createdAt['$gte'] = startDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day').add(1, 'day');
        query.createdAt['$lt'] = endDate;
    }

    Account.count(query, callback);


    function callback(err, data) {
        let result = {};

        if (err) {
            result.status = false;
        } else {
            result.status = true;
            result.data = {
                wallets: data
            };
        }

        res.jsonp(result);
    }
};

let jsonpCountLinkedWallet = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;
    let query = {
        isDelete: false,
        account_type: {
            //$exists: true,
            $gt: 0
        }
    };

    if (!startDate && !endDate) {
        return Account.count(query, callback);
    }

    query.createdAt = {};

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
        query.createdAt['$gte'] = startDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day').add(1, 'day');
        query.createdAt['$lt'] = endDate;
    }

    Account.count(query, callback);

    function callback(err, data) {
        let result = {};

        if (err) {
            result.status = false;
        } else {
            result.status = true;
            result.data = {
                linkedWallets: data
            };
        }

        res.jsonp(result);
    }
};

let jsonpCountDevice = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;

    if (!startDate && !endDate) {
        return Device.count(callback);
    }

    let query = {
        createdDate: {}
    };

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
        query.createdDate['$gte'] = startDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day').add(1, 'day');
        query.createdDate['$lt'] = endDate;
    }

    Device.count(query, callback);

    function callback(err, data) {
        let result = {};

        if (err) {
            result.status = false;
        } else {
            result.status = true;
            result.data = {
                devices: data
            };
        }

        res.jsonp(result);
    }
};

let userCountryToday = function (req, res) {
    getUserCountryToday((err, data) => {
        if (err) {
            return res.json({ s: false });
        }

        res.json({ s: !err, d: handleAggregationCountryData(data) });
    });
};

function getUserCountryToday(callback) {
    let today = moment().startOf('day');
    let query = { createdDate: { $gte: today } };

    User.find(query, (err, results) => {
        if (err) {
            return callback(err);
        }

        if (!results || results.length === 0) {
            return callback(null, []);
        }

        let data = {};

        results.forEach(user => {
            if (user.tags.length === 0) {
                if (!data['Unknown']) {
                    data['Unknown'] = 0;
                }

                data['Unknown']++;
            } else {
                let hasCountry = false;

                user.tags.forEach(tag => {
                    if (tag.indexOf('country:') !== -1) {
                        hasCountry = true;

                        if (!data[tag]) {
                            data[tag] = 0;
                        }

                        data[tag]++;
                    }
                });

                if (!hasCountry) {
                    if (!data['Unknown']) {
                        data['Unknown'] = 0;
                    }

                    data['Unknown']++;
                }
            }
        });

        callback(null, data);
    });
}

let userCountryByDay = function (req, res) {
    let time = req.body.time;

    if (!time) {
        return res.json({ s: false });
    }

    // getUserCountryByDay(time, (err, data) => {
    //     if (err) {
    //         return res.json({s: false});
    //     }

    //     res.json({s: true, d: parseCronjobCountryData(data)});
    // })


    let startDate = moment(time).startOf('day');
    let endDate = moment(time).endOf('day');

    let query = {
        createdDate: {
            $gte: startDate,
            $lte: endDate
        }
    };

    User.find(query, (err, results) => {
        if (err) {
            return read.json({
                s: false
            });
        }

        if (!results || results.length === 0) {
            return res.json({
                s: true,
                d: []
            });
        }

        let data = {};

        results.forEach(user => {
            if (user.tags.length === 0) {
                if (!data['Unknown']) {
                    data['Unknown'] = 0;
                }

                data['Unknown']++;
            } else {
                let hasCountry = false;

                user.tags.forEach(tag => {
                    if (tag.indexOf('country:') !== -1) {
                        hasCountry = true;

                        if (!data[tag]) {
                            data[tag] = 0;
                        }

                        data[tag]++;
                    }
                });

                if (!hasCountry) {
                    if (!data['Unknown']) {
                        data['Unknown'] = 0;
                    }

                    data['Unknown']++;
                }
            }
        });

        // callback(null, data);
        return res.json({
            s: true,
            d: handleAggregationCountryData(data)
        })
    });
};


function getUserCountryByDay(day, callback) {
    let start_time = moment(day).add(1, 'day').startOf('day');
    let end_time = moment(day).add(1, 'day').endOf('day');

    let query = {
        table: 901,
        createAt: {
            $gte: start_time.format(),
            $lte: end_time.format()
        }
    };

    Stats.findOne(query, (err, data) => {
        if (err) {
            return callback(data);
        }

        if (!data) {
            return callback(null, []);
        }

        callback(null, data.metadata);
    });
}

let userCountryByDateRange = function (req, res) {
    let startTime = req.body.start_time;
    let endTime = req.body.end_time;

    if (!startTime || !endTime) return res.json({ status: false });

    let startDate = moment(startTime, 'DD/MM/YYYY').startOf('day');
    let endDate = moment(endTime, 'DD/MM/YYYY').add(1, 'days').startOf('day');
    let today = moment().startOf('day');
    let result = {};

    getUserCountryData(startDate, err => {
        if (err) return res.json({ status: false });

        let data = handleDateRangedCountryData(result);

        User.count({ createdDate: { $gte: startDate, $lt: endDate } }, (err, count) => {
            res.json({ status: !err, data: data, total: count });
        });
    });

    function getUserCountryData(date, callback) {
        if (date.isSame(today)) {
            return getUserCountryToday((err, data) => {
                if (err) return callback(err);

                // data = handleAggregationCountryData(data, 'object');
                result = mergeTwoUserCountryData(result, data);
                callback();
            });
        }

        getUserCountryByDay(date, (err, data) => {
            if (err) return callback(err);

            // data = parseCronjobCountryData(data, 'object');
            result = mergeTwoUserCountryData(result, data);

            date = moment(date).add(1, 'days');

            if (startDate.isSameOrAfter(endDate)) {
                return callback();
            }

            return getUserCountryData(date, callback);
        });
    }
};

let userUtmToday = function (req, res) {
    let today = moment().format('DD-MM-YYYY');

    let keyword = `utm_source:* && startdate:${today}`;

    let query = utils.createUserQuery(keyword);

    let aggregrate = {
        from: 0,
        size: 10000,
        aggs: {
            taggy: {
                terms: {
                    field: 'tags',
                    include: 'utm_source:.*',
                    size: 0
                }
            }
        }
    };

    User.search(query, aggregrate, (err, results) => {
        if (err) {
            // console.log(err);
            return res.send({ s: false });
        }

        res.send({ s: true, d: handleData(results.aggregations) });
    });

    function handleData(aggregation_data) {
        if (!aggregation_data) return [];

        if (!aggregation_data.taggy) return [];

        if (!aggregation_data.taggy.buckets) return [];

        if (aggregation_data.taggy.buckets.length === 0) return [];

        return aggregation_data.taggy.buckets.map((record) => {
            let out = {};
            let ref_tag = record.key.split(':');

            out['label'] = ref_tag[1].toUpperCase();
            out['value'] = record.doc_count;
            return out;
        });
    }
}

let userUtmByDay = function (req, res) {
    let time = req.body.time;

    if (!time) {
        return res.json({
            s: false
        });
    }

    let startDate = moment(time).startOf('day').format('DD-MM-YYYY');
    let endDate = moment(time).add(1, 'day').startOf('day').format('DD-MM-YYYY');

    let keyword = `utm_source:* && startdate:${startDate} && enddate:${endDate}`;

    let query = utils.createUserQuery(keyword);

    let aggregrate = {
        from: 0,
        size: 10000,
        aggs: {
            taggy: {
                terms: {
                    field: 'tags',
                    include: 'utm_source:.*',
                    size: 0
                }
            }
        }
    };

    User.search(query, aggregrate, (err, results) => {
        if (err) {
            // console.log(err);
            return res.send({ s: false });
        }

        res.send({ s: true, d: handleData(results.aggregations) });
    });

    function handleData(aggregation_data) {
        if (!aggregation_data) return [];

        if (!aggregation_data.taggy) return [];

        if (!aggregation_data.taggy.buckets) return [];

        if (aggregation_data.taggy.buckets.length === 0) return [];

        return aggregation_data.taggy.buckets.map((record) => {
            let out = {};
            let ref_tag = record.key.split(':');

            out['label'] = ref_tag[1].toUpperCase();
            out['value'] = record.doc_count;
            return out;
        });
    }
}

let userRefToday = function (req, res) {
    let today = moment().format('DD-MM-YYYY');

    let keyword = `ref:* && startdate:${today}`;

    let query = utils.createUserQuery(keyword);

    let aggregrate = {
        from: 0,
        size: 10000,
        aggs: {
            taggy: {
                terms: {
                    field: 'tags',
                    include: 'ref:.*',
                    size: 0
                }
            }
        }
    };

    User.search(query, aggregrate, (err, results) => {
        if (err) {
            // console.log(err);
            return res.send({ s: false });
        }

        res.send({ s: true, d: handleData(results.aggregations) });
    });

    function handleData(aggregation_data) {
        if (!aggregation_data) return [];

        if (!aggregation_data.taggy) return [];

        if (!aggregation_data.taggy.buckets) return [];

        if (aggregation_data.taggy.buckets.length === 0) return [];

        return aggregation_data.taggy.buckets.map((record) => {
            let out = {};
            let ref_tag = record.key.split(':');

            out['label'] = ref_tag[1].toUpperCase();
            out['value'] = record.doc_count;
            return out;
        });
    }
};

let premiumCountryToday = function (req, res) {
    let start_time;
    let end_time;
    let time = req.body.time;

    if (!time) {
        start_time = moment().startOf('day');
        end_time = moment().startOf('day').add(1, 'days');
    } else {
        start_time = moment(time).startOf('day');
        end_time = moment(time).startOf('day').add(1, 'days');
    }

    User.find({ premium_at: { $gte: start_time, $lt: end_time } }, (err, userList) => {
        if (err) return res.json({ s: false });

        let result = {};

        async.eachSeries(userList, (user, done) => {
            async.setImmediate(function () {
                if (!user) {
                    return done();
                }

                if (!user.tags || user.tags.length === 0) {
                    if (!result['Unknown']) {
                        result['Unknown'] = 0;
                    }

                    result['Unknown']++;

                    return done();
                }

                user.tags.forEach((tag) => {
                    if (tag.indexOf('country:') !== -1) {
                        if (!result[tag]) {
                            result[tag] = 0;
                        }

                        result[tag]++;
                    } else {
                        if (!result['Unknown']) {
                            result['Unknown'] = 0;
                        }
                    }
                });

                done()
            });
        }, err => {
            res.json({ s: !err, d: handleAggregationCountryData(result) })
        });
    });
};

let premiumCountryDashboard = function (req, res) {
    let start = req.body.start;
    let end = req.body.end;

    if (!start || !end) return res.json({ status: false });

    let start_time = moment(start, 'DD/MM/YYYY').startOf('day');
    let end_time = moment(end, 'DD/MM/YYYY').startOf('day').add(1, 'days');

    User.find({ premium_at: { $gte: start_time, $lt: end_time } }, (err, userList) => {
        if (err) return res.json({ status: false });

        let result = {};

        async.eachSeries(userList, (user, done) => {
            async.setImmediate(function () {
                if (!user) {
                    return done();
                }

                if (!user.tags || user.tags.length === 0) {
                    if (!result['Unknown']) {
                        result['Unknown'] = 0;
                    }

                    result['Unknown']++;

                    return done();
                }

                user.tags.forEach((tag) => {
                    if (tag.indexOf('country:') !== -1) {
                        if (!result[tag]) {
                            result[tag] = 0;
                        }

                        result[tag]++;
                    } else {
                        if (!result['Unknown']) {
                            result['Unknown'] = 0;
                        }
                    }
                });

                done()
            });
        }, err => {
            res.json({ status: !err, data: handleDateRangedCountryData(result), total: userList.length })
        });
    });
};

let userRefByDay = function (req, res) {
    let time = req.body.time;

    if (!time) {
        return res.json({ s: false });
    }

    let start_time = moment(time).add(1, 'day').startOf('day');
    let end_time = moment(time).add(1, 'day').endOf('day');

    let query = {
        table: 902,
        createAt: {
            $gte: start_time.format(),
            $lte: end_time.format()
        }
    };

    Stats.findOne(query, (err, data) => {
        if (err) {
            return res.json({ s: false });
        }

        if (!data) {
            return res.json({ s: true });
        }

        res.json({ s: true, d: parseData(data.metadata) });
    });

    function parseData(data) {
        let out = [];
        for (let key in data) {
            let ref_tag = key.split(':');
            let obj = {};
            obj['label'] = ref_tag[1] || 'Has no ref';
            obj['value'] = data[key];
            out.push(obj);
        }
        return out;
    }
};

let jsonPurchaseByPlatform = function (req, res) {
    let platform = req.query.platform;
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;

    const PLATFORM_TO_MARKET = {
        ios: 'apple_store',
        android: 'googleplay',
        windows: 'windowsstore'
    };

    if (!platform || !PLATFORM_TO_MARKET[platform]) {
        return res.jsonp({ status: false });
    }

    let today = moment().startOf('day');

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
    } else {
        startDate = today;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day');
    } else {
        endDate = today;
    }

    function callbackFunction(err, result) {
        res.jsonp({ status: !err, data: result });
    }

    if (platform === 'ios') {
        return Turnover.getIosTurnoverByDateRange(startDate, endDate, callbackFunction);
    }

    if (platform === 'android') {
        return Turnover.getAndroidTurnoverByDateRange(startDate, endDate, callbackFunction);
    }

    if (platform === 'windows') {
        return Turnover.getWindowsTurnoverByDateRange(startDate, endDate, callbackFunction);
    }
};

let jsonPurchaseTotal = function (req, res) {
    let startDate = req.query.start_date;
    let endDate = req.query.end_date;
    let today = moment().startOf('day');
    let now = moment();
    let minDate = moment('01-01-2012', 'DD-MM-YYYY').startOf('day');
    let callback = (err, result) => {
        res.jsonp({ status: !err, data: result });
    };

    if (!startDate && !endDate) {
        return Turnover.getTurnoverByDate(today, callback);
    }

    if (startDate) {
        startDate = moment(startDate, 'DD-MM-YYYY').startOf('day');
    } else {
        startDate = minDate;
    }

    if (endDate) {
        endDate = moment(endDate, 'DD-MM-YYYY').startOf('day');
    } else {
        endDate = now;
    }

    Turnover.getTurnoverByDateRange(startDate, endDate, callback);
};

module.exports = function (app, config) {
    app.get('/stats/daily', staticsMain);
    app.get('/stats/hourly', staticsMain);
    app.post('/stats', statsContent);
    app.get('/stats/count', count);
    app.get('/stats/:status', staticsMain);
    app.post('/stats/count-user-transaction', countUserTransaction);
    app.post('/stats/user-country-today', userCountryToday);
    app.post('/stats/user-ref-today', userRefToday);
    app.post('/stats/user-utm-today', userUtmToday);
    app.post('/stats/user-utm-by-day', userUtmByDay);
    app.post('/stats/premium-country', premiumCountryToday);
    app.post('/stats/premium-country-for-dashboard', premiumCountryDashboard);
    app.post('/stats/user-country-by-day', userCountryByDay);
    app.post('/stats/user-ref-by-day', userRefByDay);
    app.post('/stats/user-country-by-date-range', userCountryByDateRange);
    app.get('/jsonp/count-user-transaction', jsonpCountUserTransaction);
    app.get('/jsonp/count-transaction', jsonpCountTransaction);
    app.get('/jsonp/count-user', jsonpCountUser);
    app.get('/jsonp/count-premium', jsonpCountPremium);
    app.get('/jsonp/count-wallet', jsonpCountWallet);
    app.get('/jsonp/count-linked-wallet', jsonpCountLinkedWallet);
    app.get('/jsonp/count-device', jsonpCountDevice);
    app.get('/jsonp/purchase-stats-by-platform', jsonPurchaseByPlatform);
    app.get('/jsonp/purchase-stats-total', jsonPurchaseTotal);

    app.post('/errorlog/clear', clearErrorLog);
    app.post('/errorlog/get-table-code', getErrorTableCode);
    app.post('/errorlog/get-error-code', getErrorCode);

    app.get('/purchaselog', staticsMain);
    app.post('/purchaselog/get-purchased-items', getPurchasedItems);
    app.get('/wallet-stats', staticsMain);
    app.get('/stats/get-wallet-stats', getWalletStats);
};
