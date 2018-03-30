// const Rabbit = require('./lib/rabbit');

// const whiteHouseProvider = new Rabbit.default({
//     tag: 'white-house-provider',
//     exchanges: [Rabbit.JOB_EXCHANGE]
// });

// const EVENT_NAME = 'hook.ready.test';
// var counter = 0;


// function run() {
// 	setInterval(() => {
// 		console.info('Push ...', counter);
// 		whiteHouseProvider.publish(EVENT_NAME, {
// 			test : counter
// 		}, Rabbit.PRIORITY.normal);
// 		counter++;
// 	}, 0)
// }

// run();