/*
* Get a caver instance
*/

//Setting up Klaytn data
const Caver = require('caver-js')
const caver = new Caver(process.env.CAVER_PROVIDER)

// Setting up fee delegation structure
caver.klay.accounts.wallet.add(process.env.FEE_PAYER_PRIVATE_KEY, process.env.FEE_PAYER_ADDRESS);

module.exports = caver;
