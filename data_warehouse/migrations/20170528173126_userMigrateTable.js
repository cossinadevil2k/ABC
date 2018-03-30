/*
 * Change stucture of table
 * Do things like creating database tables, adding or removing a column from a table, changing indexes, etc
 * */

exports.up = function (knex, Promise) {
    return knex.schema.createTable('users', function (column) {
        column.string('user_id').notNull().primary();
        column.dateTime('register_date').notNull().index();
        column.dateTime('last_sync').nullable().index();
        column.dateTime('premium_date').nullable().index();
        column.string('country').nullable().index();
        column.boolean('android').nullable().index();
        column.boolean('ios').nullable().index();
        column.boolean('web').nullable().index();
        column.boolean('winphone').nullable().index();
        column.boolean('windows').nullable().index();
        column.boolean('premium_status').nullable().index();
        column.integer('num_wallet').notNull().index();
        column.boolean('deactive_status').nullable().index();

    });
};


/*
 * This functions goal is to do the opposite of what exports.up did
 */

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('Users');
};
