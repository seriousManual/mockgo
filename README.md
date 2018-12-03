# MOCKGO [![Build Status](https://travis-ci.org/seriousManual/mockgo.png)](https://travis-ci.org/seriousManual/mockgo)

[![NPM](https://nodei.co/npm/mockgo.png)](https://nodei.co/npm/mockgo/)

[![NPM](https://nodei.co/npm-dl/mockgo.png?months=12)](https://nodei.co/npm/mockgo/)

Mockgo is a in-memory mocking engine for mongodb.
In [contrast](https://www.npmjs.com/package/mongo-mock-server) [to](https://www.npmjs.com/package/mock-mongo-db) [existing](https://www.npmjs.com/package/mongo-mock) [solutions](https://www.npmjs.com/package/mongodb-mock) mockgo does not try to imitate the mongodb interface by implementing its methods.
Instead it uses the same approach [Mockgoose](https://www.npmjs.com/package/mockgoose) uses and spins up an actual mongodb instance which holds the data in memory.
That way the full feature set of mongodb can be used.

Works on all platforms which is due to the awesome [mongodb-prebuilt](https://www.npmjs.com/package/mongodb-prebuilt) package.

After spinning up the mongodb instance a connection to that instance is automatically created and returned.

## Installation
````
npm install mockgo
````

## Usage
Require mockgo, then retrieve a connection to the in-memory instance of mongodb by calling `getConnection`.
An optional database name can be specified.

````javascript
var mockgo = require('mockgo')

// Using promises
mockgo.getConnection().then(connection => {
  //`connection` is the connection to the mongodb instance
})

// Using callbacks
mockgo.getConnection((error, connection) => {
  //`connection` is the connection to the mongodb instance
})
````

You can retrieve connections to as many databases as you wish.
They are internally cached.

## Example
````javascript
var mockgo = require('mockgo')

// Using promises
return mockgo.getConnection().then(connection => {
  var collection = connection.collection('testDataCollection')
  return collection.find({}).toArray()
    .then(result => console.log(result)) //result: []
    .then(() => collection.insertOne({test: 'data'}))
    .then(() => collection.find({test: 'data'}).toArray())
    .then(result => console.log(result)) //result: [ { _id: 56f52afef6d8838417df1688, test: 'data' } ]
})
.then(() => mockgo.shutDown())
.then(() => console.log('shutdown complete'))

// Using callbacks
mockgo.getConnection('testDatabase', (error, connection) => {
    var collection = connection.collection('testDataCollection')

    collection.find({}).toArray((error, result) => {
        console.log(result); //result: []

        collection.insertOne({test: 'data'}, (error, result) => {
            collection.find({test: 'data'}).toArray((error, result) => {
                console.log(result); //result: [ { _id: 56f52afef6d8838417df1688, test: 'data' } ]

                mockgo.shutDown(() => console.log('shutdown complete'))
            })
        })
    })
})
````

## Methods and Properties

### mockgo.getConnection([databaseName])
Returns a promise resolved with a connection to a in-memory instance on mongodb.
If no `databaseName` is specified a dummy name will be used.
If a connection to the same database is requested multiple times a cached version of the same connection instance is returned.

The connection instance is a instance from the official native [mongodb](https://www.npmjs.com/package/mongodb) driver.

If you wish to use another version of the mongodb package you can easily override it by setting the `mongodb` property *before* requiring a connection:

````javascript
var mockgo = require('mockgo')
var mockgo.mongodb = require('mongodb') //version xyz

mockgo.getConnection().then(connection => {
  //`connection` is the connection to the mongodb instance
})
````

### mockgo.getConnection([databaseName], callback)
Same as the promise-based method.
Invokes the callback with the connection to the database.

````javascript
var mockgo = require('mockgo')
var mockgo.mongodb = require('mongodb') //version xyz

mockgo.getConnection((error, connection) => {
    //`connection` is the connection to the mongodb instance
})
````

### mockgo.shutDown()
Closes all existing mongodb connections and shuts down the mongodb instance.
Returns a promise resolved once the cleanup has finished.

### mockgo.shutDown(callback)
Same as the promise-based method.
Invokes the callback once the cleanup has finished

### mockgo.mongodb
Exposes the version of the official native mongodb driver, gives the possibility to override it.

## Testing with Mocha

This is an example for a simple test with `mockgo` in mocha.

````javascript
var expect = require('chai').expect
var mockgo = require('mockgo')

var Loader = require('../lib/Loader')

describe('loaderTest', () => {
    var result, error

    before(done => {
        mockgo.getConnection((error, connection) => {
            expect(error).to.be.null
            loader = new Loader(connection)

            loader.loadSomething((_error, _result) => {
                error = _error
                result = _result
                done()
            })
        })
    })
    after(done => mockgo.shutdown(done))

    it('should not return a error', () => expect(error).to.be.null)
    it('should load something', () => expect(result).to.deep.equal({awesome: 'data'})
})

````


# License
The MIT License (MIT)

Copyright (c) 2016 Manuel Ernst

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
