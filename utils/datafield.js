/*
* Get DataField model object
*/

// Connect to mongo and declare DataField schema
const db = require('./db')

var dataFieldSchema = new db.Schema({
  fieldName: String,
  value: Number
});

var DataField = db.model('DataField', dataFieldSchema);

module.exports = DataField;
