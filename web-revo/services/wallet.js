/**
 * Wallet
 */
'use strict';

const Service = require('./service');
const request = require('request');
const Balance = require('../../helper/wallet-balance');

class Wallet extends Service {
	constructor(req) {
		super(req, ['Account', 'Category', 'User', 'Transaction']);
	}

	list(callback) {
		this.schema['Account'].getAccountListByUserId(this.userId, (data) => {
			this._updateBalance(data, (newData) => {
				this.callback(0, 'get_list_account_success', 'wallet_list', newData)(callback);
			});
		});

	}

	add(callback) {
		var self = this;
		var walletInfo = this.data;
		var userId = this.userId;

		self._limitWallet(userId).then(() => {
			if (walletInfo.isLinked) {
				walletInfo = this._makeLinkedInfo(walletInfo);
			} else {
				walletInfo = this._makeWalletInfo(walletInfo);
			}

			self.schema['Account'].createAccount(walletInfo, userId, result => {
				if (result === false) {
					self.callback(1, 'web_wallet_create_fail', 'wallet_create')(callback);
				} else {
					let walletId = result._id;
					Promise.all([
						self._createCategoryDefault(userId, walletId),
						self._setPermission(userId, walletId),
						self._sendWalletNotif(userId, walletId)
					]).then(function () {
						self._fetchTransaction(walletInfo.metadata);
						self.callback(0, 'web_wallet_create_success', 'wallet_create', {_id: walletId})(callback);
					}, function () {
						self.callback(1, 'web_wallet_create_fail', 'wallet_create')(callback);
					});
				}
			});
		}, (status) => {
			if (status) {
				self.callback(1, 'purchase_notice_buy_features', 'wallet_create')(callback);
			} else {
				self.callback(1, 'web_wallet_create_fail', 'wallet_create')(callback);
			}
		});
	}

	balance(callback) {
		var userId = this.userId;
		var walletInfo = this.data;
		if (userId) {
			Balance(walletInfo.walletId, true,
				this.schema['Account'], this.schema['Transaction']).then(result => {

				let data = {
					_id: walletInfo.walletId,
					balance: result
				};

				this.callback(0, 'get_balance_success', 'wallet_balance', data)(callback);
			}, error => {
				// console.log('Error', error);
				this.callback(1, 'web_get_balance_fail', 'wallet_balance')(callback);
			});
		} else {
			this.callback(1, 'user_unauthenticated', 'wallet_balance')(callback);
		}
	}

	edit(callback) {
		self.callback(1, 'no_support', 'wallet_edit')(callback);
	}

	delete(callback) {
		self.callback(1, 'no_support', 'wallet_delete')(callback);
	}

	_updateBalance(data, callback) {
		let walletTmp = [];
		data = JSON.parse(JSON.stringify(data));

		data.forEach(wallet => {
			let hasBalance = false;

			if (wallet.metadata) {
				try {
                    let metaData = JSON.parse(wallet.metadata);
                    
                    if (metaData.hasBalance) {
                        hasBalance = metaData.hasBalance;
                    }
                } catch(e) {
					//TODO metadata must be stringified JSON
				}
			}

			if (!hasBalance) {
				walletTmp.push({_id: wallet._id});
			}
		});

		this._getBalances(walletTmp).then(result => {
			result.forEach((balance, index) => {
				walletTmp[index].balance = balance;
			});

			data.forEach((walletInfo, index) => {
				let wallet = walletTmp.filter(wallet => {
					return wallet._id == walletInfo._id;
				});
				if (wallet && wallet[0]) {
					data[index].balance = wallet[0]['balance'];
				}
			});

			callback(data);
		}, error => {
			callback(data);
		});
	}

	_getBalances(wallets) {
		let lstPromise = [];

		wallets.forEach(wallet => {
			lstPromise.push(
				Balance(wallet._id, true,
					this.schema['Account'], this.schema['Transaction'])
			);
		});

		return Promise.all(lstPromise);
	}

	_makeLinkedInfo(walletInfo) {
		var linkedInfo = {
			p_code: walletInfo.provider.code,
			login_id: walletInfo.login_id,
			secret: walletInfo.login_secret,
			p_name: walletInfo.provider.name,
			acc_id: walletInfo.id,
			is_free: walletInfo.provider.is_free,
			hasBalance: walletInfo.provider.hasBalance,
			acc_name: walletInfo.account_id,
			balance: walletInfo.balance
		};

		return {
			name: walletInfo.account_name,
			currency_id: walletInfo.currency.i,
			transaction_notification: walletInfo.notification || false,
			account_type: walletInfo.provider.service, // hard code finsify
			exclude_total: walletInfo.exclude_total || false,
			icon: '/icon/provider/' + walletInfo.provider.icon,
			balance: walletInfo.balance || 0,
			metadata: JSON.stringify(linkedInfo),
			rwInfo: {
				balance: linkedInfo.balance,
				secret: linkedInfo.secret,
				p_code: linkedInfo.p_code,
				login_id: linkedInfo.login_id,
				acc_id: linkedInfo.acc_id
			}
		}
	}

	_makeWalletInfo(walletInfo) {
		return {
			name: walletInfo.name,
			currency_id: walletInfo.currency_id,
			transaction_notification: walletInfo.notification || false,
			exclude_total: walletInfo.exclude_total,
			icon: walletInfo.icon
		}
	}

	_fetchTransaction(walletInfo) {
		// console.log('walletInfo', walletInfo);

		if (walletInfo) {
			walletInfo = JSON.parse(walletInfo);

			if (walletInfo.login_id) {
				var options = {
					method: 'POST',
					uri: this.config.finsify.webhook,
					body: {
						login_id: walletInfo.login_id
					},
					json: true
				};

				// console.log('_fetchTransaction', options);

				request(options, (err, res, body) => {
					// console.log('Err', err, body);
				});
			}
		}
	}

	_limitWallet(userId) {
		var self = this;

		return new Promise((resolve, reject) => {
			self.schema['User'].findById(userId, '-_id purchased', (error, user) => {
				if (error || !user) {
					reject(false);
				} else {
					if (user.purchased) {
						resolve(true);
					} else {
						self._countWallet(userId).then((counter) => {
							if (counter >= 2) {
								reject(true);
							} else {
								resolve(true);
							}
						}, () => {
							reject(false);
						});
					}
				}
			});
		});
	}

	_countWallet(userId) {
		var self = this;
		return new Promise((resolve, reject) => {
			self.schema['Account'].count({owner: userId}, (error, counter) => {
				if (error) {
					reject(false);
				} else {
					resolve(counter);
				}
			});
		});
	}

	_setPermission(userId, walletId) {
		return this.setAccountPermission(userId, walletId, true, true)
	}

	_createCategoryDefault(userId, walletId) {
		var self = this;

		return new Promise((resolve, reject) => {
			self.schema['Category'].generateDefaultCategory(walletId, (error) => {
				if (error) {
					reject(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	_sendWalletNotif(userId, walletId) {
		var self = this;

		return new Promise((resolve, reject) => {
			self.notify(userId, walletId, 'WALLET', 'FLAG_ADD').then(() => {
				resolve(true);
			}, () => {
				reject(false);
			});
		});
	}
}

module.exports = Wallet;
