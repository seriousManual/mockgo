var expect = require('chai').expect

var mockgo = require('./')

var mongodbmock = {
    _uri: '',
    connect: (uri, callback) => {
        callback(null, {
            _uri: uri,
            close: callback => process.nextTick(callback)
        })
    }
}

describe('mockgo', function() {
    this.timeout(5000)

    describe('dummy connection', () => {
        var connection

        before(done => {
            mockgo.getConnection((error, _connection) => {
                expect(error).to.be.null
                connection = _connection
                done()
            })
        })
        after(done => mockgo.shutDown(done))

        it('should open a connection with a dummy database name', () => expect(connection.s.databaseName).to.equal('testDatabase'))
    })

    describe('named connection', () => {
        var connection

        before(done => {
            mockgo.getConnection('namedConnection', (error, _connection) => {
                expect(error).to.be.null
                connection = _connection
                done()
            })
        })
        after(done => mockgo.shutDown(done))

        it('should open a connection with a given name', () => expect(connection.s.databaseName).to.equal('namedConnection'))
    })

    describe('exposed connection', () => {
        var firstResult, secondResult

        before(done => {
            mockgo.getConnection((error, connection) => {
                var collection = connection.collection('testDataCollection')

                collection.find({}).toArray((error, _result) => {
                    firstResult = _result

                    collection.insertOne({test: 'data'}, (error, result) => {
                        collection.find({test: 'data'}).toArray((error, _result) => {
                            secondResult = _result[0]
                            done()
                        })
                    })
                })
            })
        })
        after(done => mockgo.shutDown(done))

        it('should not load anything', () => expect(firstResult).to.be.deep.equal([]))
        it('should not load anything', () => expect(secondResult.test).to.be.deep.equal('data'))
    })

    describe('overwriting mongodb', () => {
        var connection, prevMongodb

        before(done => {
            prevMongodb = mockgo.mongodb
            mockgo.mongodb = mongodbmock

            mockgo.getConnection('myLovelyNamedConnection', (error, _connection) => {
                expect(error).to.be.null
                connection = _connection
                done()
            })
        })
        after(done => {
            mockgo.mongodb = prevMongodb
            mockgo.shutDown(done)
        })

        it('should have used the mock', () => expect(connection._uri).to.match(/mongodb:\/\/127.0.0.1:\d+\/myLovelyNamedConnection/))
    })
})
