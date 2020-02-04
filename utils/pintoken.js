/*
* Get PinToken model object
*/

// Connect to mongo and declare PinToken schema
const db = require('./db')

var pinTokenSchema = new db.Schema({
  tokenId : String,
  owner: String,
  latitude : Number,
  longitude : Number,
  message : String,
  timestamp : String
});

var PinToken = db.model(process.env.PINTOKEN_COLLECTION_NAME, pinTokenSchema);

module.exports = PinToken;
