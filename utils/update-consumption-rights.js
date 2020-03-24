/*
* Function to manage consumption rights - updateConsumptionRights(number)
*/

// Get required interfaces
const ConsumptionRight = require('./consumptionright')

module.exports = async function (req, rightsToAdd) {
  try {
    const address = req.session.address.toLowerCase();
    var currentRights = await ConsumptionRight.findOne({ address: address });
    var currentTS = Math.round(Date.now() / 1000);
      
    if (!currentRights) {
      //If no DB record, create one with default values and proceed
      var newConsumptionRights = new ConsumptionRight({
        address: address,
        rights: 5 + rightsToAdd,
        lastRefillTimestamp: currentTS,
        lastChangeTimestamp: currentTS
      });
      await newConsumptionRights.save()
  
      req.session.consumptionrights = 5 + rightsToAdd;
      req.session.consumptionrightslastrefill = currentTS;
  
    } else {
        // If record in DB, check for a refill (every 22h in smart contract), then update and proceed
        if (currentRights.lastRefillTimestamp < (currentTS - 79200)) {
          await ConsumptionRight.updateMany({ address: address }, { $set: {
             rights: 5 + currentRights.rights + rightsToAdd, 
             lastRefillTimestamp: currentTS
          }})
          req.session.consumptionrights = 5 + currentRights.rights + rightsToAdd;
          req.session.consumptionrightslastrefill = currentTS;
        } else {
          await ConsumptionRight.updateMany({ address: address }, { $set: {
             rights: currentRights.rights + rightsToAdd
          }})
          req.session.consumptionrights = currentRights.rights + rightsToAdd;
        }
    }
  } catch (error) {
    console.error(error);
  }  
}