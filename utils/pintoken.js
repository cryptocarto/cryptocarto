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

var PinToken = db.model('PinToken', pinTokenSchema);

module.exports = PinToken;
