module.exports = {
    local: {
        rabbit: {
            host: 'localhost',
            port: 5672,
            user: 'loint',
            password: '123456',
            vhost: 'android_hook',
            url: 'amqp://loint:123456@localhost:5672/android_hook'
        }
    },
    dev: {
        rabbit: {
            host: 'redis-msg',
            port: 5672,
            user: 'zoostd',
            password: '19f3fdbce4',
            vhost: 'android_hook_dev',
            url: 'amqp://zoostd:19f3fdbce4@redis-msg:5672/android_hook_dev'
        }
    },
    production: {
        rabbit: {
            host: 'redis-msg',
            port: 5672,
            user: 'zoostd',
            password: '19f3fdbce4',
            vhost: 'android_hook',
            url: 'amqp://zoostd:19f3fdbce4@redis-msg:5672/android_hook'
        }
    }
}
