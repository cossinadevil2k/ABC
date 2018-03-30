// const Rabbit = require('./lib/rabbit');

// const WORKER_NAME = 'queue_worker_name';

// const whiteHouseWorker = new Rabbit.default({
//     tag: 'white-house-worker',
//     exchanges: [Rabbit.JOB_EXCHANGE],
//     queues: [{
//         name: WORKER_NAME,
//         exchange: Rabbit.JOB_EXCHANGE.name
//     }]
// });

// const EVENT_NAME = 'hook.ready.test';

// // whiteHouseWorker.subscribe(EVENT_NAME, function(message) {
// // 	console.info(message);
// // });

// whiteHouseWorker.listen(EVENT_NAME, WORKER_NAME, function (mess, next) {
//     console.log(mess);
//     next();
// });
