const util = require('util')
const path = require('path')

const portfinder = require('portfinder')
const { MongodHelper } = require('mongodb-prebuilt');
const mongodb = require('mongodb')
const debug = require('debug')('mockgo')

let connectionCache = {}
let maxRetries = 5
let mongoClient = null
let mongodHelper = null

let initPromise = null

const startServer = retries => {
    retries = retries || 0

    return portfinder.getPortPromise().then(port => {
        const config = {
            host: '127.0.0.1',
            port: port
        }

        const mongodArgs = [
            '--port', config.port,
            '--bind_ip', config.host,
            '--storageEngine', 'ephemeralForTest',
            '--dbpath', path.join(__dirname, './.data')
        ]
        mongodHelper = new MongodHelper(mongodArgs)
        debug('startServer on port %d', config.port)
        return mongodHelper.run().then(() => {
            debug('mongod is running on port %d', config.port)
            return config
        })
    }).catch(error => {
        debug('error starting server "%s"', error)
        // mongodb-prebuilt no longer returns detailed information about what went wrong
        // Its no longer possible to know why it couldnt get started to decide whether retry or not
        if (retries < maxRetries) {
            return new Promise((resolve, reject) => {
                setTimeout(() => startServer(retries++).then(resolve).catch(reject), 200)
            })
        }
        throw error
    })
}

const createMongoClient = config => {
    const uri = util.format('mongodb://%s:%d', config.host, config.port)
    debug('creating MongoClient for "%s"', uri)

    //we add the possibilty to override the version of the mongodb driver
    //by exposing it via module.exports
    return module.exports.mongodb.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
        .then(client => { mongoClient = client })
}

const createDatabaseConnection = dbName => {
    debug('creating connection for db "%s"', dbName)

    connectionCache[dbName] = mongoClient.db(dbName)
    return connectionCache[dbName]
}

const getConnection = (dbName, callback) => {
    if (typeof dbName === 'function') {
        callback = dbName
        dbName = 'testDatabase'
    }
    if (!dbName){
      dbName = 'testDatabase'
    }

    if (initPromise === null){
        initPromise = startServer().then(createMongoClient)
    }

    return initPromise
        .then(() => createDatabaseConnection(dbName))
        .then(connection => {
            if (typeof callback === 'function'){
                callback(null, connection)
            } else {
                return connection
            }
        }).catch(err => {
            if (typeof callback === 'function'){
                callback(err)
            } else {
                throw err
            }
        })
}

const shutDown = callback => {
    let cleanup = Promise.resolve()

    if (initPromise !== null) {
        cleanup = initPromise.then(() => {
            debug('closing mongo client')
            return mongoClient.close(true)
        }).then(() => {
            mongoClient = null
            debug('sending mongod process')
            mongodHelper.kill()
        }).then(() => {
            // mongodb-prebuilt doesnt provide a mechanism itself to notify when shutdown really happened
            // grabbing the spawn process and waiting for the close event
            return new Promise((resolve, reject) => {
                mongodHelper.mongoBin.childProcess.on('close', code => resolve(code))
                mongodHelper = null
          })
        })
    }
    initPromise = null

    return cleanup.then(() => {
        debug('cleanup done')
        if (typeof callback === 'function'){
            callback(null)
        }
    }).catch(err => {
        if (typeof callback === 'function'){
          callback(err)
        } else {
          throw err
        }
    })
}

module.exports = {
    getConnection,
    shutDown,
    mongodb: mongodb
}
