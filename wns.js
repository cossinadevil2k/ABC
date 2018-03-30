var wns = require('wns');


var options = {
    client_id: 'ms-app://s-1-15-2-3933854784-1581073814-3179062630-2263249833-756725367-2539445003-3428552920',
    client_secret: 'Zq//6tbbqmLpsaC8qt7IFMRO+e8J7Clc',
    // accessToken: 'EgDaAAMAAAAEgAAAC4AAzA1d3cQ0H8soZF7sc1moeB7OLwNvbueqjwxtW/b+cCq0r+R2oosCVJpwNZZFK/rFbsPUlWtza9fCtP1TaNMEiKKC/i/YbZ7EGnAyD9MFGJosEo1PBx1XIr9HrxSSvl5wbyfj5agzchXKQg+WTxxyCdzJoUIpWenhDqI04xIM4QhJAFoASQAAAAAAEgYSRIDsn1OA7J9T60gEABAAMTEzLjE5MC4yNTIuMTM0AAAAAAAZAGFwcGlkOi8vMDAwMDAwMDA0NDEyMDYxMgA='
};
var channelUrl = 'https://hk2.notify.windows.com/?token=AwYAAACHe5HdrWTPD5Xx7mTqmtwspsJZn5x9gQskHKZ0RQNosCrRBKHlzuc%2btyMxkVoVb3J4%2brJqtKjy%2fhJrDdHXRk%2bHdmTnmb%2bw2yx%2bzCy3y3AfVqqm5NxflkYjrUydsuMdzlE%3d';
wns.sendRaw(channelUrl, JSON.stringify({ foo: 1, bar: 2 }), options, function(err, data){
	console.log('%j', err);
	console.log('%j', data);
});

// wns.sendTileSquareBlock(channelUrl, 'Yes!', 'It worked!', options, function (error, result) {
//     if (error)
//         console.error(error);
//     else
//         console.log(result);
// });


// wns.sendToastText01(channelUrl, 'Xin chao day la moneylover. duoc ban tu local', options, function (error, result) {
// 	if (error) console.error(error);
// 	else console.log(result);
// });

// wns.send(channelUrl, JSON.stringify({foo: 'bar', bar: 'foo'}), 'wns/raw', options, function (error, result) {
// 	if (error) console.error(error);
// 	else console.log(result);
// });