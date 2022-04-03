/*
* Create a new transaction
*/

// Get required interfaces
createNewToken = require('../utils/create-new-token')
const CryptoCartoContract = require('../utils/cryptocarto-contract')
const caver = require('../utils/caver')

module.exports = async function(req, res, next) {
  try {

    const message    = req.body.message;
    const latitude   = Math.round(parseFloat(req.body.latitude) * 10000);
    const longitude  = Math.round(parseFloat(req.body.longitude) * 10000);

    // Check latitude and logitude are inbounds
    latitudeReq = latitude != 0 && (latitude >= -899999) && (latitude <= 900000);
    longitudeReq = longitude != 0 && (longitude >= -1799999) && (longitude <= 1800000);

    if (!latitudeReq || !longitudeReq) {
      req.session.generalMessage = 'Lat/lon out of bounds';
      res.redirect('/');
      return;
    }

    if (message.length >= 200) {
      req.session.generalMessage = 'Message must be less than 200 chars';
      res.redirect('/');
      return;
    }

    req.session.currentlat = parseFloat(req.body.latitude);
    req.session.currentlng = parseFloat(req.body.longitude);

    // Generate TX to sign
    const txToSign = {
      type: 'SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '2000000',
      data: CryptoCartoContract.methods.mintPinToken(message, latitude, longitude).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'), //0.00001
    };

    // If Kaikas is in use, send tx to sign to browser, and stop process
    if (req.session.kaikasInUse && typeof req.body.signedtx == 'undefined') {
      res.send(txToSign); return;
    }

    // If Kaikas is off, or req.body.signedtx exists, proceed to token creation
    newPinToken = await createNewToken(latitude, longitude, message, req);

    req.session.generalMessage = 'Token #' + newPinToken.tokenId + ' created.';
    req.session.openPinId = newPinToken.tokenId;

    // Reload only if CC tx
    if (typeof req.body.signedtx == 'undefined') {
      res.redirect('/');
    } else {
      res.send('Done');
    }
  } catch (error) { next(error) }
};