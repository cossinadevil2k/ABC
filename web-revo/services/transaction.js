/**
 * Transaction
 */
'use strict';

const Service = require('./service');
const moment = require('moment');

class Transaction extends Service {
	constructor(req) {
		super(req, ['Account', 'Transaction', 'User', 'Category']);
		//noinspection JSUnresolvedVariable
		this.dateFormat = 'YYYY-MM-DD';
	}

	list(callback) {
		var walletId = this.data.walletId;
		var startDate = this.data.startDate;
		var endDate = this.data.endDate;
		var userId = this.userId;
		var self = this;

		if (walletId === 'all') {
			this._getListWalletByUserId(userId).then((listWallet) => {
				self.schema['Transaction'].getTransactionByDateRange(
					listWallet, startDate, endDate,
					self._parseTransactionAllWallet(startDate, endDate, callback)
				);
			}, () => {
				self._parseTransactionAllWallet(startDate, endDate, callback)(null, []);
			});
		} else {
			this.readPessission(userId, walletId).then(() => {
				self.schema['Transaction'].getTransactionByDateRange(
					walletId, startDate, endDate,
					self._parseTransactionAllWallet(startDate, endDate, callback)
				);
			}, () => {
				self.callback(1, 'sync_error_have_not_permission', 'transaction_list')(callback);
			});
		}
	}

	add(callback) {
		var transactionInfo = this._getTransactionInfo();
		var userId = this.userId;
		var walletId = transactionInfo.account;
		var self = this;

		transactionInfo.tokenDevice = "web";
		transactionInfo.displayDate = moment(transactionInfo.displayDate, 'YYYY-MM-DD').format();

		this._writePermission(userId, walletId, transactionInfo.category, true, true).then(() => {
			self.schema['Transaction'].createTransaction(
				self._cleanTransactionInfo(transactionInfo), userId, (status) => {
					if (status) {
						self._transactionNotif(userId, walletId);
						self.callback(0, 'transaction_add_success', 'transaction_create')(callback);
					} else {
						self.callback(1, 'transaction_add_error', 'transaction_create')(callback);
					}
				});
		}, () => {
			self.callback(1, 'sync_error_have_not_permission', 'transaction_create')(callback);
		});
	}

	edit(callback) {
		var self = this;
		var transactionInfo = this._getTransactionInfo();
		var userId = this.userId;
		var walletId = transactionInfo.account;
		var transactionId = transactionInfo._id;

		transactionInfo.tokenDevice = 'web';
		transactionInfo.displayDate = moment(transactionInfo.displayDate, 'YYYY-MM-DD').format();

		delete transactionInfo._id;

		this._writePermission(userId, walletId, transactionInfo.category, false, true).then(() => {
			self.schema['Transaction'].editTransaction(
				self._cleanTransactionInfo(transactionInfo),
				transactionId, userId, status => {
					if (status) {
						self._transactionNotif(userId, walletId);
						self.callback(
							0, 'transaction_update_success', 'transaction_edit'
						)(callback);
					} else {
						self.callback(
							1, 'transaction_update_error', 'transaction_edit'
						)(callback);
					}
				}
			);
		}, () => {
			self.callback(1, 'sync_error_have_not_permission', 'transaction_edit')(callback);
		});
	}

	del(callback) {
		var self = this;
		var transactionInfo = this._getTransactionInfo();
		var userId = this.userId;
		var walletId = transactionInfo.account ? transactionInfo.account._id : null;

		this._writePermission(userId, walletId, transactionInfo.category, true, false).then(() => {
			self.schema['Transaction'].deleteTransaction(
				transactionInfo._id, userId, status => {
					if (status) {
						self._updateLastSync(userId);
						self._transactionNotif(userId, walletId);
						self.callback(
							0, 'transaction_delete_success', 'transaction_delete'
						)(callback);
					} else {
						self.callback(
							1, 'transaction_delete_error', 'transaction_delete'
						)(callback);
					}
				}
			);
		}, () => {
			self.callback(1, 'sync_error_have_not_permission', 'transaction_edit')(callback);
		});
	}

	_updateLastSync(userId) {
		this.schema['User'].updateLastSync(userId);
	}

	_cleanTransactionInfo(transactionInfo) {
		return {
			account: transactionInfo.account,
			category: transactionInfo.category,
			amount: transactionInfo.amount,
			note: transactionInfo.note,
			with: transactionInfo.with || [],
			displayDate: transactionInfo.displayDate || new Date(),
			tokenDevice: transactionInfo.tokenDevice
		}
	}

	_getListWalletByUserId(userId) {
		var self = this;
		return new Promise((resolve, reject) => {
			if (userId) {
				var condition = [
					{'isDelete': false},
					{'exclude_total': false},
					{'listUser': userId}
				];

				self.schema['Account'].find({$and: condition}, '_id', (error, wallets) => {
					if (error) {
						reject([]);
					} else {
						var tmpWallet = [];
						wallets.forEach(wallet => {
							tmpWallet.push(wallet._id);
						});
						resolve(tmpWallet);
					}
				});
			} else {
				reject([]);
			}
		});

	}

	_writePermission(userId, walletId, categoryId, validLinked, validCategory) {
		let listPromise = [this.writePermission(userId, walletId)];

		if (validLinked) {
			listPromise.push(this._nonLinkedWallet(walletId));
		}

		if (validCategory) {
			listPromise.push(this._validCategory(categoryId, walletId));
		}

		return Promise.all(listPromise);
	}

	_nonLinkedWallet(walletId) {
		var self = this;
		return new Promise((resolve, reject) => {
			self.schema['Account'].findById(walletId, 'account_type', function (error, wallet) {
				if (error || !wallet) {
					reject(false);
				} else {
					if (wallet.account_type === 0) {
						resolve(true);
					} else {
						reject(true);
					}
				}
			});
		});
	}

	_transactionNotif(userId, walletId) {
		var self = this;
		this.notify(userId, walletId, 'TRANSACTION').then(() => {
			self.notify(userId, walletId, 'WALLET');
		});
	}

	_parseTransactionAllWallet(startDate, endDate, callback) {
		var self = this;

		return function (error, transactions) {
			if (error) self.callback(1, 'get_transaction_error', 'transaction_list')(callback);
			else {
				if (!startDate) startDate = new Date();
				if (!endDate) endDate = new Date();

				var dateRange = {
					startDate: moment(startDate).format(self.dateFormat),
					endDate: moment(endDate).format(self.dateFormat)
				};
				if (transactions.length === 0) {
					self.callback(0, 'cashbook_no_data', 'transaction_list', {
						daterange: dateRange,
						transactions: []
					})(callback);
				} else {
					self.callback(0, 'get_transaction_success', 'transaction_list', {
						daterange: dateRange,
						transactions: transactions
					})(callback);
				}
			}
		}
	}

	_validCategory(categoryId, walletId) {
		return new Promise((resolve, reject) => {
			this.schema['Category'].findOne({_id: categoryId, account: walletId}, (err, cate) => {
				if (err || !cate) {
					reject(true);
				} else {
					resolve(true);
				}
			});
		});
	}

	_getTransactionInfo() {
		return JSON.parse(this.data.transInfo);
	}
}

module.exports = Transaction;
