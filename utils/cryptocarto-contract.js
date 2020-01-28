/*
* Get an instance of CryptoCartoContract
*/

//Get a configured caver instance
const caver = require('./caver.js')

// Get the ABI and set up CryptoCarto contract
const fs = require('fs')
const deployedAbi = fs.readFileSync(__dirname + '/../deployedABI', 'utf8')
const smartContractAddress = process.env.SMART_CONTRACT_ADDRESS
const CryptoCartoContract = deployedAbi
  && smartContractAddress
  && new caver.klay.Contract(JSON.parse(deployedAbi), smartContractAddress)

module.exports = CryptoCartoContract;
