/**
 * Created by cuongpham on 10/19/16.
 */

'use strict';

let env = process.env.NODE_ENV;
let fs = require('fs');
let config = require('../../config/config')[env];

const filePath = config.root + '/app/public/data/phone_list.csv';

let appSavePhone = function(req, res){
    let phone = req.query.phone;

    if (!phone) {
        return res.json({status: false, message: "Param Invalid"});
    }

    fs.readFile(filePath, {flag: 'a+'}, function(err, data){
        if (err) {
            // console.log(err);
            return res.json({s: false});
        }

        data = data.toString();

        data += '\n' + phone;

        fs.writeFile(filePath, data, function(err){
            res.jsonp({s: !err});
        });
    });
};

module.exports = function (app) {
    app.get('/static/save-phone', appSavePhone);
};
