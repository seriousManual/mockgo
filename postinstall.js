const { MongoDBPrebuilt } = require('mongodb-prebuilt');

new MongoDBPrebuilt().getBinPath()
  .then(() => process.exit(0))
  .catch(err => console.error(err));