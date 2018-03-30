/**
 * Event
 */

'use strict';

const Service = require('./service');

class Category extends Service {
	constructor(req) {
		super(req, ['Account', 'Campaign']);
	}

	list(callback) {
		let walletId = this.data.walletId;
		var self = this;

		this.schema['Account'].findById(walletId, function (err, data) {
			if (err || !data) {
				self.callback(1, 'get_event_error', 'event_list')(callback);
			} else {
				self.schema['Campaign'].getCampaignListByAccountId(walletId, 6, function (result) {
					self.callback(0, 'get_event_error', 'event_list', result)(callback);
				});
			}
		});
	}

	add(callback) {
		this.callback(1, 'category_e_internal_server_error', 'event_create')(callback);
	}

	edit(callback) {
		this.callback(1, 'category_e_internal_server_error', 'event_edit')(callback);
	}

	del(callback) {
		this.callback(1, 'category_e_internal_server_error', 'event_delete')(callback);
	}
}

module.exports = Category;
