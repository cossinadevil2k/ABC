const env = 'production';
const Request = require('request');
const config = require('../config/config')[env];

const FINSIFYBASEURL = config.finsifyBaseUrl;
const FINSIFYCLIENTID = config.clientFinsify;
const FINSIFYSERVICESECRET = config.secretFinsify;

function requestFinsifyServer(loginSecret) {
    let opstions = {
        url: FINSIFYBASEURL + '/login/activate',
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'charset': 'utf-8',
            'Client-id': FINSIFYCLIENTID,
            'App-secret': FINSIFYSERVICESECRET,
            'Login-secret': loginSecret
        },
        body: {

        }
    };

    requestFunc(opstions)
        .then(function (data) {
            console.log(data);
        }).catch(function (error) {
            console.log(error);
        });
}

function requestFunc(options) {
    return new Promise((resolve, reject) => {
        Request.put({ url: options.url, headers: options.headers, form: options.body }, (err, response, body) => {
            if (err) {
                return reject(err);
            } else
                resolve(body);
        });
    });
};

requestFinsifyServer("5043510b-9c28-4445-ad0c-cde027d61b86");
// requestFinsifyServer("764dbd5e-1579-47d7-9b76-09bc64641553");
// requestFinsifyServer("89036498-8fd7-4176-8d6e-463431dcec20");
// requestFinsifyServer("a58efc3d-1f70-4e22-a6b6-ac5844fcde3a");

