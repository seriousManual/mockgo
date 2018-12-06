const mockgo = require('../index')

mockgo.getConnection((error, connection) => {
    const collection = connection.collection('testDataCollection')

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