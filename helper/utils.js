'use strict';

let moment = require('moment');
let env = process.env.NODE_ENV || 'dev';
let config = require('../config/config')[env];
let accounting = require('accounting');
let uuid = require('node-uuid');
let geoip = require('geoip-lite');
let fs = require('fs');
let http = require('http');
let querystring = require('querystring');
let crypto = require('crypto');
// let TagsString = require('../config/tag_constant');

function randomString(callback) {
    crypto.randomBytes(16, function (ex, buf) {
        let token = buf.toString('hex');
        callback(token);
    });
}

function randomPassword(callback) {
    crypto.randomBytes(10, function (ex, buf) {
        let token = buf.toString('hex');
        callback(token);
    });
}

function generateUUID() {
    return uuid.v4().replace(/-/gi, "");
}

/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */

function uid(len) {
    let buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length;

    for (let i = 0; i < len; ++i) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
}

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseDateFromDatabaseFormat(input) {
    let parts = input.match(/(\d+)/g);
    // new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
    return new Date(parts[0], parts[1], parts[2]); // months are 0-based
}

function parseDateFromDatabaseFormatToTimestamp(input) {
    return this.parseDateFromDatabaseFormat(input).getTime();
}

function parseDate(input) {
    let parts = input.match(/(\d+)/g);
    // new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
    return new Date(parts[2], parts[1] - 1, parts[0]); // months are 0-based
}

function dateFormat(date, utc) {
    let fstr = "%Y-%m-%d";
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace(/%[Ymd]/g, function (m) {
        switch (m) {
            case '%Y':
                return date[utc + 'FullYear'](); // no leading zeros required
            case '%m':
                m = 1 + date[utc + 'Month']();
                break;
            case '%d':
                m = date[utc + 'Date']();
                break;
            default:
                return m.slice(1); // unknown code, remove %
        }
        // add leading zero if required
        return ('0' + m).slice(-2);
    });
}

function currentTimestamp() {
    let timeStamp = new Date().getTime();
    return timeStamp;
}

function getCookie(listCookie, cname) {
    if (!listCookie) return null;
    let name = cname + "=";
    let ca = listCookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return null;
}

function msgSuccess(msg, attr) {
    msg = msg || '';
    let returnData = { error: 0, msg: msg };
    if (attr) returnData.data = attr;
    return returnData;
}

function msgError(msg) {
    msg = msg || '';
    return { error: 1, msg: msg };
}

function convertDate(date) {
    try {
        let timer = moment(date, 'YYYY-MM-DD');
        if (timer.isValid()) return timer;
        else return null;
    } catch (e) {
        return null;
    }
}

function replaceVI(string) {
    let unicode = [
        { charKey: 'a', charRegex: /á|à|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ/g },
        { charKey: 'd', charRegex: /đ/g },
        { charKey: 'e', charRegex: /é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/g },
        { charKey: 'i', charRegex: /í|ì|ỉ|ĩ|ị/g },
        { charKey: 'o', charRegex: /ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/g },
        { charKey: 'u', charRegex: /ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/g },
        { charKey: 'y', charRegex: /ý|ỳ|ỷ|ỹ|ỵ/g },
        { charKey: 'A', charRegex: /Á|À|Ả|Ã|Ạ|Ă|Ắ|Ặ|Ằ|Ẳ|Ẵ|Â|Ấ|Ầ|Ẩ|Ẫ|Ậ/g },
        { charKey: 'D', charRegex: /Đ/g },
        { charKey: 'E', charRegex: /É|È|Ẻ|Ẽ|Ẹ|Ê|Ế|Ề|Ể|Ễ|Ệ/g },
        { charKey: 'I', charRegex: /Í|Ì|Ỉ|Ĩ|Ị/g },
        { charKey: 'O', charRegex: /Ó|Ò|Ỏ|Õ|Ọ|Ô|Ố|Ồ|Ổ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ở|Ỡ|Ợ/g },
        { charKey: 'U', charRegex: /Ú|Ù|Ủ|Ũ|Ụ|Ư|Ứ|Ừ|Ử|Ữ|Ự/g },
        { charKey: 'Y', charRegex: /Ý|Ỳ|Ỷ|Ỹ|Ỵ/g }
    ];

    unicode.forEach(function (uni, index) {
        let regex = uni.charRegex;
        let nonUnicode = uni.charKey;
        string = string.replace(regex, nonUnicode);
    });
    return string;
}

function textToSlug(str) {
    str = str.replace(/\?/g, '');
    str = str.trim();
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
    str = replaceVI(str);

    // remove accents, swap ñ for n, etc
    let from = "àáäạảãâầấậẫẩăắằặẵđèéẹẻẽêếềệễểìíỉĩïîòóöọỏõôốồộỗổơớờợỡủỳỷỹỵýùúüûụũưứừựửữñç·/_,:;";
    let to = "aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiiooooooooooooooooouyyyyyuuuuuuuuuuuunc------";
    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    return str;
}

function isEmail(string) {
    let regex = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
    return regex.test(string);
}

function generateLink(events) {
    return 'http:' + config.site.urlHomePage + '/events/' + events.slug + '.' + events._id;
}

function transactionPermalink(id) {
    return 'https:' + config.site.urlHomePage + '/p/transaction/' + id;
}

function parseIcon(iconpath) {
    return config.site.urlStatic + 'img/icon/' + iconpath;
}

function detectDevice(req) {
    let operatingSystems = {
        AndroidOS: /Android|android|/,
        WindowsMobileOS: /Windows CE.*(PPC|Smartphone|Mobile|[0-9]{3}x[0-9]{3})|Window Mobile|Windows Phone [0-9.]+|WCE;/,
        WindowsPhoneOS: /Windows Phone 8.0|Windows Phone OS|XBLWP7|ZuneWP7|Windows Phone 8.1|Windows 10 Mobile|WPDesktop/,
        iOS: /iPhone.*Mobile|iPhone|iPod|iPad/,
        WindowsDesktop: /Windows NT|WOW64/
    };

    let urlDevice = config.urlDevice;
    let userAgent = req.headers['user-agent'].toString();

    if (!userAgent || userAgent === '') {
        return urlDevice.defaults;
    } else if (userAgent.match(operatingSystems.AndroidOS) && userAgent.match(/Linux/)) {
        return urlDevice.AndroidOS;
    } else if (userAgent.match(operatingSystems.iOS) && !userAgent.match(/IEMobile/)) {
        return urlDevice.iOS;
    } else if (userAgent.match(operatingSystems.WindowsPhoneOS) && (userAgent.match(/WPDesktop/) || userAgent.match(/IEMobile/))) {
        return urlDevice.WindowsPhone;
    } else if (userAgent.match(operatingSystems.WindowsMobileOS)) {
        return urlDevice.WindowsPhone;
    } else if (userAgent.match(operatingSystems.WindowsDesktop) && !userAgent.match(/WPDesktop/)) {
        return urlDevice.WindowsDesktop;
    } else return urlDevice.defaults;
}

function generateAmountFormatter(currency, settings) {
    let formatList = ['%s%v', '%v%s'],
        zeroFormat = ['%s0', '0%s'],
        decimalSeparator = [{ decimal: '.', thousand: ',' }, { decimal: ',', thousand: '.' }],
        symbol = currency.s,
        format = formatList[currency.t],
        zero = zeroFormat[currency.t],
        decimal = decimalSeparator[settings.decimalSeparator].decimal,
        thousand = decimalSeparator[settings.decimalSeparator].thousand,
        formatter = {
            symbol: '',
            format: { pos: format, zero: zero }
        };
    if (settings.showCurrency) formatter.symbol = symbol;
    if (settings.negativeStyle === 1) formatter.format.neg = '-' + format;
    if (settings.negativeStyle === 2) formatter.format.neg = '(' + format + ')';
    if (settings.isShorten) formatter.format.isShorten = true;
    return formatter;
}

function amountFormat(amount, currency, settings) {
    let formatList = ['%s%v', '%v %s'],
        zeroFormat = ['%s0', '0 %s'],
        decimalSeparator = [{ decimal: '.', thousand: ',' }, { decimal: ',', thousand: '.' }],
        symbol = currency.s,
        format = formatList[currency.t],
        zero = zeroFormat[currency.t],
        decimal = decimalSeparator[settings.decimalSeparator].decimal,
        thousand = decimalSeparator[settings.decimalSeparator].thousand,
        formatter = {
            symbol: '',
            format: { pos: format, zero: zero }
        };
    formatter.symbol = symbol;
    formatter.precision = 0;

    let parseAmount = amount.toString().split('.');
    if (parseAmount[1]) formatter.precision = parseAmount[1].length;

    return accounting.formatMoney(amount, formatter);
}

function parseCampaign(campaign) {
    if (!campaign) return 'No event';
    if (campaign && campaign.length == 0) return 'No event';
    else {
        let tmpToString = [];
        campaign.forEach(function (item) {
            tmpToString.push(item.name);
        });
        return tmpToString.toString();
    }
}

function convertQueryToBody(req) {
    req.body = req.query;
    return req;
}

function makeAccountShareLink(share) {
    if (env === 'production') return 'https://web.moneylover.me/account/invite/' + share.shareCode;
    else return config.site.urlHomePage + '/account/invite/' + share.shareCode;
}

function detectLocationByIp(ip) {
    ip = ip.split(',')[0];
    return geoip.lookup(ip);
}

function extendObject(target) {
    let ar = [];

    ar.slice.call(arguments, 1).forEach(function (source) {
        for (let key in source) {
            if (source[key] !== undefined) {
                target[key] = source[key];
            }
        }
    });
}

function cacheTimestamp(key, timestamp) {
    fs.readFile(config.whatsNewCache, { flag: 'a+' }, function (err, oldCache) {
        if (err) console.log(err);
        let data = {};

        oldCache = oldCache.toString();
        if (oldCache) {
            try {
                data = JSON.parse(oldCache);
            } catch (e) {
                // console.log(e);
                // console.log('parse error');
            }
        }

        data[key] = timestamp;

        fs.writeFileSync(config.whatsNewCache, JSON.stringify(data));
    });
}

function finsifyWalletStopCrawl(login_id) {
    //let host = '';
    //let path = '';
    //
    //let postData = querystring.stringify({
    //  login_id: login_id
    //});
    //
    //let requestOptions = {
    //  host: host,
    //  port: '80',
    //  path: path,
    //  method: 'POST',
    //  headers: {
    //      'Content-Type': 'application/x-www-form-urlencoded',
    //      'Content-Length': Buffer.byteLength(postData)
    //  }
    //};
    //
    //let request = http.request(requestOptions, function(response){
    //  response.setEncoding('utf8');
    //  response.on('data', function(chunk){
    //      //console.log(chunk);
    //  });
    //});
    //
    //request.write(postData);
    //request.end();
    //console.log(login_id);
}

function realIP(ip) {
    return ip.split(',')[0];
}

function createUserQueryMongo(input) {
    let queryItems = input.split('&&');
    let query = [];
    let skip;
    let limit;
    let startDate;
    let endDate;

    queryItems.forEach(function (element) {
        if (element.length > 0) {
            element = element.trim();
        }
        let str = element.split(":");

        if (element.indexOf("linked:") !== -1) {
            if (str[0] === 'linked') {
                let providerName = str[1];
                query.providerName = providerName;
            }
        }

        if (element.indexOf("limit:") !== -1) {
            if (str[0] === 'limit') {
                limit = str[1];
                query.limit = limit;
            }
        }

        if (element.indexOf("skip:") !== -1) {
            if (str[0] === 'skip') {
                skip = str[1];
                query.skip = skip;
            }
        }

        if (element.indexOf("startDate:") !== -1) {
            if (str[0] === 'startDate') {
                startDate = str[1];
                query.startDate = startDate;
            }
        }

        if (element.indexOf("endDate:") !== -1) {
            if (str[0] === 'endDate') {
                endDate = str[1];
                query.endDate = endDate;
            }
        }

    });

    return query;
}

/* 
   -  linked_service : true/false
    check user no subscribe linked wallet
*/

function createQueryMongoDB(input) {
    let queryItems = input.split('&&');
    let query = {};
    let skip;
    let limit;
    let startDate;
    let endDate;
    let linked_service;

    let createdDateRangeQuery = {};
    let tags = [];
    let not_tags = [];
    let regex = [];
    let not_regex = [];
    let tagObject = [];

    queryItems.forEach(function (element) {
        if (element.length > 0) {
            element = element.trim();
        }
        let str = element.split(":");

        if (element.indexOf("startdate:") !== -1) {
            if (str[0] === 'startdate') {
                startDate = str[1];
                startDate = new Date(startDate);
            }
        }

        if (element.indexOf("enddate:") !== -1) {
            if (str[0] === 'enddate') {
                endDate = str[1];
                endDate = new Date(endDate);
            }
        }

        if (element.indexOf("country:") !== -1) {
            if (str[0] === 'country') {
                let country = str[1];
                // query.tags = { "$in": ["country:" + country] };
                tags.push(["country:" + country]);
            }
        }

        if (element.indexOf("device:") !== -1) {
            if (str[0] === 'device') {
                let device = str[1];
                // query.tags = { "$in": ["device:" + device] };
                tags.push(["device:" + device]);
            }
        }

        if (element.indexOf("check_store:") !== -1) {
            if (str[0] === 'check_store') {
                let check_store = (str[1] == 'true');
                if (check_store) {
                    // query.tags = { "$in": ["check_store"] };
                    tags.push(["check_store"]);
                } else {
                    // query.tags = { "$nin": ["check_store"] };
                    not_tags.push(["check_store"]);
                }
            }
        }


        if (element.indexOf("linked_service:") !== -1) {
            if (str[0] === 'linked_service') {
                let isLinked = (str[1] == 'true');
                // console.log('isLinked ',isLinked);
                if (isLinked) {
                    query.rwExpire = { "$ne": null }
                } else {
                    query.rwExpire = { "$eq": null }
                }
            }
        }

        if (element.indexOf("linked:") !== -1) {
            if (str[0] === 'linked') {
                let isAll = (str[1] == '*');

                if (isAll) {
                    // query.tags = { "$regex": /^linked:.*$/g }
                    regex.push(/(?:linked)\:\w+/g);
                } else {
                    // query.tags = { "$in": ["linked:" + str[1]] }
                    tags.push(["linked:" + str[1]]);
                }
            }
        }

        if (element.indexOf("!linked:" !== -1)) {
            if (str[0] === '!linked') {
                let isAll = (str[1] == '*');

                if (isAll) {
                    // query.tags = { "$regex": /[^linked:$]WD/g };
                    not_regex.push(/^(?!.*linked).*$/g);
                } else {
                    // query.tags = { "$nin": ["linked:" + str[1]] }
                    not_tags.push(["linked:" + str[1]]);
                }
            }
        }

    });

    if (startDate) {
        createdDateRangeQuery["$gte"] = startDate;
    }

    if (endDate) {
        createdDateRangeQuery["$lte"] = endDate;
    }

    if (createdDateRangeQuery) {
        query.createdDate = createdDateRangeQuery;
    }

    if (tags.length > 0) {
        tags.forEach(function (element, index) {
            tagObject.push({ "$in": element });
        });
    }

    if (not_tags.length > 0) {
        not_tags.forEach(function (element, index) {
            tagObject.push({ "$nin": element });
        });
    }

    if (regex.length > 0) {
        regex.forEach(function (element, index) {
            tagObject.push({ "$regex": element });
        });
    }

    if (not_regex.length > 0) {
        not_regex.forEach(function (element, index) {
            tagObject.push({ "$regex": element });
        })
    }

    // console.log(tagObject);
    if (tagObject.length > 0) {
        query["$and"] = handleTagsSearchMongo(tagObject);
    }
    // console.log(JSON.stringify(query));
    return query;
}

function handleTagsSearchMongo(tagObject) {
    let q = []

    tagObject.forEach(function (element, index) {
        let temp = { "tags": element };
        q.push(temp);
    })

    return q;
}


function createUserQuery2(input) {
    let startDate;
    let endDate;
    let premiumStartDate;
    let premiumEndDate;
    let queryItems = input.split('&&');
    let notQuery = [];
    let wildcards = [];
    let notWildCards = [];
    let query = [];
    let mustNotQuery = [];
    let createdDateRangeQuery;
    let premiumDateRangeQuery;
    let notActiveDate;
    let activeDate;
    let lastSyncDateRangeQuery;
    let missing;

    let result = {
        query: {
            bool: {
                filter: {
                    bool: {}
                }
            }
        }
    };
    // console.log(queryItems);
    queryItems.forEach(function (element) {
        // console.log(element);
        if (element.length > 0) {
            element = element.trim();
            let key = element.split(':')[0];
            // console.log(key);
            switch (key) {
                case 'recentdays':
                    {
                        // console.log('recentdays');
                        let days = parseInt((element.split(':')[1]), 10);
                        startDate = moment().startOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'dayago':
                    {
                        // console.log('dayago');
                        let days = parseInt((element.split(':')[1]), 10);
                        startDate = moment().startOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                        endDate = moment().endOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'active':
                    {
                        // console.log('active');
                        let day_number = parseInt((element.split(":")[1]), 10);
                        if (element.indexOf('!active:') !== -1) {
                            notActiveDate = moment().startOf('day').subtract(day_number, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                        } else {
                            activeDate = moment().startOf('day').subtract(day_number, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                        }
                        break;
                    }
                case 'startdate':
                    {
                        // console.log('startdate');
                        let rawStartDate = element.split(':')[1];
                        startDate = moment(rawStartDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'enddate':
                    {
                        // console.log('enddate');
                        let rawEndDate = element.split(':')[1];
                        endDate = moment(rawEndDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'premiumstartdate':
                    {
                        // console.log('premiumstartdate');
                        let psd = element.split(':')[1];
                        premiumStartDate = moment(psd, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'premiumenddate':
                    {
                        // console.log('premiumenddate');
                        let ped = element.split(':')[1];
                        premiumEndDate = moment(ped, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'newuser':
                    {
                        // console.log('newuser');
                        let registerDate = element.split(':')[1];

                        startDate = moment(registerDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        endDate = moment(registerDate, 'DD-MM-YYYY').add(1, 'days').subtract(1, 'seconds').format('YYYY-MM-DD HH:mm:ss Z');

                        if (!lastSyncDateRangeQuery) lastSyncDateRangeQuery = {};
                        let date = startDate.split(' ');
                        let date2 = endDate.split(' ');
                        lastSyncDateRangeQuery.gte = `${date[0]} ${date[1]}`;
                        lastSyncDateRangeQuery.lte = `${date2[0]} ${date2[1]}`;
                        if (!lastSyncDateRangeQuery['time_zone']) lastSyncDateRangeQuery['time_zone'] = date[2];
                        if (!lastSyncDateRangeQuery.format) lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
                        break;
                    }

                default:
                    {
                        break;
                    }
            }

            if (element.indexOf('*') !== -1) {
                if (element.indexOf('!') === 0) {
                    // console.log('!');
                    notWildCards.push(element.slice(1, element.length));
                } else {
                    wildcards.push(element);
                }
            } else if (element.indexOf('!') === 0) {
                // console.log('!!!!!');
                notQuery.push(element.slice(1, element.length));
            }

            if (element.indexOf('limit:') === -1 && element.indexOf('skip:') === -1) {
                query.push(element);
            }
        }
    });
    // console.log('query   1111 ', query);
    query.forEach(function (element, index) {
        let a = element.split(',');
        let b = [];
        a.forEach(function (e2) {
            if (e2.length > 0) b.push(e2.trim());
        });

        if (b.length > 0) {
            query[index] = { terms: { tags: b } };
        }
    });

    if (startDate) {
        if (!createdDateRangeQuery) {
            createdDateRangeQuery = {};
        }

        let date = startDate.split(' ');

        createdDateRangeQuery.gte = `${date[0]} ${date[1]}`;

        if (!createdDateRangeQuery['time_zone']) {
            createdDateRangeQuery['time_zone'] = date[2];
        }

        if (!createdDateRangeQuery.format) {
            createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (endDate) {
        if (!createdDateRangeQuery) {
            createdDateRangeQuery = {};
        }

        let date = endDate.split(' ');

        createdDateRangeQuery.lte = `${date[0]} ${date[1]}`;

        if (!createdDateRangeQuery['time_zone']) {
            createdDateRangeQuery['time_zone'] = date[2];
        }

        if (!createdDateRangeQuery.format) {
            createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (premiumStartDate) {
        if (!premiumDateRangeQuery) {
            premiumDateRangeQuery = {};
        }

        let date = premiumStartDate.split(' ');

        premiumDateRangeQuery.gte = `${date[0]} ${date[1]}`;

        if (!premiumDateRangeQuery['time_zone']) {
            premiumDateRangeQuery['time_zone'] = date[2];
        }

        if (!premiumDateRangeQuery.format) {
            premiumDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (premiumEndDate) {
        if (!premiumDateRangeQuery) {
            premiumDateRangeQuery = {};
        }

        let date = premiumEndDate.split(' ');

        premiumDateRangeQuery.lte = `${date[0]} ${date[1]}`;

        if (!premiumDateRangeQuery['time_zone']) {
            premiumDateRangeQuery['time_zone'] = date[2];
        }

        if (!premiumDateRangeQuery.format) {
            premiumDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (activeDate) {
        if (!lastSyncDateRangeQuery) {
            lastSyncDateRangeQuery = {};
        }

        // if (!createdDateRangeQuery) {
        //  createdDateRangeQuery = {};
        // }

        let date = activeDate.split(' ');

        lastSyncDateRangeQuery.gte = `${date[0]} ${date[1]}`;
        // createdDateRangeQuery.lt = `${date[0]} ${date[1]}`;

        if (!lastSyncDateRangeQuery['time_zone']) {
            lastSyncDateRangeQuery['time_zone'] = date[2];
        }

        if (!lastSyncDateRangeQuery.format) {
            lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }

        // if (!createdDateRangeQuery['time_zone']) {
        //  createdDateRangeQuery['time_zone'] = date[2];
        // }

        // if (!createdDateRangeQuery.format) {
        //  createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        // }
    }

    if (notActiveDate) {
        if (!lastSyncDateRangeQuery) {
            lastSyncDateRangeQuery = {};
        }

        // let not_create_today = {};

        let date = notActiveDate.split(' ');

        lastSyncDateRangeQuery.lt = `${date[0]} ${date[1]}`;
        // not_create_today.gte = `${date[0]} ${date[1]}`;

        if (!lastSyncDateRangeQuery['time_zone']) {
            lastSyncDateRangeQuery['time_zone'] = date[2];
        }

        if (!lastSyncDateRangeQuery.format) {
            lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }

        // if (!not_create_today['time_zone']) {
        //  not_create_today['time_zone'] = date[2];
        // }

        // if (!not_create_today.format) {
        //  not_create_today.format = 'yyyy-MM-dd HH:mm:ss';
        // }

        // mustNotQuery.push({
        //  range: {
        //      createdDate: not_create_today
        //  }
        // });

        // if (!missing) {
        //  missing = {};
        // }

        // missing.field = 'lastSync';
    }

    if (createdDateRangeQuery) {
        query.push({
            range: {
                createdDate: createdDateRangeQuery
            }
        });
    }

    if (premiumDateRangeQuery) {
        query.push({
            range: {
                premium_at: premiumDateRangeQuery
            }
        });
    }

    if (lastSyncDateRangeQuery) {
        query.push({
            range: {
                lastSync: lastSyncDateRangeQuery
            }
        });

        if (missing) {
            query.push({
                missing: missing
            });
        }
    }

    if (wildcards.length > 0) {
        wildcards.forEach(function (element) {
            query.push({ wildcard: { tags: element } });
        });
    }

    if (notQuery.length > 0) {
        notQuery.forEach(function (element) {
            mustNotQuery.push({ terms: { tags: [element] } });
        });
    }

    if (notWildCards.length > 0) {
        notWildCards.forEach(function (element) {
            mustNotQuery.push({ wildcard: { tags: element } });
        });
    }

    if (query.length > 0) {
        if (missing) {
            result.query.bool.filter.bool.should = query;
        } else {
            result.query.bool.filter.bool.must = query;
        }
    }

    if (mustNotQuery.length > 0) {
        result.query.bool.filter.bool.must_not = mustNotQuery;
    }
    // console.log('UserQuery2 ', JSON.stringify(result));
    return result;
}



function createUserQuery(input) {
    let startDate;
    let endDate;
    let premiumStartDate;
    let premiumEndDate;
    let queryItems = input.split('&&');
    let notQuery = [];
    let wildcards = [];
    let notWildCards = [];
    let query = [];
    let mustNotQuery = [];
    let createdDateRangeQuery;
    let premiumDateRangeQuery;
    let notActiveDate;
    let activeDate;
    let lastSyncDateRangeQuery;
    let missing;

    let result = {
        query: {
            bool: {
                filter: {
                    bool: {}
                }
            }
        }
    };

    queryItems.forEach(function (element) {
        if (element.length > 0) {
            element = element.trim();
            let index = element.indexOf('recentdays:');
            // console.log(element);
            if (index !== -1) {
                let days = parseInt((element.split(':')[1]), 10);
                startDate = moment().startOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('dayago:') !== -1) {
                let days = parseInt((element.split(':')[1]), 10);
                startDate = moment().startOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                endDate = moment().endOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('active:') !== -1) {
                let day_number = parseInt((element.split(':')[1]), 10);
                if (element.indexOf('!active:') !== -1) {
                    notActiveDate = moment().startOf('day').subtract(day_number, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                } else {
                    activeDate = moment().startOf('day').subtract(day_number, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                }
            }

            // else if (element.indexOf('startdate:') !== -1) {
            //  let rawStartDate = element.split(':')[1];
            //  startDate = moment(rawStartDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            // } else if (element.indexOf('enddate:') !== -1) {
            //  let rawEndDate = element.split(':')[1];

            //  endDate = moment(rawEndDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            // } else if (element.indexOf('premiumstartdate:') !== -1) {
            //  let psd = element.split(':')[1];
            //  premiumStartDate = moment(psd, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            // } else if (element.indexOf('premiumenddate:') !== -1) {
            //  let ped = element.split(':')[1];

            //  premiumEndDate = moment(ped, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            // } 
            else if (element.indexOf('newuser:') !== -1) {
                let registerDate = element.split(':')[1];

                startDate = moment(registerDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                endDate = moment(registerDate, 'DD-MM-YYYY').add(1, 'days').subtract(1, 'seconds').format('YYYY-MM-DD HH:mm:ss Z');

                if (!lastSyncDateRangeQuery) lastSyncDateRangeQuery = {};
                let date = startDate.split(' ');
                let date2 = endDate.split(' ');
                lastSyncDateRangeQuery.gte = `${date[0]} ${date[1]}`;
                lastSyncDateRangeQuery.lte = `${date2[0]} ${date2[1]}`;
                if (!lastSyncDateRangeQuery['time_zone']) lastSyncDateRangeQuery['time_zone'] = date[2];
                if (!lastSyncDateRangeQuery.format) lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
            } else if (element.indexOf('*') !== -1) {
                if (element.indexOf('!') === 0) {
                    notWildCards.push(element.slice(1, element.length));
                } else {
                    wildcards.push(element);
                }
            } else if (element.indexOf('!') === 0) {
                notQuery.push(element.slice(1, element.length));
            } else if (element.indexOf('limit:') === -1 && element.indexOf('skip:') === -1 && element.indexOf('startdate:') === -1 && element.indexOf('enddate:') === -1 && element.indexOf('premiumstartdate:') === -1 && element.indexOf('premiumenddate:') === -1) {
                // console.log('element push ', element);
                query.push(element);
            }
        }
    });

    // console.log('query ', query);

    queryItems.forEach((element) => {
        if (element.length > 0) {
            element = element.trim();
            let key = element.split(':')[0];

            switch (key) {
                case 'startdate':
                    {

                        let rawStartDate = element.split(':')[1];
                        startDate = moment(rawStartDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');

                        break;
                    }
                case 'enddate':
                    {

                        let rawEndDate = element.split(':')[1];
                        endDate = moment(rawEndDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');

                        break;
                    }
                case 'premiumstartdate':
                    {
                        let psd = element.split(':')[1];
                        premiumStartDate = moment(psd, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                case 'premiumenddate':
                    {
                        let ped = element.split(':')[1];
                        premiumEndDate = moment(ped, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
                        break;
                    }
                default:
                    {
                        break;
                    }
            }
        }
    });

    query.forEach(function (element, index) {
        let a = element.split(',');
        let b = [];

        a.forEach(function (e2) {
            if (e2.length > 0) b.push(e2.trim());
        });

        if (b.length > 0) {
            query[index] = { terms: { tags: b } };
        }
    });

    if (startDate) {
        if (!createdDateRangeQuery) {
            createdDateRangeQuery = {};
        }

        let date = startDate.split(' ');

        createdDateRangeQuery.gte = `${date[0]} ${date[1]}`;

        if (!createdDateRangeQuery['time_zone']) {
            createdDateRangeQuery['time_zone'] = date[2];
        }

        if (!createdDateRangeQuery.format) {
            createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (endDate) {
        if (!createdDateRangeQuery) {
            createdDateRangeQuery = {};
        }

        let date = endDate.split(' ');

        createdDateRangeQuery.lte = `${date[0]} ${date[1]}`;

        if (!createdDateRangeQuery['time_zone']) {
            createdDateRangeQuery['time_zone'] = date[2];
        }

        if (!createdDateRangeQuery.format) {
            createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (premiumStartDate) {
        if (!premiumDateRangeQuery) {
            premiumDateRangeQuery = {};
        }

        let date = premiumStartDate.split(' ');

        premiumDateRangeQuery.gte = `${date[0]} ${date[1]}`;

        if (!premiumDateRangeQuery['time_zone']) {
            premiumDateRangeQuery['time_zone'] = date[2];
        }

        if (!premiumDateRangeQuery.format) {
            premiumDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (premiumEndDate) {
        if (!premiumDateRangeQuery) {
            premiumDateRangeQuery = {};
        }

        let date = premiumEndDate.split(' ');

        premiumDateRangeQuery.lte = `${date[0]} ${date[1]}`;

        if (!premiumDateRangeQuery['time_zone']) {
            premiumDateRangeQuery['time_zone'] = date[2];
        }

        if (!premiumDateRangeQuery.format) {
            premiumDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (activeDate) {
        if (!lastSyncDateRangeQuery) {
            lastSyncDateRangeQuery = {};
        }

        // if (!createdDateRangeQuery) {
        //  createdDateRangeQuery = {};
        // }

        let date = activeDate.split(' ');

        lastSyncDateRangeQuery.gte = `${date[0]} ${date[1]}`;
        // createdDateRangeQuery.lt = `${date[0]} ${date[1]}`;

        if (!lastSyncDateRangeQuery['time_zone']) {
            lastSyncDateRangeQuery['time_zone'] = date[2];
        }

        if (!lastSyncDateRangeQuery.format) {
            lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }

        // if (!createdDateRangeQuery['time_zone']) {
        //  createdDateRangeQuery['time_zone'] = date[2];
        // }

        // if (!createdDateRangeQuery.format) {
        //  createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        // }
    }

    if (notActiveDate) {
        if (!lastSyncDateRangeQuery) {
            lastSyncDateRangeQuery = {};
        }

        // let not_create_today = {};

        let date = notActiveDate.split(' ');

        lastSyncDateRangeQuery.lt = `${date[0]} ${date[1]}`;
        // not_create_today.gte = `${date[0]} ${date[1]}`;

        if (!lastSyncDateRangeQuery['time_zone']) {
            lastSyncDateRangeQuery['time_zone'] = date[2];
        }

        if (!lastSyncDateRangeQuery.format) {
            lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }

        // if (!not_create_today['time_zone']) {
        //  not_create_today['time_zone'] = date[2];
        // }

        // if (!not_create_today.format) {
        //  not_create_today.format = 'yyyy-MM-dd HH:mm:ss';
        // }

        // mustNotQuery.push({
        //  range: {
        //      createdDate: not_create_today
        //  }
        // });

        // if (!missing) {
        //  missing = {};
        // }

        // missing.field = 'lastSync';
    }

    if (createdDateRangeQuery) {
        query.push({
            range: {
                createdDate: createdDateRangeQuery
            }
        });
    }

    if (premiumDateRangeQuery) {
        query.push({
            range: {
                premium_at: premiumDateRangeQuery
            }
        });
    }

    if (lastSyncDateRangeQuery) {
        query.push({
            range: {
                lastSync: lastSyncDateRangeQuery
            }
        });

        if (missing) {
            query.push({
                missing: missing
            });
        }
    }

    if (wildcards.length > 0) {
        wildcards.forEach(function (element) {
            query.push({ wildcard: { tags: element } });
        });
    }



    if (notQuery.length > 0) {
        notQuery.forEach(function (element) {
            mustNotQuery.push({ terms: { tags: [element] } });
        });
    }

    if (notWildCards.length > 0) {
        notWildCards.forEach(function (element) {
            mustNotQuery.push({ wildcard: { tags: element } });
        });
    }

    if (query.length > 0) {
        if (missing) {
            result.query.bool.filter.bool.should = query;
        } else {
            result.query.bool.filter.bool.must = query;
        }
    }

    if (mustNotQuery.length > 0) {
        result.query.bool.filter.bool.must_not = mustNotQuery;
    }
    // console.log(JSON.stringify(result));
    return result;
}

function createDeviceQuery(input) {
    let query = [];
    let startDate;
    let appId = [];
    let notAppId = [];
    let queryItems = input.split('&&');

    queryItems.forEach(function (element) {
        if (element.length > 0) {
            element = element.trim();

            if (element.indexOf('recentdays:') != -1) {
                let days = parseInt((element.split(':')[1]), 10);

                startDate = moment().startOf('day').subtract(days, 'days').format();
            } else if (element.indexOf('limit:') === -1 && element.indexOf('skip:') === -1) {
                query.push(element);
            }
        }
    });

    query.forEach(function (element, index) {
        let a = element.split(',');
        let b = [];
        a.forEach(function (e2) {
            if (e2.length > 0) {
                e2 = e2.trim();

                if (e2.indexOf('platform:') === 0) {
                    let pl = e2.split(':')[1];

                    switch (pl) {
                        case 'android':
                            appId.push(1);
                            break;
                        case 'ios':
                            appId.push(2);
                            appId.push(3);
                            break;
                        case 'windowsphone':
                            appId.push(4);
                            break;
                        case 'windows':
                            appId.push(5);
                            break;
                        case 'mac':
                            appId.push(6);
                            break;
                        case 'web':
                            appId.push(7);
                            break;
                        default:
                            break;
                    }
                } else if (e2.indexOf('platform:') === 1) {
                    let pl = e2.split(':')[1];

                    switch (pl) {
                        case 'android':
                            notAppId.push(1);
                            break;
                        case 'ios':
                            notAppId.push(2);
                            notAppId.push(3);
                            break;
                        case 'iosfree':
                            notAppId.push(2);
                            break;
                        case 'iosplus':
                            notAppId.push(3);
                            break;
                        case 'windowsphone':
                            notAppId.push(4);
                            break;
                        case 'windows':
                            notAppId.push(5);
                            break;
                        case 'mac':
                            notAppId.push(6);
                            break;
                        case 'web':
                            notAppId.push(7);
                            break;
                        default:
                            break;
                    }
                } else {
                    b.push(e2);
                }
            }
        });

        if (b.length > 0) {
            query[index] = { terms: { tags: b } };
        }
    });

    query.push({
        term: { isDelete: false }
    });

    if (appId.length > 0) query.push({
        terms: { appId: appId }
    });

    if (startDate) query.push({
        range: {
            createdDate: {
                gte: startDate
            }
        }
    });

    let result = {
        filtered: {
            filter: {
                bool: {
                    must: query
                }
            }
        }
    };

    if (notAppId.length > 0) {
        if (!result.filtered.filter.bool.must_not) {
            result.filtered.filter.bool.must_not = [];
        }

        result.filtered.filter.bool.must_not.push({ terms: { appId: notAppId } });
    }

    return result;
}

function skipLimitSearchQueryDetect(input, options) {
    let tempQuery = input.split('&&');

    tempQuery.forEach(function (command) {
        command = command.trim();

        if (command.indexOf('limit:') != -1) {
            options.size = parseInt(command.split(':')[1]);
        }

        if (command.indexOf('skip:') != -1) {
            options.from = parseInt(command.split(':')[1]);
        }
    });

    return options;
}

function encryptPassword(password, salt) {
    if (!password) return '';

    return crypto.createHash('md5').update(password + salt).digest("hex");
}

function authenticateString(encoded_string, string, salt) {
    let hash = crypto.createHash('md5').update(string + salt).digest("hex");

    return hash === encoded_string;
}

function tagHandle(tag) {
    let splitedTag = tag.split('&');
    let output;

    function handleSinglePiece(piece) {
        piece = piece.toLowerCase();

        if (piece.indexOf('utm_source') != -1) {
            piece = piece.split('%20').join('_');
            piece = piece.split('-').join('_');
            let tmp = piece.split('=');

            if (tmp[1] != '(not_set)') {
                output = tmp[1];
            }
        }
    }

    if (splitedTag.length === 1) {
        splitedTag[0] = splitedTag[0].toLowerCase();
        splitedTag[0] = splitedTag[0].split(' ').join('_');
        splitedTag[0] = splitedTag[0].split('-').join('_');
        splitedTag[0] = splitedTag[0].split('%20').join('_');

        if (splitedTag[0].indexOf('utm_') === -1) {
            return splitedTag[0];
        }

        if (splitedTag[0].indexOf('utm_source') != -1) {
            let tmp = splitedTag[0].split('=');

            if (tmp[1] != '(not_set)') {
                output = tmp[1];
            }
        }

        return output;
    } else {
        splitedTag.forEach(handleSinglePiece);
        return output;
    }
}

function convertGeneralTimeToCronTime(string_time) {
    //string_time format DD/MM/YYYY hh:mm
    let second = 0;
    let minute;
    let hour;
    let dayOfMonth;
    let month;
    let dayOfWeek = '*';

    let tmp = string_time.split(' ');
    let date = tmp[0];
    let time = tmp[1];

    date = date.split('/');
    time = time.split(':');

    minute = parseInt(time[1]);
    hour = parseInt(time[0]);
    dayOfMonth = parseInt(date[0]);
    month = parseInt(date[1]) - 1;

    return `${second} ${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

function base64Encode(data) {
    return new Buffer(data).toString('base64');
}

function base64Decode(data) {
    return new Buffer(data, 'base64').toString('ascii');
}

function checkPermissisonAccessPage(permission) {
    if (permission != 'Admin' && permission != 'Dev') {
        return false;
    }

    return true;
}

exports.randomString = randomString;
exports.randomPassword = randomPassword;
exports.generateUUID = generateUUID;
exports.uid = uid;
exports.parseDateFromDatabaseFormat = parseDateFromDatabaseFormat;
exports.parseDateFromDatabaseFormatToTimestamp = parseDateFromDatabaseFormatToTimestamp;
exports.parseDate = parseDate;
exports.dateFormat = dateFormat;
exports.currentTimestamp = currentTimestamp;
exports.getCookie = getCookie;
exports.msgSuccess = msgSuccess;
exports.msgError = msgError;
exports.convertDate = convertDate;
exports.textToSlug = textToSlug;
exports.isEmail = isEmail;
exports.generateLink = generateLink;
exports.transactionPermalink = transactionPermalink;
exports.parseIcon = parseIcon;
exports.detectDevice = detectDevice;
exports.generateAmountFormatter = generateAmountFormatter;
exports.amountFormat = amountFormat;
exports.parseCampaign = parseCampaign;
exports.convertQueryToBody = convertQueryToBody;
exports.makeAccountShareLink = makeAccountShareLink;
exports.detectLocationByIp = detectLocationByIp;
exports.extendObject = extendObject;
exports.cacheTimestamp = cacheTimestamp;
exports.finsifyWalletStopCrawl = finsifyWalletStopCrawl;
exports.realIP = realIP;
exports.createUserQuery = createUserQuery;
exports.createDeviceQuery = createDeviceQuery;
exports.skipLimitSearchQueryDetect = skipLimitSearchQueryDetect;
exports.encryptPassword = encryptPassword;
exports.authenticateString = authenticateString;
exports.tagHandle = tagHandle;
exports.convertGeneralTimeToCronTime = convertGeneralTimeToCronTime;
exports.base64Encode = base64Encode;
exports.base64Decode = base64Decode;
exports.createUserQueryMongo = createUserQueryMongo;
exports.createUserQuery2 = createUserQuery2;
exports.checkPermissisonAccessPage = checkPermissisonAccessPage;
exports.createQueryMongoDB = createQueryMongoDB;