/**
 * Request action
 */
'use strict';

const RequestAction = {
	// user
	user_info: 'user_info',
	user_login: 'user_login',
	user_register: 'user_register',
	user_connect: 'user_connect',
	user_link_account: 'user_link_account',
	user_update_setting: 'user_update_setting',
	user_update_iconpack: 'user_update_iconpack',
	user_update_password: 'user_update_password',
	user_info_device: 'user_info_device',
	user_logout: 'user_logout',
	user_forgot_password: 'user_forgot_password',

	// wallet
	wallet_list: 'wallet_list',
	wallet_edit: 'wallet_edit',
	wallet_create: 'wallet_create',
	wallet_delete: 'wallet_delete',

	// transaction:
	transaction_list: 'transaction_list',
	transaction_edit: 'transaction_edit',
	transaction_create: 'transaction_create',
	transaction_delete: 'transaction_delete',

	// icon
	icon_list: 'icon_list',
	icon_pack: 'icon_pack',

	// category
	category_list: 'category_list',
	category_create: 'category_create',
	category_edit: 'category_edit',
	category_delete: 'category_delete',

	// event
	event_list: 'event_list',
	event_create: 'event_create',
	event_edit: 'event_edit',
	event_delete: 'event_delete'
};

module.exports = RequestAction;
