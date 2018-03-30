let mongoose = require('mongoose');
let moment = require('moment');

let UserModel = mongoose.model('User');
const mongoQueries = [
    'active',
    'recentdays',
    'startdate',
    'enddate',
    'premiumstartdate',
    'premiumenddate'
];

function search(tags, skip, limit) {
    for (let i = 0; i < mongoQueries.length; i++) {
        if (tags.indexOf(mongoQueries[i]) > -1) {
            return mongoFind(tags, skip, limit);
        }
    }
    
    return elasticFind(tags, skip, limit);
}

function mongoFind(tags, skip, limit) {
    let query = createUserMongoQuery(tags);
    let querySkipLimit = detectSkipLimit(tags);
    let querySkip = querySkipLimit.skip;
    let queryLimit = querySkipLimit.limit;
    
    // console.log(query);
    
    return new Promise((resolve, reject) => {
        UserModel.count(query, (err, total) => {
            if (err) return reject(err);

            UserModel.find(query)
                .sort({createdDate: -1})
                .skip(skip || querySkip || 0)
                .limit(limit || queryLimit || 0)
                .exec((err, data) => {
                    if (err) return reject(err);

                    return resolve({
                        total,
                        data
                    });
                });
        });
    });
}

function elasticFind(tags, skip, limit) {
    let options = {
        hydrate: true,
        sort: {
            createdDate: {order: "desc"}
        }
    };

    options = skipLimitSearchQueryDetect(tags, options);
    options.size = limit;
    if (options.from) {
        options.from += skip;
    } else {
        options.from = skip;
    }

    let query = createUserElasticSearchQuery(tags);

    return new Promise((resolve, reject) => {
        UserModel.search(query, options, (err, result) => {
            if (err) return reject(err);

            return resolve({
                total: result.hits.total,
                data: result.hits.hits
            });
        });
    });
}

function createUserMongoQuery(tags) {
    let queryItems = tags.split('&&');
    let query = {};

    let today = moment().startOf('day');

    queryItems.forEach(element => {
        if (element.length > 0) {
            element = element.trim();

            if (element.indexOf('active:') > -1) {
                let numberOfDay = parseInt(element.split(':')[1]);
                let checkPointDate = today.subtract(numberOfDay, 'days');

                if (element.indexOf('!') > -1) {
                    query.lastSync = {
                        $lt: checkPointDate
                    }
                } else {
                    query.lastSync = {
                        $gte: checkPointDate
                    }
                }
            } else if (element.indexOf('createrecentdays:') > -1) {
                let numberOfDay = parseInt(element.split(':')[1]);
                let checkPointDate = today.subtract(numberOfDay, 'days');
                
                if (!query.createdDate) query.createdDate = {};
                query.createdDate['$gte'] = checkPointDate;
            } else if (element.indexOf('premiumstartdate') > -1) {
                let checkPointDate = moment(element.split(':')[1], 'DD-MM-YYYY');

                if (!query.premium_at) query.premium_at = {};
                query.premium_at['$gte'] = checkPointDate;
            } else if (element.indexOf('premiumenddate') > -1) {
                let checkPointDate = moment(element.split(':')[1], 'DD-MM-YYYY');

                if (!query.premium_at) query.premium_at = {};
                query.premium_at['$lte'] = checkPointDate;
            } else if (element.indexOf('startdate') > -1) {
                let checkPointDate = moment(element.split(':')[1], 'DD-MM-YYYY');

                if (!query.createdDate) query.createdDate = {};
                query.createdDate['$gte'] = checkPointDate;
            } else if (element.indexOf('enddate') > -1) {
                let checkPointDate = moment(element.split(':')[1], 'DD-MM-YYYY');

                if (!query.createdDate) query.createdDate = {};
                query.createdDate['$lte'] = checkPointDate;
            }
        }
    });

    return query;
}

function detectSkipLimit(tags) {
    let tempQuery = tags.split('&&');
    let output = {};

    tempQuery.forEach(element => {
        element = element.trim();

        if (element.indexOf('limit:') != -1) {
            output.limit = parseInt(element.split(':')[1]);
        }

        if (element.indexOf('skip:') != -1) {
            element.skip = parseInt(element.split(':')[1]);
        }
    });

    return output;
}

function skipLimitSearchQueryDetect(input, options) {
    let tempQuery = input.split('&&');

    tempQuery.forEach(function(command){
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

function createUserElasticSearchQuery(input){
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
        filtered: {
            filter: {
                bool: {

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

                startDate = moment().startOf('day').subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('active:') != -1) {
                let day_number = parseInt((element.split(':')[1]), 10);
                if (element.indexOf('!active:') != -1) {
                    notActiveDate = moment().startOf('day').subtract(day_number, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                } else {
                    activeDate = moment().startOf('day').subtract(day_number, 'days').format('YYYY-MM-DD HH:mm:ss Z');
                }
            } else if (element.indexOf('startdate:') != -1) {
                let rawStartDate = element.split(':')[1];

                startDate = moment(rawStartDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('enddate:') != -1) {
                let rawEndDate = element.split(':')[1];

                endDate = moment(rawEndDate, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('premiumstartdate:') != -1) {
                let psd = element.split(':')[1];

                premiumStartDate = moment(psd, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('premiumenddate:') != -1) {
                let ped = element.split(':')[1];

                premiumEndDate = moment(ped, 'DD-MM-YYYY').format('YYYY-MM-DD HH:mm:ss Z');
            } else if (element.indexOf('*') != -1) {
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

        let date = endDate.split(' ');

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

        if (!createdDateRangeQuery) {
            createdDateRangeQuery = {};
        }

        let date = activeDate.split(' ');

        lastSyncDateRangeQuery.gte = `${date[0]} ${date[1]}`;
        createdDateRangeQuery.lt = `${date[0]} ${date[1]}`;

        if (!lastSyncDateRangeQuery['time_zone']) {
            lastSyncDateRangeQuery['time_zone'] = date[2];
        }

        if (!lastSyncDateRangeQuery.format) {
            lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }

        if (!createdDateRangeQuery['time_zone']) {
            createdDateRangeQuery['time_zone'] = date[2];
        }

        if (!createdDateRangeQuery.format) {
            createdDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }
    }

    if (notActiveDate) {
        if (!lastSyncDateRangeQuery) {
            lastSyncDateRangeQuery = {};
        }

        let not_create_today = {};

        let date = notActiveDate.split(' ');

        lastSyncDateRangeQuery.lt = `${date[0]} ${date[1]}`;
        not_create_today.gte = `${date[0]} ${date[1]}`;

        if (!lastSyncDateRangeQuery['time_zone']) {
            lastSyncDateRangeQuery['time_zone'] = date[2];
        }

        if (!lastSyncDateRangeQuery.format) {
            lastSyncDateRangeQuery.format = 'yyyy-MM-dd HH:mm:ss';
        }

        if (!not_create_today['time_zone']) {
            not_create_today['time_zone'] = date[2];
        }

        if (!not_create_today.format) {
            not_create_today.format = 'yyyy-MM-dd HH:mm:ss';
        }

        mustNotQuery.push({
            range: {
                createdDate: not_create_today
            }
        });

        if (!missing) {
            missing = {};
        }

        missing.field = 'lastSync';
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
            mustNotQuery.push({wildcard: {tags: element}});
        });
    }

    if (query.length > 0) {
        if (missing) {
            result.filtered.filter.bool.should = query;
        } else {
            result.filtered.filter.bool.must = query;
        }
    }

    if (mustNotQuery.length > 0) {
        result.filtered.filter.bool.must_not = mustNotQuery;
    }

    return result;
}

module.exports = {
    createUserElasticSearchQuery,
    skipLimitSearchQueryDetect,
    search
};
