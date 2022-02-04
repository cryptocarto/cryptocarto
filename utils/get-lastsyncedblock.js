/*
* Function to retrieve last synced block index - getUserLevel(address)
*/

// Get required interfaces
const DataField = require('./datafield')

module.exports = async function () {
  try {

    var lastScannedBlock = await DataField.findOne({'fieldName' : 'lastScannedBlock'});

    // Create last scanned block value if null
    if (lastScannedBlock === null) {
      await DataField.deleteMany({'fieldName' : 'lastScannedBlock'});

      var dataField = new DataField({
        fieldName : "lastScannedBlock",
        value :  process.env.LAST_SCAN_BLOCK || 82130326 // CryptoCarto V2 contract deploy block-1: 21621619
      });
      await dataField.save();

      lastScannedBlock = dataField;
    }

    return lastScannedBlock.value;

  } catch (error) {
    console.error(error);
  }  
}