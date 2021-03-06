/*
* Get PinToken model object
*/

// Connect to mongo and declare PinToken schema
const db = require('./db')

var pinTokenSchema = new db.Schema({
  tokenId : String,
  creator: String,
  owner: String,
  latitude : Number,
  longitude : Number,
  message : String,
  creationTimestamp : String,
  modificationTimestamp : String
});

var PinToken = db.model(process.env.PINTOKEN_COLLECTION_NAME, pinTokenSchema);

module.exports = PinToken;
