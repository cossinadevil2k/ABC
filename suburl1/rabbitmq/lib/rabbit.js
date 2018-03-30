'use strict';

const env = process.env.NODE_ENV || 'local';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PRIORITY = exports.JOB_EXCHANGE = exports.EXCHANGE = exports.exchangeNameDefault = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _amqplib = require('amqplib');

var _amqplib2 = _interopRequireDefault(_amqplib);

var _config = require('../config')[env];

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const debug = (0, _debug2.default)('hook:rabbit');

const exchangeNameDefault = exports.exchangeNameDefault = 'hook-exchange-event';

const EXCHANGE = exports.EXCHANGE = {
    name: exchangeNameDefault,
    type: 'topic'
};

const JOB_EXCHANGE = exports.JOB_EXCHANGE = {
    name: 'hook-jobs-exchange',
    type: 'direct',
    boundTo: {
        exchange: exchangeNameDefault,
        routingKey: 'hook.ready.#'
    }
};

const PRIORITY = exports.PRIORITY = {
    low: 0,
    normal: 1,
    medium: 2,
    high: 3,
    critical: 4
};

PRIORITY.DEFAULT = PRIORITY.normal;
PRIORITY.MAX = PRIORITY.critical;

class Rabbit extends _events2.default {
    constructor() {
        let opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        super();
        this.hasInitialized = false;

        this._processHandler();
        this._validateOptions(opts);
        this._initRabbit();
    }

    _processHandler() {
        this.on('error', err => {
            debug('encountered an error: %s', err.message);
            throw err;
        });

        process.on('unhandledRejection', reject => {
            debug('Unhandled rejection: %s', reject.message);
            debug(reject.stack);
        });
    }

    _validateOptions(options) {
        if (typeof options === "string") options = { tag: options };

        var _options = options;
        var _options$tag = _options.tag;
        let tag = _options$tag === undefined ? 'unknown' : _options$tag;
        var _options$exchanges = _options.exchanges;
        let exchanges = _options$exchanges === undefined ? [] : _options$exchanges;
        var _options$queues = _options.queues;
        let queues = _options$queues === undefined ? [] : _options$queues;


        this.exchangeMap = new Map();
        this.boundExchange = new Map();

        exchanges.push(EXCHANGE);
        exchanges.forEach(exchange => {
            this.exchangeMap.set(exchange.name, exchange);
            if (exchange.boundTo) this.boundExchange.set(exchange.name, exchange);
        });

        this.queueMap = new Map();
        queues.forEach(queue => this.queueMap.set(queue.name, queue));

        this.tag = tag;
    }

    _initRabbit() {
        var _this = this;

        return _asyncToGenerator(function* () {
            try {
                yield _this._initConnect();
                _this._publishChannel = yield _this.connection.createChannel();
                _this._initExchange();

                var _config$rabbit = _config2.default.rabbit;
                let host = _config$rabbit.host;
                let vhost = _config$rabbit.vhost;
                let port = _config$rabbit.port;

                console.log('Rabbit: %s:%s/%s.\nBus: ready.', host, port, vhost);
                _this.hasInitialized = true;
                _this.emit('ready');
            } catch (err) {
                _this.emit('error', err);
            }
        })();
    }

    _initConnect() {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            var _config$rabbit2 = _config2.default.rabbit;
            let host = _config$rabbit2.host;
            let port = _config$rabbit2.port;
            let vhost = _config$rabbit2.vhost;
            let user = _config$rabbit2.user;
            let password = _config$rabbit2.password;

            let connectionUrl = `amqp://${ user }:${ password }@${ host }:${ port }/${ vhost }`;
            _this2.connection = yield _amqplib2.default.connect(connectionUrl, { heartbeat: 60 });
        })();
    }

    _initExchange() {
        this._publishChannel.assertExchange(EXCHANGE.name, EXCHANGE.type);

        for (let _ref of this.boundExchange) {
            var _ref2 = _slicedToArray(_ref, 2);

            let exchange = _ref2[1];
            let targetExchange = exchange.name;
            let type = exchange.type;
            var _exchange$boundTo = exchange.boundTo;
            let sourceExchange = _exchange$boundTo.exchange;
            let routingKey = _exchange$boundTo.routingKey;


            this._publishChannel.assertExchange(targetExchange, type, { internal: true });
            this._publishChannel.bindExchange(targetExchange, sourceExchange, routingKey);
        }
    }

    publish(event, message) {
        let priority = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : PRIORITY.DEFAULT;

        if (!this.hasInitialized) {
            return this.on('ready', this.publish.bind(this, event, message, priority));
        }

        let priorityNumber = PRIORITY[priority];
        let opts = Object.assign({}, { priority: priorityNumber });

        if (typeof message === 'object') message = JSON.stringify(message);

        this._publishChannel.publish(EXCHANGE.name, event, new Buffer(message), opts);
    }

    subscribe(events, handler) {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            try {
                if (_this3.hasInitialized === false) {
                    return _this3.on('ready', _this3.subscribe.bind(_this3, events, handler));
                }

                let channel = yield _this3.connection.createChannel();
                channel.assertExchange(EXCHANGE.name, EXCHANGE.type, EXCHANGE.options || {});

                var _ref3 = yield channel.assertQueue('', {
                    exclusive: true,
                    durable: false,
                    messageTtl: 3600 });

                let queue = _ref3.queue;


                debug('Waiting for messages in %s.', queue);
                if (typeof events === 'string') events = new Array(events);

                events.forEach(function (severity) {
                    channel.bindQueue(queue, EXCHANGE.name, severity);
                });

                let consumeOps = {
                    consumerTag: _this3.tag,
                    exclusive: true,
                    noAck: true };

                channel.consume(queue, (() => {
                    var _ref4 = _asyncToGenerator(function* (rawMessage) {
                        let routingKey = rawMessage.fields.routingKey;
                        let message = rawMessage.content.toString();
                        if (checkJSON(message)) message = JSON.parse(message);
                        yield handler(message, routingKey, channel);
                    });

                    return function (_x3) {
                        return _ref4.apply(this, arguments);
                    };
                })(), consumeOps);
            } catch (err) {
                _this3.emit('error', err);
            }
        })();
    }

    listen(event, queueName, handle) {
        var _this4 = this;

        let opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        return _asyncToGenerator(function* () {
            try {
                if (_this4.hasInitialized === false) {
                    return _this4.on('ready', _this4.listen.bind(_this4, event, queueName, handle, opts));
                }

                var _ref5 = yield _this4._initQueue(queueName);

                var _ref6 = _slicedToArray(_ref5, 3);

                let channel = _ref6[0];
                let queue = _ref6[1];
                let exchange = _ref6[2];

                channel.bindQueue(queue, exchange, event);

                channel.consume(queueName, function (rawMessage) {
                    let next = function next() {
                        return channel.ack(rawMessage);
                    };
                    let message = rawMessage.content.toString();
                    if (checkJSON(message)) message = JSON.parse(message);

                    handle(message, next);
                }, {
                    noAck: false,
                    consumerTag: opts.consumerTag || _this4.tag,
                    exclusive: false
                });
            } catch (err) {
                _this4.emit('error', err);
            }
        })();
    }

    _initQueue(name) {
        var _this5 = this;

        return _asyncToGenerator(function* () {
            if (_this5.queueMap.has(name) === false) {
                throw Rabbit.exception(`Queue ${ name } hasn't been defined.`);
            }

            var _queueMap$get = _this5.queueMap.get(name);

            var _queueMap$get$exchang = _queueMap$get.exchange;
            let exchangeName = _queueMap$get$exchang === undefined ? EXCHANGE.name : _queueMap$get$exchang;
            var _queueMap$get$options = _queueMap$get.options;
            let queueOptions = _queueMap$get$options === undefined ? {} : _queueMap$get$options;
            let hasPriority = _queueMap$get.hasPriority;
            let prefetch = _queueMap$get.prefetch;


            if (_this5.exchangeMap.has(exchangeName) === false) {
                throw Rabbit.exception(`Exchange ${ exchangeName } hasn't been defied.`);
            }

            let exchange = _this5.exchangeMap.get(exchangeName);
            let exchangeOptions = {};

            if (exchange.boundTo) exchangeOptions.internal = true;

            let channel = yield _this5.connection.createChannel();
            channel.assertExchange(exchange.name, exchange.type, exchangeOptions);
            channel.prefetch(prefetch);

            queueOptions = Object.assign(queueOptions, {
                exclusive: false,
                durable: true });

            if (hasPriority) queueOptions.maxPriority = PRIORITY.MAX;
            channel.assertQueue(name, queueOptions);

            return [channel, name, exchangeName];
        })();
    }

    static exception(message) {
        new Error(message);
    }
}

const checkJSON = function checkJSON(str) {
    return (/^[\],:{}\s]*$/.test(str.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))
    );
};

exports.default = Rabbit;