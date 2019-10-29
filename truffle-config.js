const HDWalletProvider  = require("truffle-hdwallet-provider-klaytn")
const NETWORK_ID        = '1001'
const URL               = 'https://api.baobab.klaytn.net:8651'
const GASLIMIT          = '8500000'

// Change to appropriate private key
const PRIVATE_KEY       = '0x0000000000000000000000000000000000000000000000000000000000000000'

module.exports = {
  networks: {
    baobab: {
      provider: () => new HDWalletProvider(PRIVATE_KEY, URL),
      network_id: NETWORK_ID,
      gas: GASLIMIT,
      gasPrice: null,
    },
  },
  compilers: {
    solc: {
      version: '0.5.6',
    },
  },
}
