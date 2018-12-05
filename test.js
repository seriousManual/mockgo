const async = require('async')
const expect = require('chai').expect

const mockgo = require('./')

const mongodbmock = {
    _uri: '',
    connect: uri => {
        return Promise.resolve({
            db: dbName => ({ a: 'mockConnection', uri: uri + '/' + dbName }),
            close: () => Promise.resolve()
        })
    }
}

describe('mockgo', function() {
    this.timeout(0)

    describe('promise-based interface', () => {

        describe('default dbName connection', () => {
            let connection

            before(() => mockgo.getConnection().then(_connection => {
                connection = _connection
            }))
            after(() => mockgo.shutDown())

            it('should open a connection with the default database name', () => expect(connection.databaseName).to.equal('testDatabase'))
        })

        describe('named connection', () => {
            let connection

            before(() => mockgo.getConnection('namedConnection').then(_connection => {
                connection = _connection
            }))
            after(() => mockgo.shutDown())

            it('should open a connection with a given name', () => expect(connection.databaseName).to.equal('namedConnection'))
        })

        describe('exposed connection', () => {
            let firstResult, secondResult

            before(() => mockgo.getConnection().then(connection => {
                let collection = connection.collection('testDataCollection')
                return collection.find({}).toArray()
                    .then(result => { firstResult = result })
                    .then(() => collection.insertOne({test: 'data'}))
                    .then(() => collection.find({test: 'data'}).toArray())
                    .then(result => { secondResult = result[0] })
            }))
            after(() => mockgo.shutDown())

            it('should not find anything when its empty', () => expect(firstResult).to.be.deep.equal([]))
            it('should find inserted data', () => expect(secondResult.test).to.be.deep.equal('data'))
        })

        describe('seperate databases', () => {
            after(() => mockgo.shutDown())

            it('should write into seperate databases', () => {
                let collection1, collection2

                return Promise.all([
                    mockgo.getConnection('db1'),
                    mockgo.getConnection('db2')
                ]).then(connections => {
                    collection1 = connections[0].collection('c')
                    collection2 = connections[1].collection('c')
                    return collection1.insertOne({test: 'data'})
                }).then(() => Promise.all([
                    collection1.find({}).toArray(),
                    collection2.find({}).toArray()
                ])).then(results => {
                    expect(results[0][0].test).to.equal('data')
                    expect(results[1]).to.deep.equal([])
                })
            })
        })

        describe('combined databases', () => {
            after(() => mockgo.shutDown())

            it('should write into the same database databases', () => {
                let collection1, collection2

                return Promise.all([
                    mockgo.getConnection('db'),
                    mockgo.getConnection('db')
                ]).then(connections => {
                    collection1 = connections[0].collection('c')
                    collection2 = connections[1].collection('c')
                    return collection1.insertOne({test: 'data'})
                }).then(() => Promise.all([
                    collection1.find({}).toArray(),
                    collection2.find({}).toArray()
                ])).then(results => {
                    expect(results[0][0].test).to.equal('data')
                    expect(results[1][0].test).to.equal('data')
                })
            })
        })

        describe('overwriting mongodb', () => {
            let connection, prevMongodb

            before(() => {
                prevMongodb = mockgo.mongodb
                mockgo.mongodb = mongodbmock

                return mockgo.getConnection('myLovelyNamedConnection').then(_connection => {
                  connection = _connection
                })
            })
            after(() => {
                mockgo.mongodb = prevMongodb
                return mockgo.shutDown()
            })

            it('should have used the mock', () => expect(connection.uri).to.match(/mongodb:\/\/127.0.0.1:\d+\/myLovelyNamedConnection/))
        })

    })

    describe('callback-based interface', () => {

        describe('default dbName connection', () => {
            let connection

            before(done => {
                mockgo.getConnection((error, _connection) => {
                    expect(error).to.be.null
                    connection = _connection
                    done()
                })
            })
            after(done => {
                mockgo.shutDown(done)
            })

            it('should open a connection with the default database name', () => expect(connection.databaseName).to.equal('testDatabase'))
        })

        describe('named connection', () => {
            let connection

            before(done => {
                mockgo.getConnection('namedConnection', (error, _connection) => {
                    expect(error).to.be.null
                    connection = _connection
                    done()
                })
            })
            after(done => {
                mockgo.shutDown(done)
            })

            it('should open a connection with a given name', () => expect(connection.databaseName).to.equal('namedConnection'))
        })

        describe('exposed connection', () => {
            let firstResult, secondResult

            before(done => {
                mockgo.getConnection((error, connection) => {
                    let collection = connection.collection('testDataCollection')

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
            after(done => {
                mockgo.shutDown(done)
            })

            it('should not find anything when its empty', () => expect(firstResult).to.be.deep.equal([]))
            it('should find inserted data', () => expect(secondResult.test).to.be.deep.equal('data'))
        })

        describe('seperate databases', () => {
            after(done => {
                mockgo.shutDown(done)
            })

            it('should write into seperate databases', done => {
                async.series([
                    cb => mockgo.getConnection('db1', cb),
                    cb => mockgo.getConnection('db2', cb)
                ], (error, connections) => {
                    expect(error).to.be.null
                    let c0 = connections[0].collection('c')
                    let c1 = connections[1].collection('c')

                    async.series([
                        cb => c0.insertOne({test: 'data'}, cb),
                        cb => c0.find({}).toArray(cb),
                        cb => c1.find({}).toArray(cb)
                    ], (error, results) => {
                        expect(error).to.be.null

                        expect(results[1][0].test).to.equal('data')
                        expect(results[2]).to.deep.equal([])
                        done()
                    })
                })
            })
        })

        describe('combined databases', () => {
            after(done => {
                mockgo.shutDown(done)
            })

            it('should write into the same database databases', done => {
                async.series([
                    cb => mockgo.getConnection('db', cb),
                    cb => mockgo.getConnection('db', cb)
                ], (error, connections) => {
                    expect(error).to.be.null
                    let c0 = connections[0].collection('c')
                    let c1 = connections[1].collection('c')

                    async.series([
                        cb => c0.insertOne({test: 'data'}, cb),
                        cb => c0.find({}).toArray(cb),
                        cb => c1.find({}).toArray(cb)
                    ], (error, results) => {
                        expect(error).to.be.null

                        expect(results[1][0].test).to.equal('data')
                        expect(results[2][0].test).to.equal('data')
                        done()
                    })
                })
            })
        })

        describe('overwriting mongodb', () => {
            let connection, prevMongodb

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

            it('should have used the mock', () => expect(connection.uri).to.match(/mongodb:\/\/127.0.0.1:\d+\/myLovelyNamedConnection/))
        })
    })
})
