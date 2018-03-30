'use strict';

var fs = require('fs');

var providerActionRootUrl = _CONFIG.root + '/app/public/data/rw-provider/';

var appGet = function(req, res){
    let providerCode = req.session.partnerProvider;

    fs.readFile(`${providerActionRootUrl + providerCode}.json`, {flag: 'a+'}, (err, data) => {
        let result = {};
        data = data.toString();

        if (data) {
            result = JSON.parse(data);
        }

        res.json({s: true, d: result});
    });
};

var appSave = function(req, res){
    let providerCode = req.session.partnerProvider;
    let data = req.body.data;

    if (!data) {
        return res.json({s: false});
    }

    console.log(data);

    fs.writeFile(`${providerActionRootUrl + providerCode}.json`, JSON.stringify(data), (err) => {
        res.json({s: !err});
    });
};

module.exports = function (app, config) {
    app.get('/linked-wallet-actions', staticsMain);
    app.post('/linked-wallet-actions/get', appGet);
    app.post('/linked-wallet-actions/save', appSave);
};