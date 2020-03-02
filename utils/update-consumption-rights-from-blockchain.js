/*
* Function to reload consumption rights from blockchain - updateConsumptionRightsFromBlockchain(address)
*/

// Get required interfaces
const ConsumptionRight = require('./consumptionright')
const CryptoCartoContract = require('./cryptocarto-contract')

module.exports = async function(address) {
  try {
    CryptoCartoContract.methods.getConsumptionRightsForAddress(address).call().then(async function (results) {
      await ConsumptionRight.updateMany({ address: address.toLowerCase() }, { $set: {
          rights: results[0],
          lastRefillTimestamp: results[1]
        }});
        console.log("Consumption rights reloaded from blockchain for " + address + "(" + results[0] + "/" + results[1] + ")");
    });
  } catch (error) {
    console.log("Failed to reload consumption right from blockchain for " + address);
  }
}
