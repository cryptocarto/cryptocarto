/*
* Modify a pin token message
*/

// Get required interfaces
const caver = require('../utils/caver')
const CryptoCartoContract = require('../utils/cryptocarto-contract')
const PinToken = require('../utils/pintoken')
updateConsumptionRights = require('../utils/update-consumption-rights')
updateConsumptionRightsFromBlockchain = require('../utils/update-consumption-rights-from-blockchain')

module.exports = async function(req, res, next) {
  try {

    const newMessage  = req.body.modifiedmessage;
    const tokenId     = req.body.tokenidtomodify;

    if (newMessage.length >= 200) {
      req.session.generalMessage = 'Message must be less than 200 characters';
      res.redirect('/');
      return;
    }

    // sign transaction
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.updatePinToken(tokenId, newMessage).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'),
    }, req.session.privatekey);

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

    req.session.generalMessage = 'Message of Token #' + tokenId + ' changed to ' + newMessage;

    // Updating token owner
    console.log("Updating token ID #" + tokenId);
    await PinToken.updateMany({ tokenId: tokenId }, { $set: { message: newMessage, modificationTimestamp: Math.round(Date.now() / 1000) } })

    res.redirect('/');

  } catch (error) { next(error) }
};