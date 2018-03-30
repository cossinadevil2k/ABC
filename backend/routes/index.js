/*
 Index
 */



module.exports = function (app, config) {
	require('./landing_page')(app,config);
	require('./home')(app, config);
	require('./user')(app, config);
	require('./admin')(app, config);
	require('./notify')(app, config);
	require('./currency')(app, config);
	require('./clientKey')(app, config);
	require('./icons')(app, config);
	require('./events')(app, config);
	require('./email')(app, config);
	require('./messages')(app, config);
	require('./dashboard')(app, config);
	require('./bank')(app, config);
	require('./userbankmsg')(app, config);
	require('./location')(app, config);
	require('./stats')(app, config);
	require('./static')(app, config);
	require('./register_devML')(app, config);
	//////////////////////////////////
	require('./info')(app, config);
	require('./purchasedstat')(app, config);
	require('./redeem')(app, config);
	require('./bonus')(app, config);
	require('./premiumlog')(app, config);
	require('./setting')(app, config);
	require('./helpdesk')(app, config);
	require('./notification')(app, config);
	require('./lucky')(app, config);
	require('./mac_beta')(app, config);
	require('./subscription_products')(app, config);
	require('./subscription_log')(app, config);
	require('./subscription_stats')(app, config);
	require('./subscription_code')(app, config);
	require('./coupon')(app, config);
	require('./remote_wallet_provider')(app, config);
	require('./sys-info')(app, config);
	require('./devices')(app, config);
	require('./changelog')(app, config);
	require('./change_email')(app, config);
	require('./wallet-diagnosis')(app, config);
	require('./search_query')(app, config);
	require('./push_notification_request')(app, config);
	require('./images')(app, config);
	require('./mileStone')(app, config);
	require('./query_compare')(app, config);
	require('./partner')(app, config);
	require('./active_user')(app, config);
	require('./receipt')(app, config);
	require('./classification_logs')(app, config);
	require('./use_credit')(app, config);
	require('./transaction_linkedwallet_uncategorized')(app, config);
	require('./purchase_log')(app, config);
	require('./purchase_chart')(app, config);
	require('./premium_products')(app, config);
	require('./transaction')(app, config);
	require('./exception')(app, config);
	require('./tags')(app, config);
	require('./provider')(app, config);
	require('./email_push_automation')(app, config);
	require('./open_push_tracking')(app, config);
	require('./discount')(app, config);
	require('./subscription_renew_log')(app, config);
	
	app.get('/', staticsMain);

	app.use(function (req, res, next) {
		res.status(404);
		if (req.accepts('html')) {
			res.redirect('/404');
			return;
		}
		if (req.accepts('json')) {
			res.send({
				error: 'Not found'
			});
			return;
		}
		res.type('txt').send('Not found');
	});
};
