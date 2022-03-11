/*
* Transfers a pin token to a new user
*/

// Get required interfaces
const caver = require('../utils/caver')
const CryptoCartoContract = require('../utils/cryptocarto-contract')
const PinToken = require('../utils/pintoken')
updateConsumptionRights = require('../utils/update-consumption-rights')
updateConsumptionRightsFromBlockchain = require('../utils/update-consumption-rights-from-blockchain')

module.exports = async function(req, res, next) {
  try {

    const newAddress  = req.body.transferaddress;
    const tokenId     = req.body.tokenidtotransfer;

    // Generate TX to sign
    const txToSign = {
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '2000000',
      data: CryptoCartoContract.methods.transferFrom(req.session.address, newAddress, tokenId).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'),
    };

    // If Kaikas is in use, send tx to sign to browser, and stop process
    if (req.session.kaikasInUse && typeof req.body.signedtx == 'undefined') {
      res.send(txToSign); return;
    }

     // If Kaikas is off, or req.body.signedtx exists, proceed to token modification
     var senderRawTransaction;

     // If there is a signed tx in req, use instead of autosigning
     if (typeof req.body.signedtx == "undefined") {
        // sign transaction
        signedTransaction = await caver.klay.accounts.signTransaction(txToSign, req.session.privatekey);
        senderRawTransaction = signedTransaction.rawTransaction;
     } else {
       senderRawTransaction = req.body.signedtx;
     }
    
    // Uses 1 consumption right
    await updateConsumptionRights(req, -1);

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
    .on('error', async function(error){
        console.log(error);
        await updateConsumptionRightsFromBlockchain(req.session.address);
    });

    req.session.generalMessage = 'Token #' + tokenId + ' was transferred to ' + newAddress;

    // Updating token owner
    console.log("Updating token ID #" + tokenId);
    await PinToken.updateMany({ tokenId: tokenId }, { $set: { owner: newAddress } })

    // Reload only if CC tx
    if (typeof req.body.signedtx == 'undefined') {
      res.redirect('/');
    } else {
      res.send('Done');
    }

  } catch (error) { next(error) }
};