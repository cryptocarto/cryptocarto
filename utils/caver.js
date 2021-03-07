/*
* Get a caver instance
*/

//Setting up Klaytn data
const Caver = require('caver-js')
var caver;

// Special treatment when using KAS
if (process.env.CAVER_PROVIDER == "KAS") {
    const option = {
        headers: [
            {name: 'Authorization', value: 'Basic ' + Buffer.from(process.env.KAS_API_KEYID + ':' + process.env.KAS_API_ACCESSKEY).toString('base64')},
            {name: 'x-chain-id', value: process.env.KAS_API_CHAINID},
        ]
    }
    caver = new Caver(new Caver.providers.HttpProvider(process.env.KAS_API_ENDPOINT, option));
} else {
    caver = new Caver(process.env.CAVER_PROVIDER)
}

// Setting up fee delegation structure
caver.klay.accounts.wallet.add(process.env.FEE_PAYER_PRIVATE_KEY, process.env.FEE_PAYER_ADDRESS);

module.exports = caver;
