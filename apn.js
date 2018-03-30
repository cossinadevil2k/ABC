process.env.NODE_ENV = 'production';
//var ZooAPN	= require('./helper/newapn');
//var apn = new ZooAPN({
//    isDev:true,
//	certFile: '/home/cuongle/Project/moneylover/config/apns/aps_moneyplus_cert.pem',
//	keyFile: '/home/cuongle/Project/moneylover/config/apns/aps_moneyplus_key.pem',
//	passphrase: '7337610'
//});

var apn = require('apn');

var options = {
    cert: '/home/cuongle/Project/moneylover/config/apns/moneyfree_production_cert.pem',
    key: '/home/cuongle/Project/moneylover/config/apns/moneyfree_production_key.pem',
    passphrase: '7337610',
    production: true,
    connectTimeout: 3000,
    connectionTimeout: 3000
};

var feedbackOptions = {
    batchFeedback: true,
    interval: 300
};

function sendNoti(deviceId){
    var device = new apn.Device(deviceId);

    //create message
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now()/1000) + 30; //Expires 30s from now
    note.badge = 3;
    note.sound = 'ping.aiff';
    note.alert = 'Test đê anh ơi';
    note.payload = {'messageFrom':'Cuong'};

    //create connection
    var apnConnection = new apn.Connection(options);

    //listen event
    apnConnection.on('error', function(error){
        console.error('Error: ' + error);
    }).on('socketError', function(error){
        console.error('Socket Error: ' + error);
    }).on('transmitted', function(notification, device){
        // console.log("Transmitted to device " + device.toString());
    }).on('completed', function(){
        // console.log('Transmitted');
    }).on('connected', function(openSockets){
        // console.log("Connected", openSockets);
    }).on('disconnected', function(openSockets){
        // console.log("Disconnected", openSockets);
    }).on('timeout', function(){
        // console.log("Connection timeout");
    }).on('transmissionError', function(errorCode, notification, device){
        // console.log("Transmission Error: ");
        // console.log({errorCode: errorCode, device: device});
    });

    //create feedback
    var feedback = new apn.Feedback(feedbackOptions);
    feedback.on('feedback', function(devices){
        // console.log('feedback: ', devices);
    });

    //fire!
    apnConnection.pushNotification(note, device);
}

sendNoti('7037fe2691c0c6fa1151d157c4ab2d777314f710e9ab27ac8d067fbf5c7e2354');
