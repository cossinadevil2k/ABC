/*
	Update Stat
*/
var cronJob = require('cron').CronJob;
var request = require('request');


var url1 = 'http://tapi.moneylover.me/log/stat';
var url2 = 'http://log.moneylover.me/log/stat';

var job = new cronJob({
	// cronTime: '00 45 */1 * * *',
	cronTime: '00 50 */1 * * *',
	onTick: function() {
		// request.post({url: url1, form:{senderOk:true}}, function(err, response, body){
		// 	console.log('[Dev] Update stat');
		// });
		request.post({url: url2, form:{senderOk:true}}, function(err, response, body){
			console.log('[Pro] Update stat');
		});
	},
	start: false
});
job.start();
