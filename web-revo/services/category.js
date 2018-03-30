/**
 * Category
 */

'use strict';

const Service = require('./service');

class Category extends Service {
	constructor(req) {
		super(req, ['Account', 'Category']);
	}

	list(callback) {
		let walletId = this.data.walletId;
		let userId = this.userId;
		var self = this;

		this.readPessission(userId, walletId).then(() => {
			self.schema['Category'].getCategoryListByAccountId(walletId, 0, true, function (result) {
				if (result === []) {
					// console.log('Empty');
					self.callback(1, 'web_get_category_error', 'category_list')(callback);
				} else {
					self.callback(0, 'get_cate_success', 'category_list', result, walletId)(callback);
				}
			});
		}, () => {
			// console.log('Not read');

			self.callback(1, 'web_get_category_error', 'category_list')(callback);
		});
	}

	add(callback) {
		this.callback(1, 'category_e_internal_server_error', 'category_create')(callback);
	}

	edit(callback) {
		this.callback(1, 'category_e_internal_server_error', 'category_edit')(callback);
	}

	del(callback) {
		this.callback(1, 'category_e_internal_server_error', 'category_delete')(callback);
	}
}

module.exports = Category;
