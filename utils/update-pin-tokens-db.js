/*
* Function to update PinToken DB from blockchain
*/

// Get required interfaces
const CryptoCartoContract = require('./cryptocarto-contract')
const caver = require('./caver')
const PinToken = require('./pintoken')
var DataField = require('./datafield')
getLastSyncedBlock = require('./get-lastsyncedblock')

module.exports = async function (forceResync = false) {
    try{
      var latestBlockNumber = await caver.klay.getBlockNumber();

      if (forceResync) {
        tokenIds = await CryptoCartoContract.methods.getAllPinTokenIds().call();
      } else {
        events = await CryptoCartoContract.getPastEvents('Transfer', {
          fromBlock: await getLastSyncedBlock(), // Get events since last watch
          toBlock: latestBlockNumber
        });

        tokenIds = [];
        // Updating owner for token
        events.forEach(async event => {
          tokenId = event.returnValues.tokenId;
          if (!tokenIds.includes(tokenId)) tokenIds.push(tokenId);
        });
  
      }

      // Exclude known Pins from lookup (pins already in DB)
      tokenIdsToLookup = tokenIds;
      currentPinIds = await PinToken.distinct("tokenId");
      tokenIdsToLookup = tokenIds.filter(x => !currentPinIds.includes(x));

      // Limit parallel queries to 200 first elements for scale if full resync
      if (forceResync) tokenIdsToLookup = tokenIdsToLookup.slice(0,200);

      // If new tokens, save them in DB
      if (tokenIdsToLookup.length > 0) {

          // Getting token data in parallel
          const tokenDataPromises = tokenIdsToLookup.map(async function(tokenId){
              return CryptoCartoContract.methods.getPinToken(tokenId).call()
          });

          // Waiting for blockchain return, then saves to DB
          await Promise.all(tokenDataPromises).then(async function(result) {
              try{
                  // Saves new tokens to DB
                  const tokenSavePromises = Object.keys(result).map(async function (objectKey) {
                  var newPinToken = new PinToken({
                      tokenId : result[objectKey][0],
                      creator : result[objectKey][1],
                      owner: result[objectKey][2],
                      latitude : result[objectKey][3],
                      longitude : result[objectKey][4],
                      message : result[objectKey][5],
                      creationTimestamp : result[objectKey][6],
                      modificationTimestamp : result[objectKey][7]
                  });
                  
                  // Saves if not existing
                  if (!await PinToken.countDocuments({ tokenId: newPinToken.tokenId })) {
                      await newPinToken.save();
                      console.log("PinToken #" + newPinToken.tokenId + " saved to DB.")
                  };
                  
                  })
                  // Wait for saves
                  await Promise.all(tokenSavePromises)
                  
                } catch (error) {
                  console.error(error);
                }
          })

        }

      // When saves are done, update last scanned block ID
      if (!forceResync) {
        await DataField.updateMany(
          { fieldName: "lastScannedBlock" },
          { $set: { value: latestBlockNumber } }
        );
      }
        
    } catch (error) {
        console.error(error);
    }
}