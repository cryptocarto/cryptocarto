/*
* Get ConsumptionRight model object
*/

// Connect to mongo and declare PinToken schema
const db = require('./db')

var consumptionRightsSchema = new db.Schema({
  address : String,
  rights: Number,
  lastRefillTimestamp: String,
  lastChangeTimestamp: String
});

var ConsumptionRight = db.model('ConsumptionRight', consumptionRightsSchema);

module.exports = ConsumptionRight;
