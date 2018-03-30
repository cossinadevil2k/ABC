/**
 * Created by cuongpham on 8/12/14.
 */

'use strict';

let mongoose = require('mongoose');
let BankMsg = mongoose.model('BankMsg');
let nodeExcel = require('excel-export');

let appGet = function(req, res){
    let skip = req.body.skip || 0;
    let limit = req.body.limit || 20;

    BankMsg.find({isDelete: false})
        .sort({sendDate: -1})
        .skip(skip)
        .limit(limit)
        .exec(function(err, data){
            if (err) {
                return res.send({err: true, msg:"Get bank message error"});
            }
            
            res.send({err: false, data: data});
        });
};

let appDownload = function(req, res){
    BankMsg.find(function(err, data){
        if(err) res.send(403);
        else {
            let conf = {};
            conf.cols = [
                {
                    caption: 'Bank Name',
                    type: 'string',
                    width: 30
                },{
                    caption: 'Sender',
                    type: 'boolean',
                    width: 30
                },{
                    caption: 'Content',
                    type: 'string',
                    width: 60
                },{
                    caption: 'SendDate',
                    type: 'datetime',
                    width: 30
                }
            ];

            conf.rows=[];
            data.forEach(function(element){
                conf.rows.push([element.bankname, element.sender, element.content, element.sendDate]);
            });
            let result = nodeExcel.execute(conf);
            let fileName = "User_Bank_Message.xlsx";
            res.setHeader('Content-Type', 'application/vnd.openxmlformats');
            res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
            res.end(result, 'binary');
        }
    });
};

let appDelete = function(req, res){
    let msgId = req.body.msgId;
    BankMsg.findOneAndUpdate({_id:msgId},{isDelete:true}, function(err, data){
        if(!err || data) res.send({error:0, msg:"UserBankMessage delete success"});
        else res.send({error:1, msg:"UserBankMessage delete error"});
    });
};

module.exports = function(app, config){
    app.get('/userbankmsg', staticsMain);
    app.post('/userbankmsg/get', appGet);
    app.get('/userbankmsg/download', appDownload);
    app.post('/userbankmsg/delete', appDelete);
};