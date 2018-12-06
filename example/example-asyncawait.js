const mockgo = require('../index')

;(async function run() {
  const connection = await mockgo.getConnection()
  const collection = connection.collection('testDataCollection')

  const result = await collection.find({}).toArray()
  console.log(result) //result: []

  await collection.insertOne({test: 'data'})

  const result2 = await collection.find({test: 'data'}).toArray()
  console.log(result2) //result: []

  await mockgo.shutDown()
  console.log('shutdown complete')
})()