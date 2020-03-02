/*
* Create a new transaction
*/

// Get required interfaces
const caver = require('../utils/caver')
const CryptoCartoContract = require('../utils/cryptocarto-contract')
const PinToken = require('../utils/pintoken')
updateConsumptionRights = require('../utils/update-consumption-rights')
updateConsumptionRightsFromBlockchain = require('../utils/update-consumption-rights-from-blockchain')

module.exports = async function(req, res, next) {
  try {

    const message    = req.body.message;
    const latitude   = Math.floor(parseFloat(req.body.latitude) * 10000);
    const longitude  = Math.floor(parseFloat(req.body.longitude) * 10000);

    // Check latitude and logitude are inbounds
    latitudeReq = latitude != 0 && (latitude >= -899999) && (latitude <= 900000);
    longitudeReq = longitude != 0 && (longitude >= -1799999) && (longitude <= 1800000);

    if (!latitudeReq || !longitudeReq) {
      req.session.generalMessage = 'Lat/lon out of bounds';
      res.redirect('/new-transaction');
      return;
    }

    req.session.currentlat = parseFloat(req.body.latitude);
    req.session.currentlng = parseFloat(req.body.longitude);

    // sign transaction
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.mintPinToken(message, latitude, longitude).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'), //0.00001
    }, req.session.privatekey);

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

    req.session.generalMessage = 'Token #' + newPinToken.tokenId + ' created.';
    req.session.openPinId = newPinToken.tokenId;

    res.redirect('/');

  } catch (error) { next(error) }
};