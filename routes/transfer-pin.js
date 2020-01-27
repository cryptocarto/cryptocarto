/*
* Transfers a pin token to a new user
*/

// Get required interfaces
const caver = require('../utils/caver')
const CryptoCartoContract = require('../utils/cryptocarto-contract')
const PinToken = require('../utils/pintoken')

module.exports = async function(req, res, next) {
  try {

    const newAddress  = req.body.transferaddress;
    const tokenId     = req.body.tokenidtotransfer;

    // sign transaction
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.transferFrom(req.session.address, newAddress, tokenId).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'),
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

    req.session.generalMessage = 'Token #' + tokenId + ' was transferred to ' + newAddress;

    // Updating token owner
    console.log("Updating token ID #" + tokenId);
    await PinToken.updateMany({ tokenId: tokenId }, { $set: { owner: newAddress } })

    res.redirect('/');

  } catch (error) { next(error) }
};