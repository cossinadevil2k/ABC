'use strict';

const RequestAction = {
    // user
    user_login: 'user_login',
    user_register: 'user_register',
    user_connect: 'user_connect',
    user_link_account: 'user_link_account',
    user_update_setting: 'user_update_setting',
    user_update_iconpack: 'user_update_iconpack',
    user_update_password: 'user_update_password',

    //wallet
    wallet_list: 'wallet_list',
    wallet_edit: 'wallet_edit',
    wallet_create: 'wallet_create',
    wallet_delete: 'wallet_delete',

    //transactions
    transaction_list: 'transaction_list',
    transaction_edit: 'transaction_edit',
    transaction_create: 'transaction_create',
    transaction_delete: 'transaction_delete',

    //icon
    icon_list: 'icon_list',
    icon_pack: 'icon_pack',

    //category
    category_list: 'category_list',
    category_create: 'category_create',

    //event/campaign
    event_list: 'event_list'
};

module.exports = RequestAction;