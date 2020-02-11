/*
* Get DisplayName model object
*/

// Connect to mongo and declare PinToken schema
const db = require('./db')

var displayNameSchema = new db.Schema({
  address : String,
  name: String
});

var DisplayName = db.model('DisplayName', displayNameSchema);

module.exports = DisplayName;
