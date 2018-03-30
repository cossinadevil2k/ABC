const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const path = require('path');
const configGooglePlayApi = require('../config/google_play_api');
const Request = require('request');
const Rabbit = require(path.join(__dirname, '/rabbitmq/lib/rabbit.js'));

const GOOGLE_CONSOLE_API_KEY = {
    "client_id": configGooglePlayApi.CONFIG_SUB.client_id,
    "project_id": configGooglePlayApi.CONFIG_SUB.project_id,
    "auth_uri": configGooglePlayApi.CONFIG_SUB.auth_uri,
    "token_uri": configGooglePlayApi.CONFIG_SUB.token_uri,
    "auth_provider_x509_cert_url": configGooglePlayApi.CONFIG_SUB.auth_provider_x509_cert_url,
    "client_secret": configGooglePlayApi.CONFIG_SUB.client_secret,
    "redirect_uris": configGooglePlayApi.CONFIG_SUB.redirect_uris
};

const RawDataPublisher = new Rabbit.default({
    tag: 'white-house-worker-android',
    exchanges: [Rabbit.JOB_EXCHANGE]
});

const EVENT_STATUS_UDDATE_NOTIFICATION = 'hook.ready.raw-android-status';


process.on('uncaughtException', function (err) {
    console.log(err.stack);
});

process.on('exit', function (code) {
    console.log('About to exit with code: ' + code);
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.get('/', function (req, res) {
    // console.log(req.query);
    let code = req.query.code;

    generateRefreshTokenGPAPI(code, function (error, response) {
        if (error) {
            // console.log(error);
        } else {
            let access_token = response.access_token;
            let refresh_token = response.refresh_token;
            // console.log(response);
            res.send({
                status: true, data: response
            });
        }
    });
})


app.post('/', function (req, res) {
    // console.log(req.body);
    // RawDataPublisher.publish(EVENT_STATUS_UDDATE_NOTIFICATION, req.body, Rabbit.PRIORITY.critical);
    res.send({ ok: 1 });
})

function generateRefreshTokenGPAPI(code, callback) {
    Request.post({
        url: GOOGLE_CONSOLE_API_KEY.token_uri,
        json: true,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "access_type": "offline"
        },
        form: {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": GOOGLE_CONSOLE_API_KEY.client_id,
            "client_secret": GOOGLE_CONSOLE_API_KEY.client_secret,
            "redirect_uri": GOOGLE_CONSOLE_API_KEY.redirect_uris
        }
    }, function (err, response, body) {
        if (err) {
            // console.log(err);
            callback(error, null);
        } else {
            callback(null, response.body);
        }
    });
}

function purchaseSubscriptionGet(access_token) {
    Request({
        url: "https://www.googleapis.com/androidpublisher/v2",
        method: "GET",
        auth: {
            "bearer": access_token
        },
        qs: {
            "applications": "packageName",
            "purchases/subscriptions": "subscriptionId",
            "tokens": "token"
        }
    }, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else {
            // console.log(response.body);
        }
    });
}

// authorizationGPAPI(configGooglePlayApi.android_sub.code);

const port = 12096;

app.listen(port, function () {
    console.log('Subscription status url of android ping on port ' + port);
});