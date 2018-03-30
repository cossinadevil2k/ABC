var env = 'production';
process.env.NODE_ENV = env;
var app = require('express');
var http = require('http').Server(app);

var config = require('../config/config')[env];

var io = require('socket.io')(http);
var redis = require('socket.io-redis');
io.adapter(redis({host: config.redis.host, port: config.redis.port}));

io.on('connection', function(socket){
    socket.on('disconnect', function(){
        
    });
});

http.listen(config.portSocket, function(){
    console.log("Socket Server Runs on port " + config.portSocket);
});
