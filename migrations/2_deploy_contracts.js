const CryptoCarto = artifacts.require('./CryptoCartoPinTokenContract.sol')
const fs = require('fs')

module.exports = function (deployer) {
  deployer.deploy(CryptoCarto)
    .then(() => {
    // Record recently deployed contract address to 'deployedAddress' file.
    if (CryptoCarto._json) {
      // Save abi file to deployedABI.
      fs.writeFile(
        'deployedABI',
        JSON.stringify(CryptoCarto._json.abi, 2),
        (err) => {
          if (err) throw err
          console.log(`The abi of ${CryptoCarto._json.contractName} is recorded on deployedABI file`)
        })
    }

    fs.writeFile(
      'deployedAddress',
      CryptoCarto.address,
      (err) => {
        if (err) throw err
        console.log(`The deployed contract address * ${CryptoCarto.address} * is recorded on deployedAddress file`)
    })
  })
}
