/*
* Create a new transaction
*/

// Get required interfaces
const caver = require('../utils/caver')
const CryptoCartoContract = require('../utils/cryptocarto-contract')
const PinToken = require('../utils/pintoken')

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
    
    // Send transaction through fee delegation
    await caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: process.env.FEE_PAYER_ADDRESS,
    })
    .on('transactionHash', function(hash){
        console.log('transactionHash', hash);
    })
    .on('receipt', function(receipt){
        console.log('receipt', receipt);
        console.log('Tx hash is '+ receipt.transactionHash);
        console.log('Sender Tx hash is '+ receipt.senderTxHash);
    })
    .on('error', console.error);

    req.session.generalMessage = 'Transaction was created on blockchain.';

    // Updates the PinTokens DB
    updatePinTokensDB = require('../utils/update-pin-tokens-db')
    await updatePinTokensDB();

    res.redirect('/');

  } catch (error) { next(error) }
};