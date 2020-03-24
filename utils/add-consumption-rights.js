/*
* Add consumption rights on blockchain to a given user - addConsumptionRights(address, nbRights)
*/

// Get required interfaces
const caver = require('./caver')
const CryptoCartoContract = require('./cryptocarto-contract')

module.exports = async function(address, nbRights) {
  try {

    // Admin data
    var publicKey =  process.env.ADMIN_ADDRESS
    var privateKey = process.env.ADMIN_PRIVATE_KEY

    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: publicKey,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.addConsumptionRightsForAddress(address, nbRights).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'),
    }, privateKey);
    
    // Send transaction through fee delegation
    caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: process.env.FEE_PAYER_ADDRESS,
    })
    .on('transactionHash', function(hash){
      console.log('Transaction Hash received: Tx hash is ', hash);
    })
    .on('receipt', function(receipt){
      console.log('Receipt received: Sender Tx hash is '+ receipt.senderTxHash);
    })
    .on('error', console.error);

  } catch (error) {
    console.log(error);
  }
}
