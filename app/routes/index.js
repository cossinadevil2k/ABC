 /*
	Index
*/

module.exports = function(app, config){
	//require('./lib')(app, config);
	//require('./icon')(app, config);
	//require('./events')(app, config);
    //require('./campaign')(app, config);
	//require('./home')(app, config);
	//require('./api')(app, config);
	require('./user')(app, config);
	//require('./account')(app, config);
	//require('./transaction')(app, config);
	//require('./category')(app, config);
	require('./main')(app, config);
};