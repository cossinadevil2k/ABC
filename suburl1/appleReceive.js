const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const path = require('path');

const Rabbit = require(path.join(__dirname, '/rabbitmq/lib/rabbit.js'));

const RawDataPublisher = new Rabbit.default({
    tag: 'white-house-worker-apple',
    exchanges: [Rabbit.JOB_EXCHANGE]
});

const EVENT_STATUS_UDDATE_NOTIFICATION = 'hook.ready.raw-apple-status';


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
    res.send('Hello World!')
})

app.post('/', function (req, res) {
    // console.log(req.body);
    RawDataPublisher.publish(EVENT_STATUS_UDDATE_NOTIFICATION, req.body, Rabbit.PRIORITY.critical);
    res.send({ ok: 1 });
})

const port = 12092;

app.listen(port, function () {
    console.log('Subscription status url ping on port ' + port);
});