// Update with your config settings.
var env = process.env.NODE_ENV;
var config = require('../config/config')[env];

module.exports = {

    development: {
        client: 'postgresql',
        connection: {
            host: config.postgres.host,
            user: config.postgres.user,
            password: config.postgres.password,
            database: config.postgres.database,
            port: config.postgres.port,
            idleTimeoutMillis : config.postgres.idleTimeoutMillis
        },
        pool: {
            min: 2,
            max: 50000,
            allocated : 2,
            available : 10820,
            mexRequests: Infinity,
            idleTimeout : 60000,
            syncInterval : 3000
        }
    },
    dev: {
        client: 'postgresql',
        connection: {
            host: config.postgres.host,
            user: config.postgres.user,
            password: config.postgres.password,
            database: config.postgres.database,
            port: config.postgres.port,
            idleTimeoutMillis : config.postgres.idleTimeoutMillis
        },
        pool: {
            min: 2,
            max: 50000,
            allocated : 2,
            available : 10820,
            mexRequests: Infinity,
            idleTimeout : 60000,
            syncInterval : 3000
        }
    },
    production: {
        client: 'postgresql',
        connection: {
            host: config.postgres.host,
            user: config.postgres.user,
            password: config.postgres.password,
            database: config.postgres.database,
            port: config.postgres.port,
            idleTimeoutMillis : config.postgres.idleTimeoutMillis
        },
        pool: {
            min: 2,
            max: 50000,
            allocated : 2,
            available : 10820,
            mexRequests: Infinity,
            idleTimeout : 60000,
            syncInterval : 3000
        }
    }

};
