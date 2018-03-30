module.exports = {
    local: {
        rabbit: {
            host: 'localhost',
            port: 5672,
            user: 'loint',
            password: '123456',
            vhost: 'credit_change',
            url: 'amqp://loint:123456@localhost:5672/credit_change'
        }
    },
    dev: {
        rabbit: {
            host: 'redis-msg',
            port: 5672,
            user: 'moneylover',
            password: '7337610',
            vhost: 'credit_change_dev',
            url: 'amqp://moneylover:7337610@redis-msg:5672/credit_change_dev'
        }
    },
    production: {
        rabbit: {
            host: 'redis-msg',
            port: 5672,
            user: 'zoostd',
            password: '19f3fdbce4',
            vhost: 'credit_change',
            url: 'amqp://zoostd:19f3fdbce4@redis-msg:5672/credit_change'
        }
    }
}
