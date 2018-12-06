const mockgo = require('../index')

return mockgo.getConnection().then(connection => {
  const collection = connection.collection('testDataCollection')
  return collection.find({}).toArray()
    .then(result => console.log(result)) //result: []
    .then(() => collection.insertOne({test: 'data'}))
    .then(() => collection.find({test: 'data'}).toArray())
    .then(result => console.log(result)) //result: [ { _id: 56f52afef6d8838417df1688, test: 'data' } ]
})
.then(() => mockgo.shutDown())
.then(() => console.log('shutdown complete'))