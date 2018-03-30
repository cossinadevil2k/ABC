'use strict';

let mongoose = require('mongoose');
let ProviderScheme = mongoose.model('Provider');
let async = require('async');
let env = process.env.NODE_ENV;
let config = require('../../config/config')[env];
let path = require('path');
let fs = require('fs');
let _env = '_' + env;
let providerExportPath = config.root + '/app/public/data/rw-provider/';
let PROVIDER_CACHE = config.root + '/app/public/data/rw-provider/provider_country_list' + _env + '.json';
let COUNTRY = require('../../config/countries_provider_customize');
let PROVIDER_COUNTRY_CACHE = config.root + '/app/public/data/rw-provider/provider_country_cache' + _env + '.json';

const file_extension_type = require('../../config/file_extension_type').type;

/*******************/

function arrayDiff(a1, a2) {
    let o1 = {};
    let o2 = {};
    let diff = [];
    let i;
    let len;
    let k;

    for (i = 0, len = a1.length; i < len; i++) { o1[a1[i]] = true; }
    for (i = 0, len = a2.length; i < len; i++) { o2[a2[i]] = true; }
    for (k in o1) { if (!(k in o2)) { diff.push(k); } }
    for (k in o2) { if (!(k in o1)) { diff.push(k); } }

    return diff;
}

function isKeyNameExists(keyName, country, categories) {
    let result = false;

    categories.forEach(category => {
        if (keyName === category.key_name && country === category.country) {
            result = true;
        }
    });

    return result;
}

function providerCacheConverter(provider) {
    return {
        id: provider.realId,
        name: provider.name,
        code: provider.code,
        icon: provider.icon,
        primary_color: provider.primary_color,
        type: provider.type,
        country_code: provider.country_code,
        has_balance: provider.hasBalance || false,
        meta_search: provider.meta_search,
        is_free: provider.is_free || false,
        is_debug: provider.is_debug || false
    };
}

/*******************/

let checkProviderExitsOrCreate = function (provider_name, country_name, country_code, callback) {
    let dataResult = null;

    fs.open(PROVIDER_CACHE, 'a', function (error, data) {
        if (error) {
            return callback(error);
        }

        fs.readFile(PROVIDER_CACHE, 'utf8', function (err, data) {
            if (error) {
                return callback(error);
            }

            let dataObject = null;

            if (data) {
                dataObject = JSON.parse(data.toString());
            }

            let code = null;

            if (dataObject instanceof Array) {
                dataObject.forEach(object => {
                    if (object.file === provider_name) {
                        // provider country code exits
                        code = -2;
                    }
                });
            } else {
                dataObject = [];
            }

            if (code !== -2) {
                let provider_object = {
                    file: provider_name,
                    flag: '',
                    code: country_code,
                    national: country_name,
                    categories: []
                };

                if (provider_name === 'provider') {
                    provider_object.code = '';
                }

                dataObject.push(provider_object);

                fs.writeFile(PROVIDER_CACHE, JSON.stringify(dataObject), 'utf8', function (error, data) {
                    if (error) {
                        code = error;
                    } else {
                        code = null;
                        dataResult = data;
                    }
                });
            }

            if (code) {
                return callback(code);
            }

            callback(null, dataResult);
        });
    });
};

let getCodeByCountry = function (country_name, callback) {
    let code = null;

    COUNTRY.forEach(object => {
        if (object.name.toLowerCase() === country_name.toLowerCase()) {
            code = object.code2l;
        }
    });

    return callback(null, code);
};

let getCacheList = function (req, res) {
    fs.open(PROVIDER_CACHE, 'a', (err) => {
        if (err) {
            return res.json({
                status: 0,
                message: err
            });
        }

        fs.readFile(PROVIDER_CACHE, 'utf8', function (error, data) {
            if (error) {
                return res.json({
                    status: 0,
                    message: error
                });
            }

            let dataObject = null;

            if (data) {
                dataObject = JSON.parse(data.toString());
            }

            // sort the all first
            if (dataObject && dataObject instanceof Array) {
                let all = null;
                dataObject.forEach(item => {
                    if (item.national === 'All') {
                        let index = dataObject.indexOf(item);
                        all = item;
                        dataObject.splice(index, 1);
                    }
                });

                if (all) {
                    dataObject.unshift(all);
                }
            }

            res.json({
                status: 1,
                data: dataObject
            });
        });
    });
};

let appProviderCacheCreate = function (req, res) {
    if (!req.body.country_code || req.body.country_code === 'all' || !req.body.country_name) {
        return res.json({
            status: 0,
            message: 'input empty'
        });
    }

    let provider_country = 'provider_cache_' + env + '_' + req.body.country_code;
    let country_name = req.body.country_name;

    checkProviderExitsOrCreate(provider_country, country_name, req.body.country_code, function (error, result) {
        if (error) {
            let status = 0;
            let message = error;
            if (error === -2) {
                status = -2;
                message = 'provider country was exist';
            }

            res.json({
                status: status,
                message: message
            });
        } else {
            res.json({
                status: 1,
                message: result
            });
        }
    });
};

let appProviderCreate = function (req, res) {
    let data = req.body;
    let valid = false;
    let dataWriten = null;
    if (!data.key_name || !data.country || !data.provider_list) {
        return res.json({
            status: 0,
            message: 'input is empty'
        });
    }

    async.series({
        checkVaild: function (callback) {
            if (!data.key_name) {
                return callback();
            }

            fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
                if (error) {
                    return callback(error);
                }

                if (result) {
                    let temp = JSON.parse(result);

                    temp.forEach(object => {
                        if (object.key_name === data.key_name && object.country === data.country) {
                            valid = true;
                            let index = temp.indexOf(object);
                            let _obj = {};
                            _obj.file = object.file;
                            _obj.country = object.country;
                            _obj.category = object.category;
                            _obj.provider_list = [];
                            _obj.key_name = data.key_name;
                            _obj.name = object.name;

                            // check providerId duplicate

                            data.provider_list.forEach(providerId => {
                                if (_obj.provider_list.indexOf(parseInt(providerId)) == -1) {
                                    _obj.provider_list.push(parseInt(providerId));
                                }
                            });

                            if (index !== -1) {
                                // remove old data
                                temp.splice(index, 1);
                                // add new item for this position
                                temp.splice(index, 0, _obj);
                            }

                            dataWriten = temp;
                        }
                    });
                }

                callback();
            });
        },
        rewriteFileCache: function (callback) {
            if (!dataWriten) {
                return callback();
            }

            fs.writeFile(PROVIDER_COUNTRY_CACHE, JSON.stringify(dataWriten), 'utf8', function (error, result) {
                if (error) {
                    return callback(error);
                }

                callback();
            });
        }
    }, function (error, result) {
        if (!error) {
            return res.json({
                status: 1,
                message: 'create provider successfully'
            });
        }

        let status = error,
            message = '';

        if (error === 0) {
            status = 0;
            message = 'param empty';
        } else {
            status = error;
            message = error;
        }

        res.json({
            status: status,
            message: message
        });
    });
};

function sortItem(arrayPositionSort, arraySource) {
    let sortResult = [];

    return new Promise(function (resolve, reject) {
        while (arrayPositionSort.length > 0) {

            let realId = arrayPositionSort[0];

            for (var key in arraySource) {
                if (parseInt(arraySource[key].realId) === parseInt(realId)) {
                    sortResult.push(arraySource[key]);
                }
            }

            arrayPositionSort.shift();
        }
        resolve(sortResult);
    });
}

let appProviderBrowse = function (req, res) {
    let data = req.query;
    let provider_model_list = null;
    let provider_cache = null;
    let provider_list_cache = null;
    let providerCache = [];

    if (!data.page || !data.key_name || !data.country) {
        return res.json({
            status: 0,
            message: 'input is empty'
        });
    };

    let options = {
        disabled: false
    }

    if (data.skip) {
        options.skip = parseInt(data.skip);
    }

    if (data.limit) {
        options.limit = parseInt(data.limit);
    }
    else {
        options.limit = 20;
    }

    if (data.type) {
        if (data.type.toLowerCase() === 'crypto' || data.type.toLowerCase() === 'payment') {
            options.type = data.type.toLowerCase();
        }
    }

    if (!options.type && data.type) {
        options["$or"] = [
            {
                type: {
                    "$nin": file_extension_type
                }
            }
        ]
    }

    async.series({
        countProviderModel: function (callback) {
            ProviderScheme.getAll({}, function (error, result) {
                if (error) {
                    return callback(error);
                }
                return callback(null, result.length);
            });
        },
        getProviderModel: function (callback) {
            ProviderScheme.getAll(options, function (error, result) {
                if (error) {
                    return callback(error);
                }

                if (result.length > 0) {
                    let temp_array = [];

                    result.forEach(item => {
                        let temp = item.toObject();
                        temp.checked = false;
                        temp_array.push(temp);
                    });
                    provider_model_list = temp_array;
                }
                // console.log('provider_model_list ',provider_model_list);
                return callback();
            });
        },
        getProviderCache: function (callback) {
            fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
                if (error) {
                    return callback(error);
                }

                if (result) {
                    let temp = JSON.parse(result);
                    let provider_cache_temp = [];

                    temp.forEach(object => {
                        if (object.country === data.country && object.key_name === data.key_name) {
                            provider_cache_temp.push(object);
                        }
                    });
                    provider_cache = provider_cache_temp;
                }
                // console.log(provider_cache[0].provider_list);
                return callback(null, provider_cache);
            });
        },
        findByRealId: function (callback) {
            if (provider_cache.length > 0) {
                providerCache = provider_cache[0].provider_list;
                ProviderScheme.findByRealId({
                    realId: providerCache
                }, function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        // console.log(result);
                        return callback(null, result);
                    }
                });
            } else {
                return callback(null, null);
            }
        },
        dataElse: function (callback) {
            if (provider_model_list.length > 0) {
                options.realId = { $nin: providerCache };
                ProviderScheme.findElse(options, function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        return callback(null, result);
                    }
                });
            } else {
                return callback('can not get provider data from data else', null);
            }
        }
    }, function (error, result) {
        if (error) {
            return res.json({
                status: -1,
                message: error
            });
        }
        let providerChecked = null;
        let limit = options.limit;
        sortItem(providerCache, result.findByRealId).then(function (data) {
            providerChecked = data;

            let providerElse = result.dataElse;

            let totalItems = providerChecked.length;

            let totalItemElse = result.countProviderModel - totalItems;
            let totalPage = Math.ceil(totalItems / limit);
            let totalPageElse = Math.ceil(totalItemElse / limit);

            let page = parseInt(req.query.page);

            res.json({
                status: 1,
                data: providerChecked,
                dataElse: {
                    data: providerElse,
                    pre_page: page == 1 ? null : page - 1,
                    next_page: page < totalPageElse ? page + 1 : null
                }
                ,
                pre_page: page == 1 ? null : page - 1,
                next_page: page < totalPage ? page + 1 : null
            });
        });

    });
};


function sortProviderArray(providerArray) {
    let newArraySortedByName = [];

    providerArray.sort(function (a, b) {
        var textA = a.name.toUpperCase();
        var textB = b.name.toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });

    newArraySortedByName = providerArray;

    return newArraySortedByName;
}

let appProviderCountryBuild = function (req, res) {
    let fileContent = null;
    let dataContent = null;
    let categories = [];
    let key_name_array = [];
    let ca = [];
    let country_list = [];
    let dataExtensionContent = null;
    let extension_file_list = [];

    async.series({
        readFileCache,
        dataOld,
        readAllCountryFile,
        buildDiff,
        buildFileExtension
    }, function (error, result) {
        if (error) {
            let status = error,
                message = error;
            if (error == -2) {
                status = -2;
                message = 'build error';
            }

            res.json({
                status: status,
                message: message
            });
        } else {

            res.json({
                status: 1,
                message: 'build successfully'
            });
        }
    });

    function readFileCache(callback) {
        fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
            if (error) {
                return callback(error);
            }

            if (result) {
                fileContent = JSON.parse(result);
            }
            return callback();
        });
    }

    function dataOld(callback) {
        ProviderScheme.find({ disabled: false }, function (error, result) {
            if (error) {
                return callback(error);
            }

            if (result.length > 0) {
                let data = [];

                result.forEach(provider => {
                    data.push(providerCacheConverter(provider));
                });

                dataContent = sortProviderArray(data);
            }

            ProviderScheme.find({
                disabled: false,
                type: {
                    "$in": file_extension_type
                }
            }, function (error, extensions) {
                if (error) return callback(error);

                if (extensions.length > 0) {
                    let data = [];

                    extensions.forEach(provider => {
                        data.push(providerCacheConverter(provider));
                    });

                    dataExtensionContent = sortProviderArray(data);
                }
            })

            return callback();
        });
    }

    function readAllCountryFile(callback) {
        fs.readFile(PROVIDER_CACHE, 'utf8', function (error, result) {
            if (error) {
                return callback(error);
            }

            if (result) {
                result = JSON.parse(result);
                result.forEach(country_file => {
                    if (file_extension_type.indexOf(country_file.code) != -1) {
                        extension_file_list.push(country_file.file);
                    } else {
                        country_list.push(country_file.file);
                    }
                });
            }

            return callback();
        });
    }

    function buildDiff(callback) {
        let provider_file_diff = arrayDiff(key_name_array, country_list);

        async.eachSeries(provider_file_diff, (fileName, cb) => {
            let file_name = providerExportPath + fileName + '.json';
            let buildData = {
                status: true,
                last_update: new Date().valueOf(),
                data: dataContent,
                categories: []
            };

            fileContent.forEach(categoryInfo => {
                if (categoryInfo.file === fileName) {

                    buildData.categories.push({
                        key_name: categoryInfo.key_name,
                        name: categoryInfo.category,
                        provider_list: categoryInfo.provider_list
                    });
                }
            })

            fs.writeFile(file_name, JSON.stringify(buildData), 'utf8', cb);
        }, callback);
    }

    function buildFileExtension(callback) {
        async.eachSeries(extension_file_list, (fileName, cb) => {
            let file_name = providerExportPath + fileName + '.json';
            let buildData = {
                status: true,
                last_update: new Date().valueOf(),
                data: dataExtensionContent,
                categories: []
            };

            fileContent.forEach(categoryInfo => {
                if (categoryInfo.file === fileName) {

                    buildData.categories.push({
                        key_name: categoryInfo.key_name,
                        name: categoryInfo.category,
                        provider_list: categoryInfo.provider_list
                    });
                }
            })

            fs.writeFile(file_name, JSON.stringify(buildData), 'utf8', cb);
        }, callback);
    }
};

let appCategoryDelete = function (req, res) {
    let data = req.body;
    let reWrite = null;
    async.series({
        checkParam: function (callback) {
            if (!data) {
                return callback(0, null);
            } else {
                return callback(null, null);
            }
        },
        delete: function (callback) {
            let category_name = data.category_name;
            let country_name = data.country_name;
            fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
                if (error) {
                    return callback(error, null);
                } else {
                    if (result) {
                        result = JSON.parse(result);
                        result.forEach(item => {
                            if (item.country === country_name && item.category == category_name) {
                                let index = result.indexOf(item);
                                result.splice(index, 1);
                                reWrite = result;
                            }
                        });
                    }
                    return callback(null, null);
                }
            });
        },
        reWrite: function (callback) {
            if (reWrite) {
                fs.writeFile(PROVIDER_COUNTRY_CACHE, JSON.stringify(reWrite), 'utf8', function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        return callback(null, null);
                    }
                });
            } else {
                return callback(-2, null);
            }
        }
    }, function (error, result) {
        if (error) {
            let status = error,
                message = '';

            if (error === 0) {
                status = 0;
                message = 'param empty';
            } else if (error === -2) {
                status = -2;
                message = 'delete fail';
            } else {
                status = error;
                message = error;
            }
            res.json({
                status: status,
                message: message
            });
        } else {
            res.json({
                status: 1,
                message: 'delete file successfully'
            });
        }
    });
};

let appCountryBrowse = function (req, res) {
    res.json({
        status: 1,
        data: COUNTRY
    });
};

let appProviderCacheDelete = function (req, res) {
    let data = req.body;
    let reWrite = null;

    async.series({
        checkParam: function (callback) {
            if (!data) {
                return callback(0, null);
            } else {
                return callback(null, null);
            }
        },
        delete: function (callback) {
            fs.readFile(PROVIDER_CACHE, 'utf8', function (error, result) {
                if (error) {
                    return callback(error, null);
                } else {
                    if (result) {
                        let object = JSON.parse(result);
                        object.forEach(item => {
                            if (item.file === data.provider) {
                                let index = object.indexOf(item);
                                object.splice(index, 1);
                                reWrite = object;
                            }
                        });
                    }
                    return callback(null, null);
                }
            })
        },
        reWrite: function (callback) {
            if (reWrite) {
                fs.writeFile(PROVIDER_CACHE, JSON.stringify(reWrite), 'utf8', function (error, result) {
                    if (error) {
                        return callback(error, null);
                    } else {
                        return callback(null, null);
                    }
                });
            } else {
                return callback(-2, null);
            }
        }
    }, function (error, result) {
        if (error) {
            let status = error,
                message = '';

            if (error == 0) {
                status = 0;
                message = 'param empty';
            } else if (error == -2) {
                status = -2;
                message = 'delete fail';
            } else {
                status = error;
                message = error;
            }
            res.json({
                status: status,
                message: message
            });
        } else {
            res.json({
                status: 1,
                message: 'delete file successfully'
            });
        }
    });
};

let appCategoryGetByKeyName = function (req, res) {
    let key_name = req.query.key_name;
    if (key_name) {
        fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
            if (error) {
                res.json({
                    status: -1,
                    message: 'read file error'
                });
            } else {
                if (result) {
                    let _r = null;
                    let object = JSON.parse(result);
                    object.forEach(item => {
                        if (item.key_name === key_name) {
                            _r = item;
                        }
                    });
                    res.json({
                        status: 1,
                        data: _r
                    });
                } else {
                    res.json({
                        status: 1,
                        data: {}
                    });
                }
            }
        });
    } else {
        res.json({
            status: 0,
            message: 'key_name can not empty'
        });
    }
};

let appCategoryGetByCountry = function (req, res) {
    let countryName = req.query.countryName;
    let dataObject = null;

    if (!countryName) {
        return res.json({
            status: 0,
            message: 'param not found'
        });
    }

    fs.open(PROVIDER_COUNTRY_CACHE, 'a', error => {
        if (error) {
            return res.json({
                status: error,
                message: error
            });
        }

        fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
            if (error) {
                return res.json({
                    status: error,
                    message: error
                });
            }

            if (result) {
                dataObject = JSON.parse(result);
            }

            let categories = [];

            if (dataObject && dataObject instanceof Array) {
                dataObject.forEach(object => {
                    if (object.country.toLowerCase() === countryName.toLowerCase()) {
                        categories.push(object);
                    }
                });
            }

            res.json({
                status: 1,
                data: categories
            });
        });
    });
};

let appCategoryUpdate = function (req, res) {
    let data = req.body;
    let reWriteData = null;

    if (!data.newData.key_name || !data.newData.category) {
        return res.json({
            status: 0,
            message: 'Params invalid'
        });
    }

    fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', function (error, result) {
        if (error) {
            return res.json({
                status: error,
                message: error
            });
        }

        if (!result) {
            return res.json({
                status: -1,
                message: 'key_name is not exist'
            });
        }

        let object = JSON.parse(result);

        object.forEach(item => {
            if (item.key_name === data.cachedData.key_name) {
                let index = object.indexOf(item);
                object.splice(index, 1);
                reWriteData = object;

                let updateData = {
                    country: item.country,
                    category: data.newData.category,
                    key_name: data.newData.key_name,
                    name: item.name,
                    file: item.file,
                    provider_list: item.provider_list
                };

                reWriteData.push(updateData);
            }
        });

        if (!reWriteData) {
            return res.json({
                status: -2,
                message: 'can not edit this category'
            });
        }

        fs.writeFile(PROVIDER_COUNTRY_CACHE, JSON.stringify(reWriteData), 'utf8', function (error) {
            res.json({
                status: error || 1,
                message: error || 'Edit successfully'
            });
        });
    });
};

let appCategoryCreate = function (req, res) {
    let data = req.body;

    if (!data || !data.country || !data.key_name || !data.name) {
        return res.json({
            status: 0,
            message: 'param empty'
        });
    }

    let checkValidResult = checkValid(data.key_name);
    if (checkValidResult === -3) {
        return res.json({
            status: -3,
            message: 'key_name invalid'
        });
    }

    fs.open(PROVIDER_COUNTRY_CACHE, 'a', (err) => {
        if (err) {
            return res.json({
                status: err,
                message: err
            });
        }

        createCategoryFileCache((err, result) => {
            if (!err) {
                return res.json({
                    status: 1,
                    data: result
                });
            }

            res.json({
                status: err,
                message: err
            });
        });
    });

    function checkValid(name) {
        let regex = /^([a-zA-Z]|_)*$/gi;
        if (name.match(regex)) {
            return 0
        } else {
            return -3;
        }
    }

    function createCategoryFileCache(callback) {
        fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', (err, categories) => {
            if (err) {
                return callback(err);
            }

            let dataWritten;

            try {
                dataWritten = JSON.parse(categories.toString());
            } catch (e) {
                dataWritten = [];
            }

            if (dataWritten.length > 0) {
                if (isKeyNameExists(data.key_name, data.country, dataWritten)) {
                    return res.json({
                        status: -3,
                        message: 'key_name exists'
                    });
                }
            }

            let code = null;

            getCodeByCountry(data.country, function (error, result) {
                if (error) {
                    return callback(error);
                }

                code = result.toLowerCase();
                let file = 'provider_cache_' + env + '_' + code;
                handleAndSave(file);
            });

            function handleAndSave(fileName) {
                let object = {
                    country: data.country,
                    category: data.name,
                    key_name: data.key_name,
                    name: "provider",
                    file: fileName,
                    provider_list: []
                };

                dataWritten.push(object);

                fs.writeFile(PROVIDER_COUNTRY_CACHE, JSON.stringify(dataWritten), 'utf8', callback);
            }
        });
    }
};

let appSearchProvider = function (req, res) {
    let data = req.body;

    if (!data.searchKey || !data.inSearchBound) {
        return res.json({
            status: false,
            message: 'input is empty'
        });
    }

    let options = {
        name: data.searchKey,
        _id: { $in: data.inSearchBound }
    }

    if (data.type) {
        if (data.type.toLowerCase() === 'crypto' || data.type.toLowerCase() === 'payment') {
            options.type = data.type.toLowerCase();
        } else {
            options["$or"] = [
                {
                    type: {
                        "$nin": file_extension_type
                    }
                }
            ]
        }
    }

    ProviderScheme.searchByName(options, function (error, result) {
        return res.json({
            status: !error,
            data: result
        });
    });

};

let appLiveSearch = function (req, res) {
    let data = req.body;
    if (!data.keyword || !data.inSearchBound) {
        return res.json({
            status: false,
            message: 'input is empty'
        });
    };

    let options = {
        name: data.keyword,
        _id: { $in: data.inSearchBound }
    }

    if (data.type) {
        if (data.type.toLowerCase() === 'crypto' || data.type.toLowerCase() === 'payment') {
            options.type = data.type.toLowerCase();
        } else {
            options["$or"] = [
                {
                    type: {
                        "$nin": file_extension_type
                    }
                }
            ]
        }
    }
    // console.log(options);

    ProviderScheme.liveSearch(options, function (error, result) {
        return res.json({
            status: !error,
            data: result
        });
    });
}


let appDeleteProviderChoose = function (req, res) {
    let data = req.body;
    if (!data.realId || !data.category || !data.countryName) {
        return res.json({
            status: false,
            message: 'realId is required'
        });
    }

    let realIdParam = parseInt(data.realId);
    let targetProvider = null;
    let newTargetProviderRebuild = null;
    let indexTarget = null;

    let callback = function (error, result) {
        return res.json({
            status: !error
        });
    };

    let deleteFile = function (index, target, cb) {

        if (index == 0 || index == 1) {
            index = index.toString();
        }

        if (index && Object.keys(target).length > 0) {
            fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', (error, result) => {
                if (error) {
                    cb(error, null);
                } else {
                    if (result) {
                        index = parseInt(index);
                        result = JSON.parse(result);
                        // xoa cai cu
                        result.splice(index, 1);
                        // insert cai moi
                        result.splice(index, 0, target);

                        cb(null, result);
                    } else {
                        cb(null, null);
                    }
                }
            });
        } else {
            cb(null, null);
        }
    };

    let reWriteFile = function (newData, cb) {
        fs.writeFile(PROVIDER_COUNTRY_CACHE, JSON.stringify(newData), 'utf8', cb);
    }

    let readFile = function (cb) {
        fs.readFile(PROVIDER_COUNTRY_CACHE, 'utf8', (error, result) => {
            if (error) {
                cb(error, null, null);
            } else {
                if (result) {
                    result = JSON.parse(result);

                    for (let item of result) {
                        if (item.country === data.countryName && item.category === data.category) {
                            targetProvider = item;
                            indexTarget = result.indexOf(targetProvider);
                        }
                    }

                    if (targetProvider) {
                        for (let item of targetProvider.provider_list) {
                            if (item === realIdParam) {
                                let index = targetProvider.provider_list.indexOf(realIdParam);
                                targetProvider.provider_list.splice(index, 1);
                            }
                        }
                    }

                    cb(null, indexTarget, targetProvider);
                } else {
                    cb(null, null, null);
                }
            }
        });
    };

    async.waterfall([
        readFile,
        deleteFile,
        reWriteFile
    ], callback);

}

module.exports = function (app, config) {
    app.get('/provider-country-code', staticsMain);
    app.get('/provider-country-code/*', staticsMain);
    app.get('/api/country/browse', appCountryBrowse);

    app.get('/api/provider_cache/browse', getCacheList);
    app.post('/api/provider_cache/create', appProviderCacheCreate);
    app.post('/api/provider_cache/delete', appProviderCacheDelete);

    app.get('/api/provider-category/getByKeyName', appCategoryGetByKeyName);
    app.get('/api/provider-category/getByCountry', appCategoryGetByCountry);

    app.post('/api/category/update', appCategoryUpdate);
    app.post('/api/category/createCacheCategory', appCategoryCreate);
    app.post('/api/category/delete', appCategoryDelete);

    app.get('/api/provider/browse', appProviderBrowse);
    app.post('/api/provider/create', appProviderCreate);
    app.post('/api/provider-country-code/build', appProviderCountryBuild);
    app.post('/api/provider/search', appSearchProvider);
    app.post('/api/provider/liveSearch', appLiveSearch);
    app.post('/api/provider/delete', appDeleteProviderChoose);
};
