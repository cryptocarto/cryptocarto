/*
* Send a new token transaction to blockchain and create temp data in DB - createNewToken(lat, lng, message, req)
* Returns a newPinToken object
*/

// Get required interfaces
const caver = require('./caver')
const CryptoCartoContract = require('./cryptocarto-contract')
const PinToken = require('./pintoken')
updateConsumptionRights = require('./update-consumption-rights')
updateConsumptionRightsFromBlockchain = require('./update-consumption-rights-from-blockchain')

module.exports = async function(latitude, longitude, message, req) {
  try {
    var senderRawTransaction;

    // If there is a signed tx in req, use instead of autosigning
    if (typeof req.body.signedtx == "undefined") {
      // sign transaction
      signedTransaction = await caver.klay.accounts.signTransaction({
        type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
        from: req.session.address,
        to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
        gas: '50000000',
        data: CryptoCartoContract.methods.mintPinToken(message, latitude, longitude).encodeABI(),
        value: caver.utils.toPeb('0', 'KLAY'), //0.00001
      }, req.session.privatekey);
      senderRawTransaction = signedTransaction.rawTransaction;
    } else {
      senderRawTransaction = req.body.signedtx;
    }

    // Get new token ID by computing latitude and longitude for id format
    idFormattedLatitude = latitude;
    if (latitude < 0) { idFormattedLatitude = (0 - latitude) + 1000000; }
    idFormattedLongitude = longitude;
    if (longitude < 0) { idFormattedLongitude = (0 - longitude) + 10000000; }
    newTokenId = (idFormattedLatitude * 100000000) + idFormattedLongitude;
    
    // Create token in DB (before blockchain confirm, will be erased if needed)
    var currentTimestamp = Math.round(Date.now() / 1000);
    var newPinToken = new PinToken({
        tokenId : newTokenId,
        creator: req.session.address,
        owner: req.session.address,
        latitude : latitude,
        longitude : longitude,
        message : message,
        creationTimestamp : currentTimestamp,
        modificationTimestamp : currentTimestamp,
    });
    
    // Saves if not existing
    if (!await PinToken.countDocuments({ tokenId: newPinToken.tokenId })) {
      // Decreases consumption rights
      await updateConsumptionRights(req, -1);
      await newPinToken.save();
      console.log("PinToken #" + newPinToken.tokenId + " saved to DB (temporary timestamp: " + newPinToken.creationTimestamp + ").")
    } else {
      throw new Error("Token #" + newPinToken.tokenId + " already exists.")
    };
    
    // Send transaction through fee delegation (async)
    caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: process.env.FEE_PAYER_ADDRESS,
    })
    .on('transactionHash', function(hash){
        console.log('Transaction Hash received: Tx hash is ', hash);
    })
    .on('receipt', async function(receipt){
        console.log('Receipt received: Sender Tx hash is '+ receipt.senderTxHash);

        // Replace current temp token in DB by blockchain values (only timestamp should change)
        CryptoCartoContract.methods.getPinToken(newPinToken.tokenId).call().then(async function(tokenDataFromBC) {
            var newPinTokenFromBC = new PinToken({
              tokenId : tokenDataFromBC[0],
              creator: tokenDataFromBC[1],
              owner: tokenDataFromBC[2],
              latitude : tokenDataFromBC[3],
              longitude : tokenDataFromBC[4],
              message : tokenDataFromBC[5],
              creationTimestamp : tokenDataFromBC[6],
              modificationTimestamp : tokenDataFromBC[7],
          });
          await PinToken.deleteMany({ tokenId: newPinToken.tokenId });
          await newPinTokenFromBC.save();
          console.log("PinToken #" + newPinToken.tokenId + " swapped with blockchain values in DB (new timestamp: " + newPinTokenFromBC.creationTimestamp + ").")
        });
    })
    .on('error', async function(error){
      // On error, delete the pin in DB and log
      await PinToken.deleteMany({ tokenId: newPinToken.tokenId });
      // Restores consumption rights
      await updateConsumptionRightsFromBlockchain(req.session.address);
      console.error("Error on creation transaction for token #" + newPinToken.tokenId + ": temp token in DB deleted.");
    });

    return newPinToken;
  } catch (error) {
    console.log(error);
  }
}
