'use strict';

const env = process.env.NODE_ENV;
const config = require('../../config/config')[env];

const uuid = require('node-uuid');
const crypto = require('crypto');
const fs = require('fs');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function replaceVI(string){
    let unicode = [
        {charKey: 'a', charRegex: /á|à|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ/g},
        {charKey: 'd', charRegex: /đ/g},
        {charKey: 'e', charRegex: /é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/g},
        {charKey: 'i', charRegex: /í|ì|ỉ|ĩ|ị/g},
        {charKey: 'o', charRegex: /ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/g},
        {charKey: 'u', charRegex: /ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/g},
        {charKey: 'y', charRegex: /ý|ỳ|ỷ|ỹ|ỵ/g},
        {charKey: 'A', charRegex: /Á|À|Ả|Ã|Ạ|Ă|Ắ|Ặ|Ằ|Ẳ|Ẵ|Â|Ấ|Ầ|Ẩ|Ẫ|Ậ/g},
        {charKey: 'D', charRegex: /Đ/g},
        {charKey: 'E', charRegex: /É|È|Ẻ|Ẽ|Ẹ|Ê|Ế|Ề|Ể|Ễ|Ệ/g},
        {charKey: 'I', charRegex: /Í|Ì|Ỉ|Ĩ|Ị/g},
        {charKey: 'O', charRegex: /Ó|Ò|Ỏ|Õ|Ọ|Ô|Ố|Ồ|Ổ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ở|Ỡ|Ợ/g},
        {charKey: 'U', charRegex: /Ú|Ù|Ủ|Ũ|Ụ|Ư|Ứ|Ừ|Ử|Ữ|Ự/g},
        {charKey: 'Y', charRegex: /Ý|Ỳ|Ỷ|Ỹ|Ỵ/g}
    ];

    unicode.forEach(function(uni, index){
        let regex = uni.charRegex;
        let nonUnicode = uni.charKey;
        string = string.replace(regex, nonUnicode);
    });
    return string;
}

let uid = function(len) {
    let buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length;

    for (let i = 0; i < len; ++i) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
};

let generateUUID = function(){
    return uuid.v4().replace(/-/gi, "");
};

let makeAccountShareLink = function(share){
    return 'https://web.moneylover.me/account/invite/' + share.shareCode;
};

let textToSlug = function(str){
    str = str.replace(/\?/g, '');
    str = str.trim();
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
    str = replaceVI(str);

    // remove accents, swap ñ for n, etc
    let from = "àáäạảãâầấậẫẩăắằặẵđèéẹẻẽêếềệễểìíỉĩïîòóöọỏõôốồộỗổơớờợỡủỳỷỹỵýùúüûụũưứừựửữñç·/_,:;";
    let to   = "aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiiooooooooooooooooouyyyyyuuuuuuuuuuuunc------";
    for (let i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    return str;
};

let encryptPassword = function(password, salt) {
    if (!password) return '';

    return crypto.createHash('md5').update(password + salt).digest("hex");
};

let authenticateString = function(encoded_string, string, salt){
    let hash = crypto.createHash('md5').update(string + salt).digest("hex");

    return hash === encoded_string;
};

let cacheTimestamp = function(key, timestamp){
    fs.readFile(config.whatsNewCache, {flag: 'a+'}, function(err, oldCache){
        if (err) console.log(err);
        let data = {};

        oldCache = oldCache.toString();
        if (oldCache) {
            try {
                data = JSON.parse(oldCache);
            } catch(e) {
                // console.log(e);
                // console.log('parse error');
            }
        }

        data[key] = timestamp;

        fs.writeFileSync(config.whatsNewCache, JSON.stringify(data));
    });
};

let realIP = function(ip){
    return ip.split(',')[0];
};

let createUserQuery = function(input){
    let startDate;
    let endDate;
    let queryItems = input.split('&&');
    let notQuery = [];
    let wildcards = [];
    let notWildCards = [];
    let query = [];
    let mustNotQuery = [];
    let createdDateRangeQuery = {};
    let notActiveDate;
    let activeDate;
    let lastSyncDateRangeQuery = {};

    let result = {
        filtered: {
            filter: {
                bool: {
                    must: query,
                    must_not: mustNotQuery
                }
            }
        }
    };

    queryItems.forEach(function(element){
        if (element.length > 0) {
            element = element.trim();

            let index = element.indexOf('recentdays:');

            if (index != -1) {
                let days = parseInt((element.split(':')[1]), 10);

                startDate = moment().startOf('day').subtract(days, 'days').format();
            } else if (element.indexOf('active:') != -1) {
                let day_number = parseInt((element.split(':')[1]), 10);
                if (element.indexOf('!active:') != -1) {
                    notActiveDate = moment().startOf('day').subtract(day_number, 'days').format();
                } else {
                    activeDate = moment().startOf('day').subtract(day_number, 'days').format();
                }
            } else if (element.indexOf('startdate:') != -1) {
                let rawStartDate = element.split(':')[1];

                startDate = moment(rawStartDate, 'DD-MM-YYYY').format();
            } else if (element.indexOf('enddate:') != -1) {
                let rawEndDate = element.split(':')[1];

                endDate = moment(rawEndDate, 'DD-MM-YYYY').format();
            } else if (element.indexOf(':*') != -1) {
                if (element.indexOf('!') === 0) {
                    notWildCards.push(element.slice(1, element.length));
                } else {
                    wildcards.push(element);
                }
            } else if (element.indexOf('!') === 0){
                notQuery.push(element.slice(1, element.length));
            } else if (element.indexOf('limit:') === -1 && element.indexOf('skip:') === -1) {
                query.push(element);
            }
        }
    });

    query.forEach(function(element, index){
        let a = element.split(',');
        let b = [];
        a.forEach(function(e2){
            if (e2.length > 0) b.push(e2.trim());
        });

        if (b.length > 0) {
            query[index] = {terms: {tags: b}};
        }
    });

    if (startDate) {
        createdDateRangeQuery.gte = startDate;
    }

    if (endDate) {
        createdDateRangeQuery.lte = endDate;
    }

    if (activeDate) {
        lastSyncDateRangeQuery.gte = activeDate;
    }

    if (notActiveDate) {
        lastSyncDateRangeQuery.lte = notActiveDate;
    }

    if (createdDateRangeQuery !== {}) {
        query.push({
            range: {
                createdDate: createdDateRangeQuery
            }
        });
    }

    if (lastSyncDateRangeQuery !== {}) {
        query.push({
            range: {
                lastSync: lastSyncDateRangeQuery
            }
        });
    }

    if (wildcards.length > 0) {
        wildcards.forEach(function(element){
            query.push({wildcard: {tags: element}});
        });
    }

    if (notQuery.length > 0) {
        notQuery.forEach(function(element){
            mustNotQuery.push({terms: {tags: [element]}});
        });
    }

    if (notWildCards.length > 0) {
        notWildCards.forEach(function(element){
            mustNotQuery.push({wildcard: {tags: element}})
        });
    }

    return result;
};

exports.generateUUID = generateUUID;
exports.uid = uid;
exports.makeAccountShareLink = makeAccountShareLink;
exports.textToSlug = textToSlug;
exports.encryptPassword = encryptPassword;
exports.authenticateString = authenticateString;
exports.cacheTimestamp = cacheTimestamp;
exports.realIP = realIP;
exports.createUserQuery = createUserQuery;