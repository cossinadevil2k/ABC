/**
 * New APN JS OOP
 **/

'use strict';
var env		= process.env.NODE_ENV || 'dev';
var apn		= require('apn');
var kue		= require('kue');
var utils   = require('./utils');

class APN {
    constructor(options) {
        this.__service = null;
        this.__options = {
            certFile: null,
            keyFile: null,
            passphrase: null,
            isDev: true,
            expire: 3600,
            requestCert: true,
            connectionTimeout: 30000
        };
        this.__badge = 1;

        this.__makeOptions(options);
        this.__createConnect();
    }

    __makeOptions(options) {
        utils.extendObject(this.__options, options);
    }

    __initServer() {
        var self = this;

        self.__options.isDev = (env !== 'production');

        console.log("isDev mode is " + self.__options.isDev);

        return {
            gateway: self.__options.isDev ? 'gateway.sandbox.push.apple.com' : 'gateway.push.apple.com',
            port: 2195
        };
    }

    __createConnect(){
        var self = this;
        var serverOption = self.__initServer();
        self.__service = new apn.connection({
            gateway: serverOption.gateway,
            port: serverOption.port,
            cert: self.__options.certFile,
            key: self.__options.keyFile,
            passphrase: self.__options.passphrase,
            connectionTimeout: self.__options.connectionTimeout
        });
        console.log("create connect with key: " + self.__options.keyFile);
        self.__connectStatus();
    }

    __connectStatus(){
        var self = this;
        self.__service.on('connected', function() {
            //console.log("[APN] Open connect");
        });

        self.__service.on('transmitted', function(notification, device) {
            //console.log("Push to: " + device.token.toString('hex'));
        });

        self.__service.on('transmissionError', function(errCode, notification, device){});

        self.__service.on('timeout', function () {
            //console.log('[APN] Timeout')
        });

        self.__service.on('disconnected', function() {
            //console.log('[APN] Disconnected');
        });
    }

    __makeAlert(data){
        var self = this;
        var note = new apn.notification();
        var message = data.dataMessage.m || data.dataMessage.t;
        note.expiry = Math.floor(Date.now() / 1000) + self.__options.expire;
        note.alert = {
            body: message,
            "action-loc-key" : "PLAY"
        };
        note.badge = self.__badge;
        note.sound = "default";
        note.payload = {data: data.dataMessage};
        return note;
    }

    __makeSyncData(data){
        var self = this;
        var note = new apn.notification();
        note.expiry = Math.floor(Date.now() / 1000) + self.__options.expire;
        note.payload = {data: data.dataMessage};
        // note.contentAvailable = 1;
        return note;
    }

    __makeMessage(data){
        if(data.type === 1) return this.__makeAlert(data);
        else return this.__makeSyncData(data);
    }

    __push(pushd, tokens){
        var self = this;
        var note = self.__makeMessage(pushd);
        self.__service.pushNotification(note, tokens);
    }

    notify(tokens, pushd){
        this.__push(pushd, tokens);
    }
}

module.exports = APN;