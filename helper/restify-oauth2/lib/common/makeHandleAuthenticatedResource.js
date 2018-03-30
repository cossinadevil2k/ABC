"use strict";

function hasBearerToken(req) {
    return req.authorization && req.authorization.scheme === "Bearer" && req.authorization.credentials.length > 0;
}

function getBearerToken(req) {
    return hasBearerToken(req) ? req.authorization.credentials : null;
}

function getApiVersion(req){
    var apiVersion = req.headers.apiversion || 1;
    try {
        apiVersion = parseInt(apiVersion, 10);
    } catch(e){
        apiVersion = 1;
    }
    return apiVersion;
}

module.exports = function makeHandleAuthenticatedResource(reqPropertyName, errorSenders) {
    return function handleAuthenticatedResource(req, res, next, options) {
        var token = getBearerToken(req);
        var apiVersion = getApiVersion(req);

        if (apiVersion === 4){
            return next();
        }

        if (!token) {
            //return errorSenders.tokenRequired(res, options);
            return res.send({s: false, e: 706}); //hardcode of Error.OAUTH_EXPIRE
        }

        req.pause();
        options.hooks.authenticateToken(token, apiVersion, function (error, credential) {
            req.resume();

            if (error) {
                //console.log('Error expire');
                //console.log(token);
                res.send({s: false, e: credential}); // hardcode 706
                // return errorSenders.sendWithHeaders(res, options, error);
            } else {
                req[reqPropertyName] = credential;
                req['tokenDevice'] = token;
                next();
            }
        });
    };
};
