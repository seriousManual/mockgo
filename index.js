var util = require('util')
var path = require('path')

var async = require('async')
var portfinder = require('portfinder')
var mongodbPrebuilt = require('mongodb-prebuilt');
var mongodb = require('mongodb')
var debug = require('debug')('mockgo')

var connectionCache = {}
var maxRetries = 5
var serverConfig = null
var serverEmitter = null

const startServer = (callback, retries) => {
    retries = retries || 0

    portfinder.getPort((error, port) => {
        if (error) return callback(error)

        var config = {
            host: '127.0.0.1',
            port: port
        }

        debug('startServer on port %d', port)
        serverEmitter = mongodbPrebuilt.start_server({
            args: {
                storageEngine: 'ephemeralForTest',
                bind_ip: config.host,
                port: config.port,
                dbpath: path.join(__dirname, './.data')
            },
            auto_shutdown: true
        }, error => {
            if (error === 'EADDRINUSE' && retries < maxRetries) {
                return setTimeout(() => startServer(callback, retries++), 200)
            }

            callback(error, config)
        })
    })
}

const createConnection = (config, callback) => {
    var uri = util.format('mongodb://%s:%d/%s',
        config.host,
        config.port,
        config.database
    )

    //we add the possibilty to override the version of the mongodb driver
    //by exposing it via module.exports
    module.exports.mongodb.connect(uri, callback)
}

const createServerSpecificConfiguration = (serverConfig, dbName, callback) => {
    debug('creating connection for db "%s"', dbName)

    var configCopy = Object.assign({}, serverConfig)
    configCopy.database = dbName
    createConnection(configCopy, (error, connection) => {
        if (error) callback(error)

        connectionCache[dbName] = connection
        callback(null, connection)
    })
}

const getConnection = (dbName, callback) => {
    if (typeof dbName === 'function') {
        callback = dbName
        dbName = 'testDatabase'
    }

    var connection = connectionCache[dbName]
    if (connection) {
        debug('retrieve connection from connection cache for db "%s"', dbName)
        return process.nextTick(() => callback(null, connection))
    }

    if (serverConfig) {
        return createServerSpecificConfiguration(serverConfig, dbName, callback)
    }

    startServer((error, resultConfiguration) => {
        if (error) return callback(error)

        serverConfig = resultConfiguration
        createServerSpecificConfiguration(serverConfig, dbName, callback)
    })
}

const shutDown = callback => {
    if (typeof callback !== 'function') {
        callback = () => {}
    }

    if (serverEmitter) {
        debug('emit shutdown event')
        serverEmitter.emit('mongoShutdown')
    }

    serverEmitter = null
    serverConfig = null

    var connections = Object.keys(connectionCache).map(key => connectionCache[key])
    if (connections.length > 0) {
        debug('closing %d mongo connections', connections.length)
        async.each(connections, (con, cb) => con.close(cb), error => {
            connectionCache = {}
            callback(error)
        })
    } else {
        process.nextTick(() => callback(null))
    }
}

module.exports = {
    getConnection,
    shutDown,
    mongodb: mongodb
}
